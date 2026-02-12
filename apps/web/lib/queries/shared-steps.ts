import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { sharedStep, sharedStepAction } from "@/db/schema";

/**
 * Get all shared steps for a project
 */
export async function getProjectSharedSteps(projectId: string) {
  return await db
    .select({
      id: sharedStep.id,
      title: sharedStep.title,
      description: sharedStep.description,
      projectId: sharedStep.projectId,
      status: sharedStep.status,
      displayOrder: sharedStep.displayOrder,
      createdAt: sharedStep.createdAt,
      updatedAt: sharedStep.updatedAt,
    })
    .from(sharedStep)
    .where(and(eq(sharedStep.projectId, projectId), isNull(sharedStep.deletedAt)));
}

/**
 * Get a single shared step by ID
 */
export async function getSharedStep(sharedStepId: string) {
  const steps = await db
    .select({
      id: sharedStep.id,
      title: sharedStep.title,
      description: sharedStep.description,
      projectId: sharedStep.projectId,
      status: sharedStep.status,
      displayOrder: sharedStep.displayOrder,
      createdAt: sharedStep.createdAt,
      updatedAt: sharedStep.updatedAt,
    })
    .from(sharedStep)
    .where(and(eq(sharedStep.id, sharedStepId), isNull(sharedStep.deletedAt)))
    .limit(1);

  return steps[0] ?? null;
}

/**
 * Get all actions for a shared step, ordered by step_order
 */
export async function getSharedStepActions(sharedStepId: string) {
  return await db
    .select({
      id: sharedStepAction.id,
      sharedStepId: sharedStepAction.sharedStepId,
      stepOrder: sharedStepAction.stepOrder,
      action: sharedStepAction.action,
      data: sharedStepAction.data,
      expectedResult: sharedStepAction.expectedResult,
      createdAt: sharedStepAction.createdAt,
      updatedAt: sharedStepAction.updatedAt,
    })
    .from(sharedStepAction)
    .where(
      and(eq(sharedStepAction.sharedStepId, sharedStepId), isNull(sharedStepAction.deletedAt)),
    )
    .orderBy(asc(sharedStepAction.stepOrder));
}
