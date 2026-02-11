import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";

const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_TYPES = ["functional", "smoke", "regression"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { title, sectionId, projectId, description, preconditions, priority, type } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId, request);
  if (access instanceof NextResponse) return access;

  const { authContext } = access;
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check token permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json(
      { error: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}` },
      { status: 400 },
    );
  }

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };
  if (title?.trim()) updates.title = title.trim();
  if (sectionId !== undefined) updates.sectionId = sectionId || null;
  if (description !== undefined) updates.description = description?.trim() || null;
  if (preconditions !== undefined) updates.preconditions = preconditions?.trim() || null;
  if (priority !== undefined) updates.priority = priority;
  if (type !== undefined) updates.type = type;

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId, request);
  if (access instanceof NextResponse) return access;

  const { authContext } = access;
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check token permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  const [deleted] = await db
    .update(testCase)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
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
