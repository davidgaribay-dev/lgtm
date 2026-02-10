import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, inArray, max } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { section, project, member } from "@/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, projectId, suiteId, parentId } = body;

  if (!name?.trim() || !projectId) {
    return NextResponse.json(
      { error: "Name and project ID are required" },
      { status: 400 },
    );
  }

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

  // Get next display order
  const maxOrder = await db
    .select({ value: max(section.displayOrder) })
    .from(section)
    .where(eq(section.projectId, projectId))
    .then((rows) => rows[0]?.value ?? -1);

  const [created] = await db
    .insert(section)
    .values({
      name: name.trim(),
      projectId,
      suiteId: suiteId || null,
      parentId: parentId || null,
      displayOrder: (maxOrder ?? -1) + 1,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
