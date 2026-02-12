import { db } from "@/db";
import {
  testRun,
  testResult,
  testCase,
  testStep,
  testStepResult,
  environment,
  cycle,
  workspaceCycle,
  section,
  user,
} from "@/db/schema";
import {
  eq,
  and,
  isNull,
  asc,
  desc,
  inArray,
  sql,
} from "drizzle-orm";

/** Fetch all test runs for a project with computed result metrics. */
export async function getProjectTestRuns(projectId: string) {
  const runs = await db
    .select({
      id: testRun.id,
      name: testRun.name,
      runNumber: testRun.runNumber,
      description: testRun.description,
      status: testRun.status,
      environmentId: testRun.environmentId,
      environmentName: environment.name,
      cycleId: testRun.cycleId,
      workspaceCycleId: testRun.workspaceCycleId,
      startedAt: testRun.startedAt,
      completedAt: testRun.completedAt,
      executedBy: testRun.executedBy,
      createdAt: testRun.createdAt,
      createdBy: testRun.createdBy,
    })
    .from(testRun)
    .leftJoin(environment, eq(testRun.environmentId, environment.id))
    .where(
      and(eq(testRun.projectId, projectId), isNull(testRun.deletedAt)),
    )
    .orderBy(desc(testRun.createdAt));

  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id);

  const resultCounts = await db
    .select({
      testRunId: testResult.testRunId,
      status: testResult.status,
      count: sql<number>`count(*)::int`,
    })
    .from(testResult)
    .where(inArray(testResult.testRunId, runIds))
    .groupBy(testResult.testRunId, testResult.status);

  interface ResultMetrics {
    untested: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    [key: string]: number;
  }

  const metricsMap = new Map<string, ResultMetrics>();
  for (const row of resultCounts) {
    if (!metricsMap.has(row.testRunId)) {
      metricsMap.set(row.testRunId, {
        untested: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
      });
    }
    const m = metricsMap.get(row.testRunId)!;
    if (row.status in m) {
      m[row.status] = row.count;
    }
  }

  return runs.map((run) => {
    const metrics = metricsMap.get(run.id) ?? {
      untested: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
    };
    const totalCases = Object.values(metrics).reduce((a, b) => a + b, 0);
    return { ...run, metrics, totalCases };
  });
}

