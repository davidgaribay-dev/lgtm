import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, projectMember, user, member } from "@/db/schema";
import {
  getTeamPermission,
  canManageTeamMembers,
} from "@/lib/queries/team-permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify team exists and get org ID
  const team = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check permission (must be team member or org admin)
  const permission = await getTeamPermission(
    session.user.id,
    id,
    team.organizationId,
  );

  if (permission === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch explicit team members with user details
  const members = await db
    .select({
      memberId: projectMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: projectMember.role,
      joinedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(projectMember.userId, user.id))
    .where(
      and(eq(projectMember.projectId, id), isNull(projectMember.deletedAt)),
    )
    .orderBy(desc(projectMember.createdAt));

  // Optionally include org admins/owners who have implicit team access
  const includeImplicit = request.nextUrl.searchParams.get("includeImplicit") === "true";
  if (includeImplicit) {
    const explicitUserIds = new Set(members.map((m) => m.userId));

    const orgAdmins = await db
      .select({
        memberId: member.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: member.role,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, team.organizationId),
          sql`${member.role} IN ('admin', 'owner')`,
        ),
      );

    for (const admin of orgAdmins) {
      if (!explicitUserIds.has(admin.userId)) {
        members.push(admin);
      }
    }
  }

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId, role } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 },
    );
  }

  // Verify team and get org
  const team = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check permission
  const canManage = await canManageTeamMembers(
    session.user.id,
    id,
    team.organizationId,
  );

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify user is org member
  const isOrgMember = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, team.organizationId),
        eq(member.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows.length > 0);

  if (!isOrgMember) {
    return NextResponse.json(
      { error: "User must be an organization member first" },
      { status: 400 },
    );
  }

  // Check if already a team member
  const existing = await db
    .select({ id: projectMember.id })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, id),
        eq(projectMember.userId, userId),
        isNull(projectMember.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "User is already a team member" },
      { status: 409 },
    );
  }

  // Add member
  const [created] = await db
    .insert(projectMember)
    .values({
      projectId: id,
      userId,
      role: role || "team_member",
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  // Fetch the complete member info with user details
  const newMember = await db
    .select({
      memberId: projectMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: projectMember.role,
      joinedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(projectMember.userId, user.id))
    .where(eq(projectMember.id, created.id))
    .limit(1)
    .then((rows) => rows[0]);

  return NextResponse.json(newMember, { status: 201 });
}
