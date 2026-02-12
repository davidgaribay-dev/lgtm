import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { testRun, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getTestRun, getTestRunResults, getRunMetrics } from "@/lib/queries/test-runs";

const VALID_STATUSES = [
  "pending",
  "in_progress",
  "passed",
  "failed",
  "blocked",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await getTestRun(id);
  if (!run) {
    return NextResponse.json({ error: "Test run not found" }, { status: 404 });
  }

  const [results, metrics] = await Promise.all([
    getTestRunResults(id),
    getRunMetrics(id),
  ]);

  return NextResponse.json({ ...run, results, metrics });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get existing run
  const existing = await db
    .select({
      id: testRun.id,
      projectId: testRun.projectId,
      status: testRun.status,
    })
    .from(testRun)
    .where(and(eq(testRun.id, id), isNull(testRun.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json({ error: "Test run not found" }, { status: 404 });
  }

  // Verify project access
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
    if (!hasTokenPermission(authContext, "testRun", "create")) {
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
    updatedBy: authContext.userId,
  };

  if (body.name !== undefined) {
    updates.name = body.name.trim();
  }
  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.status = body.status;

    // Auto-set timestamps on status transitions
    if (body.status === "in_progress" && existing.status === "pending") {
      updates.startedAt = new Date();
    }
    if (
      ["passed", "failed", "blocked"].includes(body.status) &&
      !["passed", "failed", "blocked"].includes(existing.status)
    ) {
      updates.completedAt = new Date();
    }
  }

  const [updated] = await db
    .update(testRun)
    .set(updates)
    .where(eq(testRun.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db
    .select({
      id: testRun.id,
      projectId: testRun.projectId,
    })
    .from(testRun)
    .where(and(eq(testRun.id, id), isNull(testRun.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json({ error: "Test run not found" }, { status: 404 });
  }

  // Verify project access
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
    if (!hasTokenPermission(authContext, "testRun", "delete")) {
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
          inArray(member.role, ["owner", "admin"]),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db
    .update(testRun)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
    })
    .where(eq(testRun.id, id));

  return NextResponse.json({ success: true });
}
