import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { defect, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getDefect } from "@/lib/queries/defects";

const VALID_STATUSES = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
  "reopened",
  "deferred",
  "rejected",
  "duplicate",
];

const VALID_RESOLUTIONS = [
  null,
  "fixed",
  "wont_fix",
  "duplicate",
  "cannot_reproduce",
  "by_design",
  "deferred",
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

  const d = await getDefect(id);
  if (!d) {
    return NextResponse.json({ error: "Defect not found" }, { status: 404 });
  }

  return NextResponse.json(d);
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

  const existing = await db
    .select({
      id: defect.id,
      projectId: defect.projectId,
      status: defect.status,
    })
    .from(defect)
    .where(and(eq(defect.id, id), isNull(defect.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json({ error: "Defect not found" }, { status: 404 });
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
    if (!hasTokenPermission(authContext, "defect", "update")) {
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

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined)
    updates.description = body.description?.trim() || null;
  if (body.severity !== undefined) updates.severity = body.severity;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.defectType !== undefined) updates.defectType = body.defectType;
  if (body.assigneeId !== undefined)
    updates.assigneeId = body.assigneeId || null;
  if (body.stepsToReproduce !== undefined)
    updates.stepsToReproduce = body.stepsToReproduce?.trim() || null;
  if (body.expectedResult !== undefined)
    updates.expectedResult = body.expectedResult?.trim() || null;
  if (body.actualResult !== undefined)
    updates.actualResult = body.actualResult?.trim() || null;
  if (body.externalUrl !== undefined)
    updates.externalUrl = body.externalUrl?.trim() || null;
  if (body.environmentId !== undefined)
    updates.environmentId = body.environmentId || null;
  if (body.cycleId !== undefined) updates.cycleId = body.cycleId || null;
  if (body.workspaceCycleId !== undefined)
    updates.workspaceCycleId = body.workspaceCycleId || null;

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.status = body.status;
  }

  if (body.resolution !== undefined) {
    if (!VALID_RESOLUTIONS.includes(body.resolution)) {
      return NextResponse.json(
        {
          error: `Resolution must be one of: ${VALID_RESOLUTIONS.filter(Boolean).join(", ")}`,
        },
        { status: 400 },
      );
    }
    updates.resolution = body.resolution;
  }

  const [updated] = await db
    .update(defect)
    .set(updates)
    .where(eq(defect.id, id))
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
      id: defect.id,
      projectId: defect.projectId,
    })
    .from(defect)
    .where(and(eq(defect.id, id), isNull(defect.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json({ error: "Defect not found" }, { status: 404 });
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
    if (!hasTokenPermission(authContext, "defect", "delete")) {
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
    .update(defect)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
    })
    .where(eq(defect.id, id));

  return NextResponse.json({ success: true });
}
