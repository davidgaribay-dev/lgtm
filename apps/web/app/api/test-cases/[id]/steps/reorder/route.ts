import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { testStep, testCase } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";
import { logger } from "@/lib/logger";

/**
 * PUT /api/test-cases/[id]/steps/reorder - Reorder test steps
 * Body: { stepIds: string[] } - array of step IDs in desired order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: testCaseId } = await params;

  // Get test case to verify access
  const [testCaseData] = await db
    .select({ id: testCase.id, projectId: testCase.projectId })
    .from(testCase)
    .where(and(eq(testCase.id, testCaseId), isNull(testCase.deletedAt)))
    .limit(1);

  if (!testCaseData) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
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
  const { stepIds } = body;

  // Validation
  if (!Array.isArray(stepIds) || stepIds.length === 0) {
    return NextResponse.json(
      { error: "stepIds must be a non-empty array" },
      { status: 400 },
    );
  }

  // Verify all steps belong to this test case
  const steps = await db
    .select({ id: testStep.id })
    .from(testStep)
    .where(
      and(
        eq(testStep.testCaseId, testCaseId),
        isNull(testStep.deletedAt),
        inArray(testStep.id, stepIds),
      ),
    );

  if (steps.length !== stepIds.length) {
    return NextResponse.json(
      { error: "Some step IDs are invalid or do not belong to this test case" },
      { status: 400 },
    );
  }

  // Update step orders
  await Promise.all(
    stepIds.map((stepId, index) =>
      db
        .update(testStep)
        .set({
          stepOrder: index,
          updatedBy: authContext.userId,
        })
        .where(eq(testStep.id, stepId)),
    ),
  );

  logger.info(
    {
      testCaseId,
      projectId: testCaseData.projectId,
      stepCount: stepIds.length,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Test steps reordered",
  );

  return NextResponse.json({ success: true });
}
