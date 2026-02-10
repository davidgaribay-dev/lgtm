import { db } from "@/db";
import { cycle, testCase, testRun, testResult } from "@/db/schema";
import { eq, and, isNull, asc, desc, count, sql } from "drizzle-orm";
import { getProjectByTeamKey } from "./workspace";

// Re-export for backward compatibility
export { getProjectByTeamKey };

/** Fetch all active cycles for a project, ordered by display order. */
export async function getProjectCycles(projectId: string) {
  return db
    .select({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      isCurrent: cycle.isCurrent,
      displayOrder: cycle.displayOrder,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        isNull(cycle.deletedAt),
      ),
    )
    .orderBy(asc(cycle.displayOrder), desc(cycle.startDate), asc(cycle.name));
}

/** Get current active cycle for a project */
export async function getCurrentCycle(projectId: string) {
  return db
    .select({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      isCurrent: cycle.isCurrent,
      displayOrder: cycle.displayOrder,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        eq(cycle.isCurrent, true),
        isNull(cycle.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/** Get cycles by status */
export async function getCyclesByStatus(
  projectId: string,
  status: "planned" | "active" | "completed"
) {
  return db
    .select({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      isCurrent: cycle.isCurrent,
      displayOrder: cycle.displayOrder,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        eq(cycle.status, status),
        isNull(cycle.deletedAt),
      ),
    )
    .orderBy(desc(cycle.startDate), asc(cycle.name));
}

/** Get test case coverage count for a cycle */
export async function getCycleCoverage(cycleId: string) {
  const result = await db
    .select({ count: count() })
    .from(testCase)
    .where(
      and(
        eq(testCase.cycleId, cycleId),
        isNull(testCase.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}

/** Get test runs executed for a cycle */
export async function getCycleTestRuns(cycleId: string) {
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
        eq(testRun.cycleId, cycleId),
        isNull(testRun.deletedAt),
      ),
    )
    .orderBy(desc(testRun.startedAt));
}

/** Get defects found in a cycle (failed test results) */
export async function getCycleDefects(cycleId: string) {
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
        eq(testResult.defectCycleId, cycleId),
        eq(testResult.status, "failed"),
      ),
    )
    .orderBy(desc(testResult.executedAt));
}

/** Get cycle metrics summary */
export async function getCycleMetrics(cycleId: string) {
  const [coverageCount] = await db
    .select({ value: count() })
    .from(testCase)
    .where(
      and(
        eq(testCase.cycleId, cycleId),
        isNull(testCase.deletedAt),
      ),
    );

  const [runsCount] = await db
    .select({ value: count() })
    .from(testRun)
    .where(
      and(
        eq(testRun.cycleId, cycleId),
        isNull(testRun.deletedAt),
      ),
    );

  const [defectsCount] = await db
    .select({ value: count() })
    .from(testResult)
    .where(
      and(
        eq(testResult.defectCycleId, cycleId),
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
        eq(testRun.cycleId, cycleId),
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

