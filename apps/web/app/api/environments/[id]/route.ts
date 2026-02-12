import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { environment, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { ENVIRONMENT_TYPES as VALID_TYPES } from "@lgtm/shared";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get environment
  const env = await db
    .select({
      id: environment.id,
      name: environment.name,
      url: environment.url,
      description: environment.description,
      type: environment.type,
      isDefault: environment.isDefault,
      displayOrder: environment.displayOrder,
      projectId: environment.projectId,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    })
    .from(environment)
    .where(and(eq(environment.id, id), isNull(environment.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!env) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get project org
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, env.projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope
    if (!hasProjectAccess(authContext, env.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "environment", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify membership with admin/owner role
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

  const body = await request.json();
  const { name, url, description, type, isDefault } = body;

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // If name changed, check uniqueness
  const newName = name?.trim();
  if (newName && newName !== env.name) {
    const existing = await db
      .select({ id: environment.id })
      .from(environment)
      .where(
        and(
          eq(environment.projectId, env.projectId),
          eq(environment.name, newName),
          ne(environment.id, id),
          isNull(environment.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An environment with this name already exists" },
        { status: 409 },
      );
    }
  }

  // If setting as default, unset existing default
  if (isDefault === true && !env.isDefault) {
    await db
      .update(environment)
      .set({ isDefault: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(environment.projectId, env.projectId),
          eq(environment.isDefault, true),
          isNull(environment.deletedAt),
        ),
      );
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };
  if (newName) updates.name = newName;
  if (url !== undefined) updates.url = url?.trim() || null;
  if (description !== undefined)
    updates.description = description?.trim() || null;
  if (type !== undefined) updates.type = type;
  if (isDefault !== undefined) updates.isDefault = isDefault;

  const [updated] = await db
    .update(environment)
    .set(updates)
    .where(eq(environment.id, id))
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

  // Get environment
  const env = await db
    .select({
      id: environment.id,
      projectId: environment.projectId,
    })
    .from(environment)
    .where(and(eq(environment.id, id), isNull(environment.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!env) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get project org
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, env.projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope
    if (!hasProjectAccess(authContext, env.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission
    if (!hasTokenPermission(authContext, "environment", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify membership with admin/owner role
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
    .update(environment)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(eq(environment.id, id));

  return NextResponse.json({ success: true });
}
