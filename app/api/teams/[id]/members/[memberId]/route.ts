import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, projectMember } from "@/db/schema";
import { canManageTeamMembers } from "@/lib/queries/team-permissions";
import { getTeamMemberCountByRole } from "@/lib/queries/team-members";

const VALID_TEAM_ROLES = ["team_owner", "team_admin", "team_member", "team_viewer"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const body = await request.json();
  const { role } = body;

  if (!role || !VALID_TEAM_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Verify team
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

  // Get current member info
  const currentMember = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(and(eq(projectMember.id, memberId), eq(projectMember.projectId, id)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!currentMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // If changing from team_owner, ensure at least one owner remains
  if (currentMember.role === "team_owner" && role !== "team_owner") {
    const ownerCount = await getTeamMemberCountByRole(id, "team_owner");

    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot change the role of the last team owner" },
        { status: 400 },
      );
    }
  }

  // Update role
  const [updated] = await db
    .update(projectMember)
    .set({
      role,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(and(eq(projectMember.id, memberId), eq(projectMember.projectId, id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;

  // Verify team
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

  // Get member to remove
  const memberToRemove = await db
    .select({
      userId: projectMember.userId,
      role: projectMember.role,
    })
    .from(projectMember)
    .where(and(eq(projectMember.id, memberId), eq(projectMember.projectId, id), isNull(projectMember.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!memberToRemove) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent removing last team_owner
  if (memberToRemove.role === "team_owner") {
    const ownerCount = await getTeamMemberCountByRole(id, "team_owner");

    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last team owner" },
        { status: 400 },
      );
    }
  }

  // Prevent self-removal if last admin
  const isSelf = memberToRemove.userId === session.user.id;

  if (isSelf) {
    const adminCount = await db
      .select({ id: projectMember.id })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, id),
          inArray(projectMember.role, ['team_owner', 'team_admin']),
          isNull(projectMember.deletedAt),
        ),
      );

    if (adminCount.length <= 1) {
      return NextResponse.json(
        { error: "Cannot remove yourself as the last admin" },
        { status: 400 },
      );
    }
  }

  // Soft delete
  await db
    .update(projectMember)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(and(eq(projectMember.id, memberId), eq(projectMember.projectId, id)));

  return NextResponse.json({ success: true });
}
