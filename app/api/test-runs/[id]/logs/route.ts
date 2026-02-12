import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testRun, testResult, testRunLog, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getRunLogs, getNextChunkMeta } from "@/lib/queries/test-run-logs";

const MAX_CHUNK_SIZE = 65536; // 64KB

/** GET — All run-level log chunks for a test run. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await db
    .select({ id: testRun.id, projectId: testRun.projectId })
    .from(testRun)
    .where(and(eq(testRun.id, id), isNull(testRun.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!run) {
    return NextResponse.json({ error: "Test run not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, run.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, run.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "testRun", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const logs = await getRunLogs(id);
  return NextResponse.json(logs);
}

/** POST — Append a log chunk to a test run. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, step, testResultId } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  if (content.length > MAX_CHUNK_SIZE) {
    return NextResponse.json(
      { error: `content exceeds maximum size of ${MAX_CHUNK_SIZE} bytes` },
      { status: 413 },
    );
  }

  const run = await db
    .select({ id: testRun.id, projectId: testRun.projectId })
    .from(testRun)
    .where(and(eq(testRun.id, id), isNull(testRun.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!run) {
    return NextResponse.json({ error: "Test run not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, run.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, run.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "testRun", "execute")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // If testResultId provided, verify it belongs to this run
  if (testResultId) {
    const result = await db
      .select({ id: testResult.id })
      .from(testResult)
      .where(
        and(
          eq(testResult.id, testResultId),
          eq(testResult.testRunId, id),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!result) {
      return NextResponse.json(
        { error: "Test result not found in this run" },
        { status: 404 },
      );
    }
  }

  const lineCount = content.split("\n").length;
  const { chunkIndex, lineOffset } = await getNextChunkMeta(
    id,
    testResultId ?? null,
  );

  const [created] = await db
    .insert(testRunLog)
    .values({
      testRunId: id,
      testResultId: testResultId ?? null,
      stepName: step?.trim() || null,
      chunkIndex,
      content,
      lineOffset,
      lineCount,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
