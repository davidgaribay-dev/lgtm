import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { testStep, testCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { getTestSteps } from "@/lib/queries/test-steps";
import { logger } from "@/lib/logger";

/**
 * GET /api/test-cases/[id]/steps - List all steps for a test case
 */
export async function GET(
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

  // Verify project access
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, testCaseData.projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, testCaseData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "testCase", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const steps = await getTestSteps(testCaseId);

  logger.info(
    {
      testCaseId,
      projectId: testCaseData.projectId,
      stepCount: steps.length,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Test steps listed",
  );

  return NextResponse.json(steps);
}

/**
 * POST /api/test-cases/[id]/steps - Create a new step
 */
export async function POST(
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

  // Verify project access
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, testCaseData.projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, testCaseData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "testCase", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership || membership.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { action, data, expectedResult, sharedStepId } = body;

  // Validation
  if (!action || typeof action !== "string" || !action.trim()) {
    return NextResponse.json(
      { error: "Action is required" },
      { status: 400 },
    );
  }

  // Get max step order
  const maxOrderResult = await db
    .select({ maxOrder: max(testStep.stepOrder) })
    .from(testStep)
    .where(and(eq(testStep.testCaseId, testCaseId), isNull(testStep.deletedAt)));

  const maxOrder = maxOrderResult[0]?.maxOrder ?? -1;

  // Create step
  const [created] = await db
    .insert(testStep)
    .values({
      testCaseId,
      stepOrder: maxOrder + 1,
      action: action.trim(),
      data: data?.trim() || null,
      expectedResult: expectedResult?.trim() || null,
      sharedStepId: sharedStepId || null,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  logger.info(
    {
      stepId: created.id,
      testCaseId,
      projectId: testCaseData.projectId,
      stepOrder: created.stepOrder,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Test step created",
  );

  return NextResponse.json(created, { status: 201 });
}
