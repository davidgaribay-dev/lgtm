import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  testResult,
  testRun,
  testStepResult,
  project,
  member,
} from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getTestResultSteps } from "@/lib/queries/test-runs";
import { TEST_RESULT_STATUSES } from "@lgtm/shared";

/** GET — Step results for a test result, joined with step definitions. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify test result exists and get project info
  const existing = await db
    .select({
      id: testResult.id,
      testCaseId: testResult.testCaseId,
      projectId: testRun.projectId,
    })
    .from(testResult)
    .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
    .where(eq(testResult.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test result not found" },
      { status: 404 },
    );
  }

  // Auth check
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, existing.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, existing.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "testRun", "read")) {
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

  const steps = await getTestResultSteps(id);
  return NextResponse.json(steps);
}

/** PUT — Bulk upsert step results for a test result. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify test result exists
  const existing = await db
    .select({
      id: testResult.id,
      testCaseId: testResult.testCaseId,
      projectId: testRun.projectId,
    })
    .from(testResult)
    .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
    .where(eq(testResult.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test result not found" },
      { status: 404 },
    );
  }

  // Auth check
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, existing.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, existing.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "testRun", "execute")) {
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

  const body = await request.json();
  const { steps } = body;

  if (!steps || !Array.isArray(steps)) {
    return NextResponse.json(
      { error: "steps array is required" },
      { status: 400 },
    );
  }

  const VALID_STATUSES = TEST_RESULT_STATUSES;

  // Upsert each step result
  const results = [];
  for (const step of steps) {
    if (!step.testStepId) continue;

    const status = step.status ?? "untested";
    if (!VALID_STATUSES.includes(status)) continue;

    const [upserted] = await db
      .insert(testStepResult)
      .values({
        testResultId: id,
        testStepId: step.testStepId,
        status,
        actualResult: step.actualResult?.trim() || null,
        comment: step.comment?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [testStepResult.testResultId, testStepResult.testStepId],
        set: {
          status,
          actualResult: step.actualResult?.trim() || null,
          comment: step.comment?.trim() || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    results.push(upserted);
  }

  return NextResponse.json(results);
}
