import { db } from "@/db";
import { testRunLog } from "@/db/schema";
import { eq, and, isNull, asc, sql, max } from "drizzle-orm";

/** Get all log chunks for a test run (run-level only, where testResultId is NULL). */
export async function getRunLogs(testRunId: string) {
  return db
    .select({
      id: testRunLog.id,
      stepName: testRunLog.stepName,
      chunkIndex: testRunLog.chunkIndex,
      content: testRunLog.content,
      lineOffset: testRunLog.lineOffset,
      lineCount: testRunLog.lineCount,
      createdAt: testRunLog.createdAt,
    })
    .from(testRunLog)
    .where(
      and(
        eq(testRunLog.testRunId, testRunId),
        isNull(testRunLog.testResultId),
      ),
    )
    .orderBy(asc(testRunLog.chunkIndex));
}

/** Get all log chunks for a specific test result. */
export async function getResultLogs(testResultId: string) {
  return db
    .select({
      id: testRunLog.id,
      stepName: testRunLog.stepName,
      chunkIndex: testRunLog.chunkIndex,
      content: testRunLog.content,
      lineOffset: testRunLog.lineOffset,
      lineCount: testRunLog.lineCount,
      createdAt: testRunLog.createdAt,
    })
    .from(testRunLog)
    .where(eq(testRunLog.testResultId, testResultId))
    .orderBy(asc(testRunLog.chunkIndex));
}

/** Check if a run has any logs (for tab badge display). */
export async function hasRunLogs(testRunId: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testRunLog)
    .where(eq(testRunLog.testRunId, testRunId))
    .limit(1);
  return (row?.count ?? 0) > 0;
}

/** Check if a result has any logs. */
export async function hasResultLogs(testResultId: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testRunLog)
    .where(eq(testRunLog.testResultId, testResultId))
    .limit(1);
  return (row?.count ?? 0) > 0;
}

/** Get the next chunk index and line offset for appending a new chunk. */
export async function getNextChunkMeta(
  testRunId: string,
  testResultId: string | null,
): Promise<{ chunkIndex: number; lineOffset: number }> {
  const condition = testResultId
    ? and(
        eq(testRunLog.testRunId, testRunId),
        eq(testRunLog.testResultId, testResultId),
      )
    : and(
        eq(testRunLog.testRunId, testRunId),
        isNull(testRunLog.testResultId),
      );

  const [row] = await db
    .select({
      maxIndex: max(testRunLog.chunkIndex),
      nextLineOffset: sql<number>`coalesce(max(${testRunLog.lineOffset} + ${testRunLog.lineCount}), 0)::int`,
    })
    .from(testRunLog)
    .where(condition);

  return {
    chunkIndex: (row?.maxIndex != null ? row.maxIndex + 1 : 0),
    lineOffset: row?.nextLineOffset ?? 0,
  };
}
