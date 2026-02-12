import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { testRun, testResult, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { computeRunStatus } from "@/lib/queries/test-runs";
import { TEST_RESULT_STATUSES as VALID_STATUSES } from "@lgtm/shared";

/** POST — Bulk submit results for a test run. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get existing run
  const existing = await db
    .select({
      id: testRun.id,
      projectId: testRun.projectId,
      status: testRun.status,
    })
    .from(testRun)
    .where(and(eq(testRun.id, id), isNull(testRun.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test run not found" },
      { status: 404 },
    );
  }

  // Verify project access
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
  const { results } = body;

  if (!results || !Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "results array is required and must not be empty" },
      { status: 400 },
    );
  }

  // Validate all statuses upfront
  for (const r of results) {
    if (!r.testCaseId || !r.status) {
      return NextResponse.json(
        { error: "Each result must have testCaseId and status" },
        { status: 400 },
      );
    }
    if (!VALID_STATUSES.includes(r.status)) {
      return NextResponse.json(
        {
          error: `Invalid status "${r.status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  // Fetch existing result records for this run
  const testCaseIds = results.map(
    (r: { testCaseId: string }) => r.testCaseId,
  );
  const existingResults = await db
    .select({
      id: testResult.id,
      testCaseId: testResult.testCaseId,
      status: testResult.status,
    })
    .from(testResult)
    .where(
      and(
        eq(testResult.testRunId, id),
        inArray(testResult.testCaseId, testCaseIds),
      ),
    );

  const resultMap = new Map(existingResults.map((r) => [r.testCaseId, r]));

  const source =
    authContext.type === "api_token"
      ? (body.source ?? "api")
      : (body.source ?? "manual");

  // Update each result
  const updated = [];
  for (const r of results) {
    const existingResult = resultMap.get(r.testCaseId);
    if (!existingResult) continue;

    const updates: Record<string, unknown> = {
      status: r.status,
      source,
      updatedAt: new Date(),
    };

    if (r.comment !== undefined) {
      updates.comment = r.comment?.trim() || null;
    }
    if (r.duration !== undefined) {
      updates.duration = r.duration;
    }

    // Auto-set executedBy/At when transitioning from untested
    if (
      existingResult.status === "untested" &&
      r.status !== "untested"
    ) {
      updates.executedBy = r.executedBy ?? authContext.userId;
      updates.executedAt = r.executedAt ? new Date(r.executedAt) : new Date();
    }

    const [result] = await db
      .update(testResult)
      .set(updates)
      .where(eq(testResult.id, existingResult.id))
      .returning();

    updated.push(result);
  }

  // Compute suggested run status after bulk update
  const suggestedStatus = await computeRunStatus(id);

  return NextResponse.json({
    updated: updated.length,
    suggestedRunStatus: suggestedStatus,
    results: updated.map((r) => ({
      testCaseId: r.testCaseId,
      testResultId: r.id,
    })),
  });
}
