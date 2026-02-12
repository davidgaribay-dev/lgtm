import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { workspaceCycle, organization, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";
import { logger } from "@/lib/logger";

const VALID_STATUSES = ["planned", "active", "completed"];

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { message: "organizationId is required" },
      { status: 400 },
    );
  }

  // Verify organization exists
  const org = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
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
    if (authContext.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check permission (workspace cycles require workspaceCycle:read)
    if (!hasTokenPermission(authContext, "workspaceCycle", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify membership
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, authContext.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const cycles = await db
    .select({
      id: workspaceCycle.id,
      name: workspaceCycle.name,
      description: workspaceCycle.description,
      startDate: workspaceCycle.startDate,
      endDate: workspaceCycle.endDate,
      status: workspaceCycle.status,
      isCurrent: workspaceCycle.isCurrent,
      displayOrder: workspaceCycle.displayOrder,
      createdAt: workspaceCycle.createdAt,
      updatedAt: workspaceCycle.updatedAt,
    })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        isNull(workspaceCycle.deletedAt),
      ),
    );

  return NextResponse.json(cycles);
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    description,
    startDate,
    endDate,
    status = "planned",
    isCurrent = false,
    organizationId,
  } = body;

  if (!name?.trim() || !organizationId) {
    return NextResponse.json(
      { message: "Name and organization ID are required" },
      { status: 400 },
    );
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { message: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate date logic
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return NextResponse.json(
      { message: "Start date must be before end date" },
      { status: 400 },
    );
  }

  // Verify organization exists
  const org = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId))
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
    if (authContext.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check permission
    if (!hasTokenPermission(authContext, "workspaceCycle", "create")) {
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
          eq(member.organizationId, organizationId),
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

  // Check name uniqueness within organization
  const existing = await db
    .select({ id: workspaceCycle.id })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        eq(workspaceCycle.name, name.trim()),
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

  // Get the next display order
  const maxOrder = await db
    .select({ value: max(workspaceCycle.displayOrder) })
    .from(workspaceCycle)
    .where(
      and(
        eq(workspaceCycle.organizationId, organizationId),
        isNull(workspaceCycle.deletedAt),
      ),
    )
    .then((rows) => rows[0]?.value ?? -1);

  // If isCurrent, unset existing current at organization level
  if (isCurrent) {
    await db
      .update(workspaceCycle)
      .set({ isCurrent: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(workspaceCycle.organizationId, organizationId),
          eq(workspaceCycle.isCurrent, true),
          isNull(workspaceCycle.deletedAt),
        ),
      );
  }

  const [created] = await db
    .insert(workspaceCycle)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      isCurrent,
      displayOrder: (maxOrder ?? -1) + 1,
      organizationId,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  logger.info(
    {
      workspaceCycleId: created.id,
      organizationId,
      name: created.name,
      status: created.status,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Workspace cycle created"
  );

  return NextResponse.json(created, { status: 201 });
}
