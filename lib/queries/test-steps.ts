import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { testStep } from "@/db/schema";

/**
 * Get all steps for a test case, ordered by step_order
 */
export async function getTestSteps(testCaseId: string) {
  return await db
    .select({
      id: testStep.id,
      testCaseId: testStep.testCaseId,
      stepOrder: testStep.stepOrder,
      action: testStep.action,
      data: testStep.data,
      expectedResult: testStep.expectedResult,
      createdAt: testStep.createdAt,
      updatedAt: testStep.updatedAt,
    })
    .from(testStep)
    .where(and(eq(testStep.testCaseId, testCaseId), isNull(testStep.deletedAt)))
    .orderBy(asc(testStep.stepOrder));
}

/**
 * Get a single test step by ID
 */
export async function getTestStep(stepId: string) {
  const steps = await db
    .select({
      id: testStep.id,
      testCaseId: testStep.testCaseId,
      stepOrder: testStep.stepOrder,
      action: testStep.action,
      data: testStep.data,
      expectedResult: testStep.expectedResult,
      createdAt: testStep.createdAt,
      updatedAt: testStep.updatedAt,
    })
    .from(testStep)
    .where(and(eq(testStep.id, stepId), isNull(testStep.deletedAt)))
    .limit(1);

  return steps[0] ?? null;
}

/**
 * Get the highest step_order for a test case's steps
 */
export async function getMaxStepOrder(testCaseId: string): Promise<number> {
  const result = await db
    .select({ maxOrder: testStep.stepOrder })
    .from(testStep)
    .where(and(eq(testStep.testCaseId, testCaseId), isNull(testStep.deletedAt)))
    .orderBy(asc(testStep.stepOrder))
    .limit(1);

  return result[0]?.maxOrder ?? -1;
}
