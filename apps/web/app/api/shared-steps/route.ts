import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { sharedStep, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getProjectSharedSteps } from "@/lib/queries/shared-steps";
import { SHARED_STEP_STATUSES as VALID_STATUSES } from "@lgtm/shared";

/**
 * GET /api/shared-steps?projectId=xxx - List shared steps for a project
 */
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

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "sharedStep", "read")) {
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const steps = await getProjectSharedSteps(projectId);

  return NextResponse.json(steps);
}

/**
 * POST /api/shared-steps - Create a new shared step
 */
export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, status = "active", projectId } = body;

  if (!title?.trim() || !projectId) {
    return NextResponse.json(
      { message: "Title and project ID are required" },
      { status: 400 },
    );
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { message: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

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

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "sharedStep", "create")) {
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
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  // Check name uniqueness
  const existing = await db
    .select({ id: sharedStep.id })
    .from(sharedStep)
    .where(
      and(
        eq(sharedStep.projectId, projectId),
        eq(sharedStep.title, title.trim()),
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

  const maxOrder = await db
    .select({ value: max(sharedStep.displayOrder) })
    .from(sharedStep)
    .where(
      and(
        eq(sharedStep.projectId, projectId),
        isNull(sharedStep.deletedAt),
      ),
    )
    .then((rows) => rows[0]?.value ?? -1);

  const [created] = await db
    .insert(sharedStep)
    .values({
      title: title.trim(),
      description: description?.trim() || null,
      status,
      displayOrder: (maxOrder ?? -1) + 1,
      projectId,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
