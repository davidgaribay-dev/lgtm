import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { testResult, testRun, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { computeRunStatus } from "@/lib/queries/test-runs";
import { TEST_RESULT_STATUSES as VALID_STATUSES } from "@lgtm/shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get existing result with run info
  const existing = await db
    .select({
      id: testResult.id,
      testRunId: testResult.testRunId,
      status: testResult.status,
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

  // Verify access
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

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.status = body.status;

    // Auto-set executedBy and executedAt when status changes from "untested"
    if (existing.status === "untested" && body.status !== "untested") {
      if (!updates.executedBy) {
        updates.executedBy = authContext.userId;
      }
      if (!updates.executedAt) {
        updates.executedAt = new Date();
      }
    }
  }

  if (body.comment !== undefined) {
    updates.comment = body.comment?.trim() || null;
  }
  if (body.duration !== undefined) {
    updates.duration = body.duration;
  }
  if (body.executedBy !== undefined) {
    updates.executedBy = body.executedBy;
  }
  if (body.executedAt !== undefined) {
    updates.executedAt = body.executedAt ? new Date(body.executedAt) : null;
  }
  if (body.source !== undefined) {
    updates.source = body.source;
  }

  const [updated] = await db
    .update(testResult)
    .set(updates)
    .where(eq(testResult.id, id))
    .returning();

  // Compute suggested run status after result update
  const suggestedRunStatus = await computeRunStatus(existing.testRunId);

  return NextResponse.json({ ...updated, suggestedRunStatus });
}
