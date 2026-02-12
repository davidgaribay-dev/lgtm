import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testStep, testCase } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";
import { logger } from "@/lib/logger";

/**
 * PUT /api/test-steps/[id] - Update a test step
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: stepId } = await params;

  // Get step with test case info
  const [stepData] = await db
    .select({
      id: testStep.id,
      testCaseId: testStep.testCaseId,
      projectId: testCase.projectId,
    })
    .from(testStep)
    .innerJoin(testCase, eq(testStep.testCaseId, testCase.id))
    .where(and(eq(testStep.id, stepId), isNull(testStep.deletedAt)))
    .limit(1);

  if (!stepData) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  // Token auth: verify permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  const body = await request.json();
  const { action, data, expectedResult } = body;

  // Validation
  if (action !== undefined) {
    if (typeof action !== "string" || !action.trim()) {
      return NextResponse.json(
        { error: "Action must be a non-empty string" },
        { status: 400 },
      );
    }
  }

  // Build updates
  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };

  if (action !== undefined) updates.action = action.trim();
  if (data !== undefined) updates.data = data?.trim() || null;
  if (expectedResult !== undefined)
    updates.expectedResult = expectedResult?.trim() || null;

  // Update step
  const [updated] = await db
    .update(testStep)
    .set(updates)
    .where(eq(testStep.id, stepId))
    .returning();

  logger.info(
    {
      stepId,
      testCaseId: stepData.testCaseId,
      projectId: stepData.projectId,
      changes: Object.keys(updates).filter((k) => k !== "updatedBy"),
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Test step updated",
  );

  return NextResponse.json(updated);
}

/**
 * DELETE /api/test-steps/[id] - Delete a test step
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: stepId } = await params;

  // Get step with test case info
  const [stepData] = await db
    .select({
      id: testStep.id,
      testCaseId: testStep.testCaseId,
      projectId: testCase.projectId,
    })
    .from(testStep)
    .innerJoin(testCase, eq(testStep.testCaseId, testCase.id))
    .where(and(eq(testStep.id, stepId), isNull(testStep.deletedAt)))
    .limit(1);

  if (!stepData) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  // Token auth: verify permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  // Soft delete
  await db
    .update(testStep)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(testStep.id, stepId));

  logger.info(
    {
      stepId,
      testCaseId: stepData.testCaseId,
      projectId: stepData.projectId,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Test step deleted",
  );

  return NextResponse.json({ success: true });
}
