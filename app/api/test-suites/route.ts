import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { testSuite, project, member } from "@/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, projectId } = body;

  if (!name?.trim() || !projectId) {
    return NextResponse.json(
      { error: "Name and project ID are required" },
      { status: 400 },
    );
  }

  // Get org from project, verify membership
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, proj.organizationId),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin", "member"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [created] = await db
    .insert(testSuite)
    .values({
      name: name.trim(),
      projectId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
