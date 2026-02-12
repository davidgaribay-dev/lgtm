import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project } from "@/db/schema";
import { canManageTeamSettings } from "@/lib/queries/team-permissions";

export async function PATCH(
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
  const { name, description, key } = body;

  // Fetch team with org
  const team = await db
    .select({
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      organizationId: project.organizationId,
    })
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check permission
  const canManage = await canManageTeamSettings(
    session.user.id,
    id,
    team.organizationId,
  );

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent key modification (keys are immutable)
  if (key !== undefined && key !== team.key) {
    return NextResponse.json(
      { error: "Team keys cannot be changed after creation" },
      { status: 400 },
    );
  }

  // Build updates object
  const updates: Partial<typeof project.$inferInsert> = {
    updatedAt: new Date(),
    updatedBy: session.user.id,
  };

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Team name cannot be empty" },
        { status: 400 },
      );
    }
    updates.name = trimmedName;
  }

  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }

  // Update team
  const [updated] = await db
    .update(project)
    .set(updates)
    .where(eq(project.id, id))
    .returning();

  return NextResponse.json(updated);
}
