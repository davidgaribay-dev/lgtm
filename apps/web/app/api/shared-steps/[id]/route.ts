import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { sharedStep, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getSharedStep, getSharedStepActions } from "@/lib/queries/shared-steps";
import { SHARED_STEP_STATUSES as VALID_STATUSES } from "@lgtm/shared";

/**
 * GET /api/shared-steps/[id] - Get a shared step with its actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const step = await getSharedStep(id);
  if (!step) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, step.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, step.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "sharedStep", "read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const actions = await getSharedStepActions(id);

  return NextResponse.json({ ...step, actions });
}

/**
 * PUT /api/shared-steps/[id] - Update a shared step
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const stepData = await getSharedStep(id);
  if (!stepData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, stepData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, stepData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "sharedStep", "update")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { title, description, status: newStatus } = body;

  if (newStatus !== undefined && !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { message: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Check title uniqueness if changed
  const newTitle = title?.trim();
  if (newTitle && newTitle !== stepData.title) {
    const existing = await db
      .select({ id: sharedStep.id })
      .from(sharedStep)
      .where(
        and(
          eq(sharedStep.projectId, stepData.projectId),
          eq(sharedStep.title, newTitle),
          ne(sharedStep.id, id),
          isNull(sharedStep.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A shared step with this title already exists" },
        { status: 409 },
      );
    }
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };
  if (newTitle) updates.title = newTitle;
  if (description !== undefined) updates.description = description?.trim() || null;
  if (newStatus !== undefined) updates.status = newStatus;

  const [updated] = await db
    .update(sharedStep)
    .set(updates)
    .where(eq(sharedStep.id, id))
    .returning();

  return NextResponse.json(updated);
}

/**
 * DELETE /api/shared-steps/[id] - Delete a shared step (soft)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const stepData = await getSharedStep(id);
  if (!stepData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, stepData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, stepData.projectId)) {
      return NextResponse.json({ error: "Forbidden - project scope" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "sharedStep", "delete")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  await db
    .update(sharedStep)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(sharedStep.id, id));

  return NextResponse.json({ success: true });
}
