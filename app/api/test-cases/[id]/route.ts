import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { title, sectionId, projectId } = body;

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
  if (title?.trim()) updates.title = title.trim();
  if (sectionId !== undefined) updates.sectionId = sectionId || null;

  const [updated] = await db
    .update(testCase)
    .set(updates)
    .where(
      and(
        eq(testCase.id, id),
        eq(testCase.projectId, projectId),
        isNull(testCase.deletedAt),
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

  const [deleted] = await db
    .update(testCase)
    .set({
      deletedAt: new Date(),
      deletedBy: access.session.user.id,
      updatedBy: access.session.user.id,
    })
    .where(
      and(
        eq(testCase.id, id),
        eq(testCase.projectId, projectId),
        isNull(testCase.deletedAt),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
