import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sharedStepAction, sharedStep, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

/**
 * PUT /api/shared-steps/[id]/actions/[actionId] - Update a shared step action
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sharedStepId, actionId } = await params;

  // Get action with shared step info
  const [actionData] = await db
    .select({
      id: sharedStepAction.id,
      sharedStepId: sharedStepAction.sharedStepId,
    })
    .from(sharedStepAction)
    .where(
      and(
        eq(sharedStepAction.id, actionId),
        eq(sharedStepAction.sharedStepId, sharedStepId),
        isNull(sharedStepAction.deletedAt),
      ),
    )
    .limit(1);

  if (!actionData) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  // Get shared step for project access
  const [stepData] = await db
    .select({ projectId: sharedStep.projectId })
    .from(sharedStep)
    .where(and(eq(sharedStep.id, sharedStepId), isNull(sharedStep.deletedAt)))
    .limit(1);

  if (!stepData) {
    return NextResponse.json({ error: "Shared step not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, stepData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, stepData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "sharedStep", "update")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
          inArray(member.role, ["owner", "admin"]),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { action, data, expectedResult } = body;

  if (action !== undefined) {
    if (typeof action !== "string" || !action.trim()) {
      return NextResponse.json(
        { error: "Action must be a non-empty string" },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };

  if (action !== undefined) updates.action = action.trim();
  if (data !== undefined) updates.data = data?.trim() || null;
  if (expectedResult !== undefined) updates.expectedResult = expectedResult?.trim() || null;

  const [updated] = await db
    .update(sharedStepAction)
    .set(updates)
    .where(eq(sharedStepAction.id, actionId))
    .returning();

  return NextResponse.json(updated);
}

/**
 * DELETE /api/shared-steps/[id]/actions/[actionId] - Delete a shared step action
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sharedStepId, actionId } = await params;

  const [actionData] = await db
    .select({
      id: sharedStepAction.id,
      sharedStepId: sharedStepAction.sharedStepId,
    })
    .from(sharedStepAction)
    .where(
      and(
        eq(sharedStepAction.id, actionId),
        eq(sharedStepAction.sharedStepId, sharedStepId),
        isNull(sharedStepAction.deletedAt),
      ),
    )
    .limit(1);

  if (!actionData) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  const [stepData] = await db
    .select({ projectId: sharedStep.projectId })
    .from(sharedStep)
    .where(and(eq(sharedStep.id, sharedStepId), isNull(sharedStep.deletedAt)))
    .limit(1);

  if (!stepData) {
    return NextResponse.json({ error: "Shared step not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, stepData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, stepData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "sharedStep", "update")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
          inArray(member.role, ["owner", "admin"]),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  await db
    .update(sharedStepAction)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(sharedStepAction.id, actionId));

  return NextResponse.json({ success: true });
}
