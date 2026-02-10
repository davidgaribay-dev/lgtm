import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { testStep, testCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testCaseId = request.nextUrl.searchParams.get("testCaseId");

  if (!testCaseId) {
    return NextResponse.json(
      { error: "testCaseId is required" },
      { status: 400 },
    );
  }

  // Get test case to find project
  const tc = await db
    .select({ projectId: testCase.projectId })
    .from(testCase)
    .where(and(eq(testCase.id, testCaseId), isNull(testCase.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!tc) {
    return NextResponse.json(
      { error: "Test case not found" },
      { status: 404 },
    );
  }

  // Get project org
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, tc.projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope
    if (!hasProjectAccess(authContext, tc.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "testStep", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify membership
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

  // Get test steps
  const steps = await db
    .select({
      id: testStep.id,
      testCaseId: testStep.testCaseId,
      stepOrder: testStep.stepOrder,
      action: testStep.action,
      expectedResult: testStep.expectedResult,
      createdAt: testStep.createdAt,
      updatedAt: testStep.updatedAt,
    })
    .from(testStep)
    .where(
      and(eq(testStep.testCaseId, testCaseId), isNull(testStep.deletedAt)),
    )
    .orderBy(asc(testStep.stepOrder));

  return NextResponse.json(steps);
}
