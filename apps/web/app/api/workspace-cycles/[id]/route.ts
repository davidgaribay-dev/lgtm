import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { workspaceCycle, organization, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";
import { logger } from "@/lib/logger";

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

  // Fetch workspace cycle
  const cycleData = await db
    .select({
      id: workspaceCycle.id,
      name: workspaceCycle.name,
      description: workspaceCycle.description,
      startDate: workspaceCycle.startDate,
      endDate: workspaceCycle.endDate,
      status: workspaceCycle.status,
      isCurrent: workspaceCycle.isCurrent,
      displayOrder: workspaceCycle.displayOrder,
      organizationId: workspaceCycle.organizationId,
      createdAt: workspaceCycle.createdAt,
      updatedAt: workspaceCycle.updatedAt,
    })
    .from(workspaceCycle)
    .where(and(eq(workspaceCycle.id, id), isNull(workspaceCycle.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!cycleData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Verify organization exists
  const org = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, cycleData.organizationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!org) {
    return NextResponse.json(
      { message: "Organization not found" },
      { status: 404 },
    );
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== cycleData.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check permission
    if (!hasTokenPermission(authContext, "workspaceCycle", "update")) {
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
          eq(member.organizationId, cycleData.organizationId),
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
  const {
    name,
    description,
    startDate,
    endDate,
    status: newStatus,
    isCurrent,
  } = body;

  if (newStatus !== undefined && !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { message: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate date logic
  const finalStartDate =
    startDate !== undefined ? startDate : cycleData.startDate;
  const finalEndDate = endDate !== undefined ? endDate : cycleData.endDate;

  if (
    finalStartDate &&
    finalEndDate &&
    new Date(finalStartDate) > new Date(finalEndDate)
  ) {
    return NextResponse.json(
      { message: "Start date must be before end date" },
      { status: 400 },
    );
  }

  // If name changed, check uniqueness
  const newName = name?.trim();
  if (newName && newName !== cycleData.name) {
    const existing = await db
      .select({ id: workspaceCycle.id })
      .from(workspaceCycle)
      .where(
        and(
          eq(workspaceCycle.organizationId, cycleData.organizationId),
          eq(workspaceCycle.name, newName),
          ne(workspaceCycle.id, id),
          isNull(workspaceCycle.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A workspace cycle with this name already exists" },
        { status: 409 },
      );
    }
  }

  // If setting as current, unset existing current
  if (isCurrent === true && !cycleData.isCurrent) {
    await db
      .update(workspaceCycle)
      .set({ isCurrent: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(workspaceCycle.organizationId, cycleData.organizationId),
          eq(workspaceCycle.isCurrent, true),
          isNull(workspaceCycle.deletedAt),
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
    .update(workspaceCycle)
    .set(updates)
    .where(eq(workspaceCycle.id, id))
    .returning();

  logger.info(
    {
      workspaceCycleId: id,
      organizationId: cycleData.organizationId,
      changes: Object.keys(updates).filter(k => k !== 'updatedBy'),
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Workspace cycle updated"
  );

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

  // Fetch workspace cycle
  const cycleData = await db
    .select({
      id: workspaceCycle.id,
      organizationId: workspaceCycle.organizationId,
    })
    .from(workspaceCycle)
    .where(and(eq(workspaceCycle.id, id), isNull(workspaceCycle.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!cycleData) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Verify organization exists
  const org = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, cycleData.organizationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!org) {
    return NextResponse.json(
      { message: "Organization not found" },
      { status: 404 },
    );
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== cycleData.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check permission
    if (!hasTokenPermission(authContext, "workspaceCycle", "delete")) {
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
          eq(member.organizationId, cycleData.organizationId),
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
    .update(workspaceCycle)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(workspaceCycle.id, id));

  logger.info(
    {
      workspaceCycleId: id,
      organizationId: cycleData.organizationId,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Workspace cycle deleted"
  );

  return NextResponse.json({ success: true });
}