/** Get a single test run with related entity names. */
export async function getTestRun(runId: string) {
  const rows = await db
    .select({
      id: testRun.id,
      name: testRun.name,
      runNumber: testRun.runNumber,
      description: testRun.description,
      projectId: testRun.projectId,
      testPlanId: testRun.testPlanId,
      status: testRun.status,
      environmentId: testRun.environmentId,
      environmentName: environment.name,
      cycleId: testRun.cycleId,
      cycleName: cycle.name,
      workspaceCycleId: testRun.workspaceCycleId,
      workspaceCycleName: workspaceCycle.name,
      startedAt: testRun.startedAt,
      completedAt: testRun.completedAt,
      executedBy: testRun.executedBy,
      createdAt: testRun.createdAt,
      createdBy: testRun.createdBy,
      createdByName: user.name,
    })
    .from(testRun)
    .leftJoin(environment, eq(testRun.environmentId, environment.id))
    .leftJoin(cycle, eq(testRun.cycleId, cycle.id))
    .leftJoin(workspaceCycle, eq(testRun.workspaceCycleId, workspaceCycle.id))
    .leftJoin(user, eq(testRun.createdBy, user.id))
    .where(and(eq(testRun.id, runId), isNull(testRun.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/** Get results for a test run, joined with test case and section info. */
export async function getTestRunResults(runId: string) {
  const executedByUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("executed_user");

  return db
    .select({
      id: testResult.id,
      testRunId: testResult.testRunId,
      testCaseId: testResult.testCaseId,
      status: testResult.status,
      source: testResult.source,
      executedBy: testResult.executedBy,
      executedByName: executedByUser.name,
      executedByImage: executedByUser.image,
      executedAt: testResult.executedAt,
      duration: testResult.duration,
      comment: testResult.comment,
      caseTitle: testCase.title,
      caseKey: testCase.caseKey,
      casePriority: testCase.priority,
      caseType: testCase.type,
      sectionId: testCase.sectionId,
      sectionName: section.name,
    })
    .from(testResult)
    .innerJoin(testCase, eq(testResult.testCaseId, testCase.id))
    .leftJoin(section, eq(testCase.sectionId, section.id))
    .leftJoin(executedByUser, eq(testResult.executedBy, executedByUser.id))
    .where(eq(testResult.testRunId, runId))
    .orderBy(
      asc(section.displayOrder),
      asc(section.name),
      asc(testCase.displayOrder),
      asc(testCase.title),
    );
}

/** Get aggregated result metrics for a single test run. */
export async function getRunMetrics(runId: string) {
  const results = await db
    .select({
      status: testResult.status,
      count: sql<number>`count(*)::int`,
    })
    .from(testResult)
    .where(eq(testResult.testRunId, runId))
    .groupBy(testResult.status);

  const metrics: Record<string, number> = {
    untested: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };

  for (const r of results) {
    if (r.status in metrics) {
      metrics[r.status] = r.count;
    }
  }

  const total = Object.values(metrics).reduce((a, b) => a + b, 0);
  const passRate =
    total > 0
      ? Math.round(((metrics.passed / total) * 100) * 10) / 10
      : 0;

  return {
    untested: metrics.untested,
    passed: metrics.passed,
    failed: metrics.failed,
    blocked: metrics.blocked,
    skipped: metrics.skipped,
    total,
    passRate,
  };
}

/**
 * Compute the suggested run status based on all result statuses.
 * Returns null if there are still untested results.
 */
export async function computeRunStatus(
  runId: string,
): Promise<string | null> {
  const metrics = await getRunMetrics(runId);

  if (metrics.untested > 0) return null;
  if (metrics.total === 0) return null;
  if (metrics.failed > 0) return "failed";
  if (metrics.blocked > 0) return "blocked";
  return "passed";
}

/** Fetch a single test result with case info, section, and executed-by user. */
export async function getTestResult(resultId: string) {
  const executedByUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("executed_user");

  const rows = await db
    .select({
      id: testResult.id,
      testRunId: testResult.testRunId,
      testCaseId: testResult.testCaseId,
      status: testResult.status,
      source: testResult.source,
      executedBy: testResult.executedBy,
      executedByName: executedByUser.name,
      executedByImage: executedByUser.image,
      executedAt: testResult.executedAt,
      duration: testResult.duration,
      comment: testResult.comment,
      caseTitle: testCase.title,
      caseKey: testCase.caseKey,
      casePriority: testCase.priority,
      caseType: testCase.type,
      sectionId: testCase.sectionId,
      sectionName: section.name,
    })
    .from(testResult)
    .innerJoin(testCase, eq(testResult.testCaseId, testCase.id))
    .leftJoin(section, eq(testCase.sectionId, section.id))
    .leftJoin(executedByUser, eq(testResult.executedBy, executedByUser.id))
    .where(eq(testResult.id, resultId))
    .limit(1);

  return rows[0] ?? null;
}

/** Fetch ordered result IDs for a test run (for prev/next navigation). */
export async function getTestRunResultIds(runId: string): Promise<string[]> {
  const rows = await db
    .select({ id: testResult.id })
    .from(testResult)
    .innerJoin(testCase, eq(testResult.testCaseId, testCase.id))
    .leftJoin(section, eq(testCase.sectionId, section.id))
    .where(eq(testResult.testRunId, runId))
    .orderBy(
      asc(section.displayOrder),
      asc(section.name),
      asc(testCase.displayOrder),
      asc(testCase.title),
    );

  return rows.map((r) => r.id);
}

/** Fetch test steps with any existing step results for a test result. */
export async function getTestResultSteps(resultId: string) {
  // First get the testCaseId from the result
  const result = await db
    .select({ testCaseId: testResult.testCaseId })
    .from(testResult)
    .where(eq(testResult.id, resultId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!result) return [];

  return db
    .select({
      id: testStep.id,
      stepOrder: testStep.stepOrder,
      action: testStep.action,
      expectedResult: testStep.expectedResult,
      stepResultId: testStepResult.id,
      status: testStepResult.status,
      actualResult: testStepResult.actualResult,
      comment: testStepResult.comment,
    })
    .from(testStep)
    .leftJoin(
      testStepResult,
      and(
        eq(testStepResult.testStepId, testStep.id),
        eq(testStepResult.testResultId, resultId),
      ),
    )
    .where(eq(testStep.testCaseId, result.testCaseId))
    .orderBy(testStep.stepOrder);
}
