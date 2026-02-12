import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  testResult,
  testRun,
  testRunLog,
  project,
  member,
} from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getResultLogs, getNextChunkMeta } from "@/lib/queries/test-run-logs";

const MAX_CHUNK_SIZE = 65536; // 64KB

/** GET — Log chunks for a specific test result. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify test result exists and get project info
  const existing = await db
    .select({
      id: testResult.id,
      testRunId: testResult.testRunId,
      projectId: testRun.projectId,
    })
    .from(testResult)
    .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
    .where(eq(testResult.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test result not found" },
      { status: 404 },
    );
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, existing.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, existing.projectId)) {
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

  const logs = await getResultLogs(id);
  return NextResponse.json(logs);
}

/** POST — Append a log chunk scoped to a test result. */
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
  const { content, step } = body;

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

  // Verify test result exists and get run/project info
  const existing = await db
    .select({
      id: testResult.id,
      testRunId: testResult.testRunId,
      projectId: testRun.projectId,
    })
    .from(testResult)
    .innerJoin(testRun, eq(testResult.testRunId, testRun.id))
    .where(eq(testResult.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test result not found" },
      { status: 404 },
    );
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, existing.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, existing.projectId)) {
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

  const lineCount = content.split("\n").length;
  const { chunkIndex, lineOffset } = await getNextChunkMeta(
    existing.testRunId,
    id,
  );

  const [created] = await db
    .insert(testRunLog)
    .values({
      testRunId: existing.testRunId,
      testResultId: id,
      stepName: step?.trim() || null,
      chunkIndex,
      content,
      lineOffset,
      lineCount,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
