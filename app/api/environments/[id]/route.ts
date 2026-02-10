import { NextResponse } from "next/server";
import { eq, and, isNull, inArray, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { environment, project, member } from "@/db/schema";
import { headers } from "next/headers";

const VALID_TYPES = ["development", "staging", "qa", "production", "custom"];

async function getEnvironmentWithAuth(
  envId: string,
  userId: string,
  requireAdmin: boolean,
) {
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
    .where(and(eq(environment.id, envId), isNull(environment.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!env) return { error: "Not found", status: 404, env: null, proj: null };

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, env.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj)
    return { error: "Project not found", status: 404, env: null, proj: null };

  const roleFilter = requireAdmin
    ? inArray(member.role, ["owner", "admin"])
    : undefined;

  const conditions = [
    eq(member.organizationId, proj.organizationId),
    eq(member.userId, userId),
  ];
  if (roleFilter) conditions.push(roleFilter);

  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(and(...conditions))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership)
    return { error: "Forbidden", status: 403, env: null, proj: null };

  return { error: null, status: 200, env, proj };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error, status, env } = await getEnvironmentWithAuth(
    id,
    session.user.id,
    true,
  );

  if (error || !env) {
    return NextResponse.json({ message: error }, { status });
  }

  const body = await request.json();
  const { name, url, description, type, isDefault } = body;

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { message: `Type must be one of: ${VALID_TYPES.join(", ")}` },
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
        { message: "An environment with this name already exists" },
        { status: 409 },
      );
    }
  }

  // If setting as default, unset existing default
  if (isDefault === true && !env.isDefault) {
    await db
      .update(environment)
      .set({ isDefault: false, updatedBy: session.user.id })
      .where(
        and(
          eq(environment.projectId, env.projectId),
          eq(environment.isDefault, true),
          isNull(environment.deletedAt),
        ),
      );
  }

  const updates: Record<string, unknown> = {
    updatedBy: session.user.id,
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error, status } = await getEnvironmentWithAuth(
    id,
    session.user.id,
    true,
  );

  if (error) {
    return NextResponse.json({ message: error }, { status });
  }

  await db
    .update(environment)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(eq(environment.id, id));

  return NextResponse.json({ success: true });
}
