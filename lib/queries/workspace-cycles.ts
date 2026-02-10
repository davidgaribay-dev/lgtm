import { db } from "@/db";
import {
  workspaceCycle,
  organization,
  testCase,
  testRun,
  testResult,
} from "@/db/schema";
import { eq, and, isNull, asc, desc, count, sql } from "drizzle-orm";

/** Fetch all active workspace cycles for an organization, ordered by display order. */
export async function getOrganizationCycles(organizationId: string) {
  return db
    .select({
      id: workspaceCycle.id,
      name: workspaceCycle.name,
      description: workspaceCycle.description,
      startDate: workspaceCycle.startDate,
      endDate: workspaceCycle.endDate,
      status: workspaceCycle.status,
      isCurrent: workspaceCycle.isCurrent,
      displayOrder: workspaceCycle.displayOrder,
      createdAt: workspaceCycle.createdAt,
      updatedAt: workspaceCycle.updatedAt,
    })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        isNull(workspaceCycle.deletedAt),
      ),
    )
    .orderBy(
      asc(workspaceCycle.displayOrder),
      desc(workspaceCycle.startDate),
      asc(workspaceCycle.name),
    );
}

/** Get current active workspace cycle for an organization */
export async function getCurrentWorkspaceCycle(organizationId: string) {
  return db
    .select({
      id: workspaceCycle.id,
      name: workspaceCycle.name,
      description: workspaceCycle.description,
      startDate: workspaceCycle.startDate,
      endDate: workspaceCycle.endDate,
      status: workspaceCycle.status,
      isCurrent: workspaceCycle.isCurrent,
      displayOrder: workspaceCycle.displayOrder,
      createdAt: workspaceCycle.createdAt,
      updatedAt: workspaceCycle.updatedAt,
    })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        eq(workspaceCycle.isCurrent, true),
        isNull(workspaceCycle.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/** Get workspace cycles by status */
export async function getWorkspaceCyclesByStatus(
  organizationId: string,
  status: "planned" | "active" | "completed",
) {
  return db
    .select({
      id: workspaceCycle.id,
      name: workspaceCycle.name,
      description: workspaceCycle.description,
      startDate: workspaceCycle.startDate,
      endDate: workspaceCycle.endDate,
      status: workspaceCycle.status,
      isCurrent: workspaceCycle.isCurrent,
      displayOrder: workspaceCycle.displayOrder,
      createdAt: workspaceCycle.createdAt,
      updatedAt: workspaceCycle.updatedAt,
    })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        eq(workspaceCycle.status, status),
        isNull(workspaceCycle.deletedAt),
      ),
    )
    .orderBy(desc(workspaceCycle.startDate), asc(workspaceCycle.name));
}

/** Get test case coverage count for a workspace cycle */
export async function getWorkspaceCycleCoverage(cycleId: string) {
  const result = await db
    .select({ count: count() })
    .from(testCase)
    .where(
      and(
        eq(testCase.workspaceCycleId, cycleId),
        isNull(testCase.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

/** Get test runs executed for a workspace cycle */
export async function getWorkspaceCycleTestRuns(cycleId: string) {
  return db
    .select({
      id: testRun.id,
      name: testRun.name,
      status: testRun.status,
      startedAt: testRun.startedAt,
      completedAt: testRun.completedAt,
    })
    .from(testRun)
    .where(
      and(
        eq(testRun.workspaceCycleId, cycleId),
        isNull(testRun.deletedAt),
      ),
    )
    .orderBy(desc(testRun.startedAt));
}

/** Get defects found in a workspace cycle (failed test results) */
export async function getWorkspaceCycleDefects(cycleId: string) {
  return db
    .select({
      id: testResult.id,
      testCaseId: testResult.testCaseId,
      testRunId: testResult.testRunId,
      status: testResult.status,
      executedAt: testResult.executedAt,
      comment: testResult.comment,
    })
    .from(testResult)
    .where(
      and(
        eq(testResult.defectWorkspaceCycleId, cycleId),
        eq(testResult.status, "failed"),
      ),
    )
    .orderBy(desc(testResult.executedAt));
}

/** Get workspace cycle metrics summary */
export async function getWorkspaceCycleMetrics(cycleId: string) {
  const [coverageCount] = await db
    .select({ value: count() })
    .from(testCase)
    .where(
      and(
        eq(testCase.workspaceCycleId, cycleId),
        isNull(testCase.deletedAt),
      ),
    );

  const [runsCount] = await db
    .select({ value: count() })
    .from(testRun)
    .where(
      and(
        eq(testRun.workspaceCycleId, cycleId),
        isNull(testRun.deletedAt),
      ),
    );

  const [defectsCount] = await db
    .select({ value: count() })
    .from(testResult)
    .where(
      and(
        eq(testResult.defectWorkspaceCycleId, cycleId),
        eq(testResult.status, "failed"),
      ),
    );

  // Test execution pass rate
  const results = await db
    .select({
      status: testResult.status,
      count: sql<number>`count(*)::int`,
    })
    .from(testResult)
    .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
    .where(
      and(
        eq(testRun.workspaceCycleId, cycleId),
        isNull(testRun.deletedAt),
      ),
    )
    .groupBy(testResult.status);

  const totalExecuted = results.reduce((sum, r) => sum + r.count, 0);
  const passed = results.find((r) => r.status === "passed")?.count ?? 0;
  const passRate = totalExecuted > 0 ? (passed / totalExecuted) * 100 : 0;

  return {
    cycleId,
    testCaseCoverage: coverageCount?.value ?? 0,
    testRunsExecuted: runsCount?.value ?? 0,
    defectsFound: defectsCount?.value ?? 0,
    totalTestsExecuted: totalExecuted,
    passRate: Math.round(passRate * 10) / 10, // Round to 1 decimal
    results: results.map((r) => ({ status: r.status, count: r.count })),
  };
}

/** Resolve organization by workspace slug */
export async function getOrganizationBySlug(workspaceSlug: string) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
