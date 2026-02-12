import { db } from "@/db";
import {
  comment,
  commentReaction,
  commentMention,
  testCase,
  testResult,
  testRun,
  user,
} from "@/db/schema";
import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";

/** Fetch all active comments for an entity, ordered by creation time. */
export async function getEntityComments(
  entityType: string,
  entityId: string,
) {
  return db
    .select({
      id: comment.id,
      entityType: comment.entityType,
      entityId: comment.entityId,
      projectId: comment.projectId,
      parentId: comment.parentId,
      body: comment.body,
      editedAt: comment.editedAt,
      resolvedAt: comment.resolvedAt,
      resolvedBy: comment.resolvedBy,
      createdAt: comment.createdAt,
      createdBy: comment.createdBy,
      updatedAt: comment.updatedAt,
    })
    .from(comment)
    .where(
      and(
        eq(comment.entityType, entityType),
        eq(comment.entityId, entityId),
        isNull(comment.deletedAt),
      ),
    )
    .orderBy(asc(comment.createdAt));
}

/** Fetch a single comment by ID (active only). */
export async function getCommentById(commentId: string) {
  return db
    .select({
      id: comment.id,
      entityType: comment.entityType,
      entityId: comment.entityId,
      projectId: comment.projectId,
      parentId: comment.parentId,
      body: comment.body,
      editedAt: comment.editedAt,
      resolvedAt: comment.resolvedAt,
      resolvedBy: comment.resolvedBy,
      createdAt: comment.createdAt,
      createdBy: comment.createdBy,
      updatedAt: comment.updatedAt,
    })
    .from(comment)
    .where(and(eq(comment.id, commentId), isNull(comment.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/** Fetch reactions for a set of comment IDs. */
export async function getCommentReactions(commentIds: string[]) {
  if (commentIds.length === 0) return [];
  return db
    .select({
      id: commentReaction.id,
      commentId: commentReaction.commentId,
      userId: commentReaction.userId,
      emoji: commentReaction.emoji,
    })
    .from(commentReaction)
    .where(inArray(commentReaction.commentId, commentIds));
}

/** Fetch mentions for a set of comment IDs. */
export async function getCommentMentions(commentIds: string[]) {
  if (commentIds.length === 0) return [];
  return db
    .select({
      id: commentMention.id,
      commentId: commentMention.commentId,
      userId: commentMention.userId,
    })
    .from(commentMention)
    .where(inArray(commentMention.commentId, commentIds));
}

/** Fetch user info for a set of user IDs. */
export async function getCommentUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(inArray(user.id, userIds));
}

/** Get comment count for an entity. */
export async function getCommentCount(
  entityType: string,
  entityId: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comment)
    .where(
      and(
        eq(comment.entityType, entityType),
        eq(comment.entityId, entityId),
        isNull(comment.deletedAt),
      ),
    );
  return result[0]?.count ?? 0;
}

/**
 * Resolve projectId from an entity (test_case or test_result).
 * Returns null if the entity does not exist.
 */
export async function resolveProjectId(
  entityType: string,
  entityId: string,
): Promise<string | null> {
  if (entityType === "test_case") {
    const row = await db
      .select({ projectId: testCase.projectId })
      .from(testCase)
      .where(and(eq(testCase.id, entityId), isNull(testCase.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    return row?.projectId ?? null;
  }
  if (entityType === "test_result") {
    const row = await db
      .select({ projectId: testRun.projectId })
      .from(testResult)
      .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
      .where(eq(testResult.id, entityId))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    return row?.projectId ?? null;
  }
  return null;
}
