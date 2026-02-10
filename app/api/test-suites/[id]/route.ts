import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testSuite, section, testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { name, projectId } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId);
  if (access instanceof NextResponse) return access;

  const updates: Record<string, unknown> = {
    updatedBy: access.session.user.id,
  };
  if (name?.trim()) updates.name = name.trim();

  const [updated] = await db
    .update(testSuite)
    .set(updates)
    .where(
      and(
        eq(testSuite.id, id),
        eq(testSuite.projectId, projectId),
        isNull(testSuite.deletedAt),
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

  // Read projectId from query or body
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

  // Verify suite exists
  const suite = await db
    .select({ id: testSuite.id })
    .from(testSuite)
    .where(
      and(
        eq(testSuite.id, id),
        eq(testSuite.projectId, projectId),
        isNull(testSuite.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!suite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascade soft-delete: sections belonging to this suite
  const childSections = await db
    .select({ id: section.id })
    .from(section)
    .where(
      and(eq(section.suiteId, id), isNull(section.deletedAt)),
    );

  const sectionIds = childSections.map((s) => s.id);

  // Soft-delete test cases in those sections
  if (sectionIds.length > 0) {
    for (const sId of sectionIds) {
      await db
        .update(testCase)
        .set({ deletedAt: now, deletedBy: userId, updatedBy: userId })
        .where(
          and(eq(testCase.sectionId, sId), isNull(testCase.deletedAt)),
        );
    }

    // Soft-delete sections
    for (const sId of sectionIds) {
      await db
        .update(section)
        .set({ deletedAt: now, deletedBy: userId, updatedBy: userId })
        .where(eq(section.id, sId));
    }
  }

  // Soft-delete the suite
  await db
    .update(testSuite)
    .set({ deletedAt: now, deletedBy: userId, updatedBy: userId })
    .where(eq(testSuite.id, id));

  return NextResponse.json({ success: true });
}
