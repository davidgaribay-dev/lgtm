import { db } from "@/db";
import {
  testPlan,
  testPlanCase,
  testCase,
  section,
} from "@/db/schema";
import { eq, and, isNull, asc, sql } from "drizzle-orm";

/** List test plans for a project with case counts. */
export async function getProjectTestPlans(projectId: string) {
  return db
    .select({
      id: testPlan.id,
      name: testPlan.name,
      description: testPlan.description,
      status: testPlan.status,
      createdAt: testPlan.createdAt,
      caseCount: sql<number>`(
        select count(*)::int from test_plan_case
        where test_plan_case.test_plan_id = ${testPlan.id}
      )`,
    })
    .from(testPlan)
    .where(
      and(eq(testPlan.projectId, projectId), isNull(testPlan.deletedAt)),
    )
    .orderBy(asc(testPlan.name));
}

/** Get cases for a test plan, joined with test case details. */
export async function getTestPlanCases(planId: string) {
  return db
    .select({
      id: testPlanCase.id,
      testCaseId: testPlanCase.testCaseId,
      displayOrder: testPlanCase.displayOrder,
      caseTitle: testCase.title,
      caseKey: testCase.caseKey,
      casePriority: testCase.priority,
      sectionId: testCase.sectionId,
      sectionName: section.name,
    })
    .from(testPlanCase)
    .innerJoin(testCase, eq(testPlanCase.testCaseId, testCase.id))
    .leftJoin(section, eq(testCase.sectionId, section.id))
    .where(eq(testPlanCase.testPlanId, planId))
    .orderBy(asc(testPlanCase.displayOrder));
}
