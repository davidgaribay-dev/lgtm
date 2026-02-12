import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { environment, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { ENVIRONMENT_TYPES as VALID_TYPES } from "@lgtm/shared";

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
    if (!hasTokenPermission(authContext, "environment", "read")) {
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

  const environments = await db
    .select({
      id: environment.id,
      name: environment.name,
      url: environment.url,
      description: environment.description,
      type: environment.type,
      isDefault: environment.isDefault,
      displayOrder: environment.displayOrder,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    })
    .from(environment)
    .where(
      and(
        eq(environment.projectId, projectId),
        isNull(environment.deletedAt),
      ),
    );

  return NextResponse.json(environments);
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    url,
    description,
    type = "custom",
    isDefault = false,
    projectId,
  } = body;

  if (!name?.trim() || !projectId) {
    return NextResponse.json(
      { message: "Name and project ID are required" },
      { status: 400 },
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { message: `Type must be one of: ${VALID_TYPES.join(", ")}` },
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
    if (!hasTokenPermission(authContext, "environment", "create")) {
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
    .select({ id: environment.id })
    .from(environment)
    .where(
      and(
        eq(environment.projectId, projectId),
        eq(environment.name, name.trim()),
        isNull(environment.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { message: "An environment with this name already exists" },
      { status: 409 },
    );
  }

  // Get the next display order
  const maxOrder = await db
    .select({ value: max(environment.displayOrder) })
    .from(environment)
    .where(
      and(
        eq(environment.projectId, projectId),
        isNull(environment.deletedAt),
      ),
    )
    .then((rows) => rows[0]?.value ?? -1);

  // If isDefault, unset existing default
  if (isDefault) {
    await db
      .update(environment)
      .set({ isDefault: false, updatedBy: authContext.userId })
      .where(
        and(
          eq(environment.projectId, projectId),
          eq(environment.isDefault, true),
          isNull(environment.deletedAt),
        ),
      );
  }

  const [created] = await db
    .insert(environment)
    .values({
      name: name.trim(),
      url: url?.trim() || null,
      description: description?.trim() || null,
      type,
      isDefault,
      displayOrder: (maxOrder ?? -1) + 1,
      projectId,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
