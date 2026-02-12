import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { cycle, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { CYCLE_STATUSES as VALID_STATUSES } from "@lgtm/shared";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { message: "projectId is required" },
      { status: 400 },
    );
  }

  // Verify user/token has access to the project
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
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

    // Check project scope (organization tokens bypass this)
    if (!hasProjectAccess(authContext, projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "cycle", "read")) {
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

  const cycles = await db
    .select({
      id: cycle.id,
      name: cycle.name,
      description: cycle.description,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      isCurrent: cycle.isCurrent,
      displayOrder: cycle.displayOrder,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        isNull(cycle.deletedAt),
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
    projectId,
  } = body;

  if (!name?.trim() || !projectId) {
    return NextResponse.json(
      { message: "Name and project ID are required" },
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

  // Get the project and verify ownership
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
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

    // Check project scope (organization tokens bypass this)
    if (!hasProjectAccess(authContext, projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "cycle", "create")) {
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

  // Check name uniqueness within project
  const existing = await db
    .select({ id: cycle.id })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        eq(cycle.name, name.trim()),
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

  // Get the next display order
  const maxOrder = await db
    .select({ value: max(cycle.displayOrder) })
    .from(cycle)
    .where(
      and(
        eq(cycle.projectId, projectId),
        isNull(cycle.deletedAt),
      ),
    )
    .then((rows) => rows[0]?.value ?? -1);

  // If isCurrent, unset existing current
  if (isCurrent) {
    await db
      .update(cycle)
      .set({ isCurrent: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(cycle.projectId, projectId),
          eq(cycle.isCurrent, true),
          isNull(cycle.deletedAt),
        ),
      );
  }

  const [created] = await db
    .insert(cycle)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      isCurrent,
      displayOrder: (maxOrder ?? -1) + 1,
      projectId,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
