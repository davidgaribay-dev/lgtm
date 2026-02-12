import { db } from "@/db";
import {
  defect,
  environment,
  cycle,
  workspaceCycle,
  testRun,
  testCase,
  user,
} from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

/** Fetch defects for a project with joined entity names. */
export async function getProjectDefects(
  projectId: string,
  { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const assigneeUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("assignee_user");

  return db
    .select({
      id: defect.id,
      title: defect.title,
      description: defect.description,
      defectNumber: defect.defectNumber,
      defectKey: defect.defectKey,
      severity: defect.severity,
      priority: defect.priority,
      defectType: defect.defectType,
      status: defect.status,
      resolution: defect.resolution,
      assigneeId: defect.assigneeId,
      assigneeName: assigneeUser.name,
      assigneeImage: assigneeUser.image,
      testResultId: defect.testResultId,
      testRunId: defect.testRunId,
      testCaseId: defect.testCaseId,
      testCaseKey: testCase.caseKey,
      externalUrl: defect.externalUrl,
      environmentId: defect.environmentId,
      environmentName: environment.name,
      cycleId: defect.cycleId,
      workspaceCycleId: defect.workspaceCycleId,
      createdAt: defect.createdAt,
      createdBy: defect.createdBy,
    })
    .from(defect)
    .leftJoin(assigneeUser, eq(defect.assigneeId, assigneeUser.id))
    .leftJoin(environment, eq(defect.environmentId, environment.id))
    .leftJoin(testCase, eq(defect.testCaseId, testCase.id))
    .where(
      and(eq(defect.projectId, projectId), isNull(defect.deletedAt)),
    )
    .orderBy(desc(defect.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Get a single defect with all related entity names. */
export async function getDefect(defectId: string) {
  const assigneeUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("assignee_user");

  const createdByUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("created_by_user");

  const rows = await db
    .select({
      id: defect.id,
      title: defect.title,
      description: defect.description,
      defectNumber: defect.defectNumber,
      defectKey: defect.defectKey,
      severity: defect.severity,
      priority: defect.priority,
      defectType: defect.defectType,
      status: defect.status,
      resolution: defect.resolution,
      assigneeId: defect.assigneeId,
      assigneeName: assigneeUser.name,
      assigneeImage: assigneeUser.image,
      stepsToReproduce: defect.stepsToReproduce,
      expectedResult: defect.expectedResult,
      actualResult: defect.actualResult,
      testResultId: defect.testResultId,
      testRunId: defect.testRunId,
      testRunName: testRun.name,
      testRunNumber: testRun.runNumber,
      testRunKey: testRun.runKey,
      testCaseId: defect.testCaseId,
      testCaseKey: testCase.caseKey,
      testCaseTitle: testCase.title,
      externalUrl: defect.externalUrl,
      projectId: defect.projectId,
      environmentId: defect.environmentId,
      environmentName: environment.name,
      cycleId: defect.cycleId,
      cycleName: cycle.name,
      workspaceCycleId: defect.workspaceCycleId,
      workspaceCycleName: workspaceCycle.name,
      createdAt: defect.createdAt,
      createdBy: defect.createdBy,
      createdByName: createdByUser.name,
      createdByImage: createdByUser.image,
    })
    .from(defect)
    .leftJoin(assigneeUser, eq(defect.assigneeId, assigneeUser.id))
    .leftJoin(createdByUser, eq(defect.createdBy, createdByUser.id))
    .leftJoin(environment, eq(defect.environmentId, environment.id))
    .leftJoin(cycle, eq(defect.cycleId, cycle.id))
    .leftJoin(workspaceCycle, eq(defect.workspaceCycleId, workspaceCycle.id))
    .leftJoin(testRun, eq(defect.testRunId, testRun.id))
    .leftJoin(testCase, eq(defect.testCaseId, testCase.id))
    .where(and(eq(defect.id, defectId), isNull(defect.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/** Get a single defect by its human-readable key (e.g. "ENGT-D-42"). */
export async function getDefectByKey(defectKey: string) {
  const assigneeUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("assignee_user");

  const createdByUser = db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .as("created_by_user");

  const rows = await db
    .select({
      id: defect.id,
      title: defect.title,
      description: defect.description,
      defectNumber: defect.defectNumber,
      defectKey: defect.defectKey,
      severity: defect.severity,
      priority: defect.priority,
      defectType: defect.defectType,
      status: defect.status,
      resolution: defect.resolution,
      assigneeId: defect.assigneeId,
      assigneeName: assigneeUser.name,
      assigneeImage: assigneeUser.image,
      stepsToReproduce: defect.stepsToReproduce,
      expectedResult: defect.expectedResult,
      actualResult: defect.actualResult,
      testResultId: defect.testResultId,
      testRunId: defect.testRunId,
      testRunName: testRun.name,
      testRunNumber: testRun.runNumber,
      testRunKey: testRun.runKey,
      testCaseId: defect.testCaseId,
      testCaseKey: testCase.caseKey,
      testCaseTitle: testCase.title,
      externalUrl: defect.externalUrl,
      projectId: defect.projectId,
      environmentId: defect.environmentId,
      environmentName: environment.name,
      cycleId: defect.cycleId,
      cycleName: cycle.name,
      workspaceCycleId: defect.workspaceCycleId,
      workspaceCycleName: workspaceCycle.name,
      createdAt: defect.createdAt,
      createdBy: defect.createdBy,
      createdByName: createdByUser.name,
      createdByImage: createdByUser.image,
    })
    .from(defect)
    .leftJoin(assigneeUser, eq(defect.assigneeId, assigneeUser.id))
    .leftJoin(createdByUser, eq(defect.createdBy, createdByUser.id))
    .leftJoin(environment, eq(defect.environmentId, environment.id))
    .leftJoin(cycle, eq(defect.cycleId, cycle.id))
    .leftJoin(workspaceCycle, eq(defect.workspaceCycleId, workspaceCycle.id))
    .leftJoin(testRun, eq(defect.testRunId, testRun.id))
    .leftJoin(testCase, eq(defect.testCaseId, testCase.id))
    .where(and(eq(defect.defectKey, defectKey), isNull(defect.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/** Get defects linked to a specific test result. */
export async function getDefectsForTestResult(testResultId: string) {
  return db
    .select({
      id: defect.id,
      title: defect.title,
      defectKey: defect.defectKey,
      severity: defect.severity,
      status: defect.status,
    })
    .from(defect)
    .where(
      and(
        eq(defect.testResultId, testResultId),
        isNull(defect.deletedAt),
      ),
    )
    .orderBy(desc(defect.createdAt));
}
