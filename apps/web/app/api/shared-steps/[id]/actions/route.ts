import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { sharedStepAction, sharedStep, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

/**
 * POST /api/shared-steps/[id]/actions - Add an action to a shared step
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sharedStepId } = await params;

  // Get shared step to verify access
  const [stepData] = await db
    .select({
      id: sharedStep.id,
      projectId: sharedStep.projectId,
    })
    .from(sharedStep)
    .where(and(eq(sharedStep.id, sharedStepId), isNull(sharedStep.deletedAt)))
    .limit(1);

  if (!stepData) {
    return NextResponse.json({ error: "Shared step not found" }, { status: 404 });
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
  const { action, data, expectedResult } = body;

  if (!action || typeof action !== "string" || !action.trim()) {
    return NextResponse.json(
      { error: "Action is required" },
      { status: 400 },
    );
  }

  // Get max step order
  const maxOrderResult = await db
    .select({ maxOrder: max(sharedStepAction.stepOrder) })
    .from(sharedStepAction)
    .where(
      and(eq(sharedStepAction.sharedStepId, sharedStepId), isNull(sharedStepAction.deletedAt)),
    );

  const maxOrder = maxOrderResult[0]?.maxOrder ?? -1;

  const [created] = await db
    .insert(sharedStepAction)
    .values({
      sharedStepId,
      stepOrder: maxOrder + 1,
      action: action.trim(),
      data: data?.trim() || null,
      expectedResult: expectedResult?.trim() || null,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
