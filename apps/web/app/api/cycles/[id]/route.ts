import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { cycle, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

const VALID_STATUSES = ["planned", "active", "completed"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch cycle
  const cycleData = await db
    .select({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      isCurrent: cycle.isCurrent,
      displayOrder: cycle.displayOrder,
      projectId: cycle.projectId,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    })
    .from(cycle)
    .where(and(eq(cycle.id, id), isNull(cycle.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!cycleData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Get project to verify ownership
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, cycleData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json(
      { message: "Project not found" },
      { status: 404 },
    );
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope
    if (!hasProjectAccess(authContext, cycleData.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "cycle", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify user has admin/owner role
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
  const { name, description, startDate, endDate, status: newStatus, isCurrent } = body;

  if (newStatus !== undefined && !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { message: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate date logic
  const finalStartDate = startDate !== undefined ? startDate : cycleData.startDate;
  const finalEndDate = endDate !== undefined ? endDate : cycleData.endDate;

  if (finalStartDate && finalEndDate && new Date(finalStartDate) > new Date(finalEndDate)) {
    return NextResponse.json(
      { message: "Start date must be before end date" },
      { status: 400 },
    );
  }

  // If name changed, check uniqueness
  const newName = name?.trim();
  if (newName && newName !== cycleData.name) {
    const existing = await db
      .select({ id: cycle.id })
      .from(cycle)
      .where(
        and(
          eq(cycle.projectId, cycleData.projectId),
          eq(cycle.name, newName),
          ne(cycle.id, id),
          isNull(cycle.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A cycle with this name already exists" },
        { status: 409 },
      );
    }
  }

  // If setting as current, unset existing current
  if (isCurrent === true && !cycleData.isCurrent) {
    await db
      .update(cycle)
      .set({ isCurrent: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(cycle.projectId, cycleData.projectId),
          eq(cycle.isCurrent, true),
          isNull(cycle.deletedAt),
        ),
      );
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };
  if (newName) updates.name = newName;
  if (description !== undefined)
    updates.description = description?.trim() || null;
  if (startDate !== undefined)
    updates.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined)
    updates.endDate = endDate ? new Date(endDate) : null;
  if (newStatus !== undefined) updates.status = newStatus;
  if (isCurrent !== undefined) updates.isCurrent = isCurrent;

  const [updated] = await db
    .update(cycle)
    .set(updates)
    .where(eq(cycle.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch cycle
  const cycleData = await db
    .select({
      id: cycle.id,
      projectId: cycle.projectId,
    })
    .from(cycle)
    .where(and(eq(cycle.id, id), isNull(cycle.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!cycleData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Get project to verify ownership
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, cycleData.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json(
      { message: "Project not found" },
      { status: 404 },
    );
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope
    if (!hasProjectAccess(authContext, cycleData.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "cycle", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify user has admin/owner role
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
    .update(cycle)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(cycle.id, id));

  return NextResponse.json({ success: true });
}
