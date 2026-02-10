import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { section, testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";

/** Collect all descendant section IDs recursively. */
async function getDescendantSectionIds(parentId: string): Promise<string[]> {
  const children = await db
    .select({ id: section.id })
    .from(section)
    .where(and(eq(section.parentId, parentId), isNull(section.deletedAt)));

  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const deeper = await getDescendantSectionIds(child.id);
    ids.push(...deeper);
  }
  return ids;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { name, suiteId, parentId, projectId } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId);
  if (access instanceof NextResponse) return access;

  // Prevent circular reference
  if (parentId === id) {
    return NextResponse.json(
      { error: "Cannot set parent to self" },
      { status: 400 },
    );
  }

  if (parentId) {
    const descendants = await getDescendantSectionIds(id);
    if (descendants.includes(parentId)) {
      return NextResponse.json(
        { error: "Cannot move into own descendant" },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = {
    updatedBy: access.session.user.id,
  };
  if (name?.trim()) updates.name = name.trim();
  if (suiteId !== undefined) updates.suiteId = suiteId || null;
  if (parentId !== undefined) updates.parentId = parentId || null;

  const [updated] = await db
    .update(section)
    .set(updates)
    .where(
      and(
        eq(section.id, id),
        eq(section.projectId, projectId),
        isNull(section.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(_request.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId);
  if (access instanceof NextResponse) return access;

  const now = new Date();
  const userId = access.session.user.id;

  // Verify section exists
  const sec = await db
    .select({ id: section.id })
    .from(section)
    .where(
      and(
        eq(section.id, id),
        eq(section.projectId, projectId),
        isNull(section.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!sec) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Collect all descendant section IDs
  const descendantIds = await getDescendantSectionIds(id);
  const allSectionIds = [id, ...descendantIds];

  // Soft-delete test cases in all sections
  for (const sId of allSectionIds) {
    await db
      .update(testCase)
      .set({ deletedAt: now, deletedBy: userId, updatedBy: userId })
      .where(and(eq(testCase.sectionId, sId), isNull(testCase.deletedAt)));
  }

  // Soft-delete all sections (self + descendants)
  for (const sId of allSectionIds) {
    await db
      .update(section)
      .set({ deletedAt: now, deletedBy: userId, updatedBy: userId })
      .where(eq(section.id, sId));
  }

  return NextResponse.json({ success: true });
}
