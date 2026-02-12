import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { testSuite, section, testCase, testStep } from "@/db/schema";
import { getProjectByTeamKey } from "./workspace";

// Re-export for backward compatibility
export { getProjectByTeamKey };

export async function getTestSuites(projectId: string) {
  return db
    .select({
      id: testSuite.id,
      name: testSuite.name,
      description: testSuite.description,
      displayOrder: testSuite.displayOrder,
    })
    .from(testSuite)
    .where(
      and(eq(testSuite.projectId, projectId), isNull(testSuite.deletedAt)),
    )
    .orderBy(asc(testSuite.displayOrder), asc(testSuite.name));
}

export async function getSections(projectId: string) {
  return db
    .select({
      id: section.id,
      name: section.name,
      description: section.description,
      suiteId: section.suiteId,
      parentId: section.parentId,
      displayOrder: section.displayOrder,
    })
    .from(section)
    .where(and(eq(section.projectId, projectId), isNull(section.deletedAt)))
    .orderBy(asc(section.displayOrder), asc(section.name));
}

export async function getTestCases(projectId: string) {
  return db
    .select({
      id: testCase.id,
      title: testCase.title,
      description: testCase.description,
      preconditions: testCase.preconditions,
      postconditions: testCase.postconditions,
      type: testCase.type,
      priority: testCase.priority,
      severity: testCase.severity,
      automationStatus: testCase.automationStatus,
      status: testCase.status,
      behavior: testCase.behavior,
      layer: testCase.layer,
      isFlaky: testCase.isFlaky,
      assigneeId: testCase.assigneeId,
      templateType: testCase.templateType,
      sectionId: testCase.sectionId,
      suiteId: testCase.suiteId,
      caseKey: testCase.caseKey,
      displayOrder: testCase.displayOrder,
    })
    .from(testCase)
    .where(and(eq(testCase.projectId, projectId), isNull(testCase.deletedAt)))
    .orderBy(asc(testCase.displayOrder), asc(testCase.title));
}

export async function getTestSteps(testCaseId: string) {
  return db
    .select({
      id: testStep.id,
      stepOrder: testStep.stepOrder,
      action: testStep.action,
      expectedResult: testStep.expectedResult,
    })
    .from(testStep)
    .where(
      and(eq(testStep.testCaseId, testCaseId), isNull(testStep.deletedAt)),
    )
    .orderBy(asc(testStep.stepOrder));
}
