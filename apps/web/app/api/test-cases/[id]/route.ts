import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";
import {
  TEST_CASE_PRIORITIES as VALID_PRIORITIES,
  TEST_CASE_TYPES as VALID_TYPES,
  TEST_CASE_SEVERITIES as VALID_SEVERITIES,
  TEST_CASE_AUTOMATION_STATUSES as VALID_AUTOMATION_STATUSES,
  TEST_CASE_STATUSES as VALID_STATUSES,
  TEST_CASE_BEHAVIORS as VALID_BEHAVIORS,
  TEST_CASE_LAYERS as VALID_LAYERS,
} from "@lgtm/shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const {
    title, sectionId, projectId, description, preconditions, priority, type,
    severity, automationStatus, status, behavior, layer, isFlaky, postconditions, assigneeId,
  } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId, request);
  if (access instanceof NextResponse) return access;

  const { authContext } = access;
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check token permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json(
      { error: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}` },
      { status: 400 },
    );
  }

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (severity !== undefined && !VALID_SEVERITIES.includes(severity)) {
    return NextResponse.json(
      { error: `Severity must be one of: ${VALID_SEVERITIES.join(", ")}` },
      { status: 400 },
    );
  }

  if (automationStatus !== undefined && !VALID_AUTOMATION_STATUSES.includes(automationStatus)) {
    return NextResponse.json(
      { error: `Automation status must be one of: ${VALID_AUTOMATION_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  if (behavior !== undefined && !VALID_BEHAVIORS.includes(behavior)) {
    return NextResponse.json(
      { error: `Behavior must be one of: ${VALID_BEHAVIORS.join(", ")}` },
      { status: 400 },
    );
  }

  if (layer !== undefined && !VALID_LAYERS.includes(layer)) {
    return NextResponse.json(
      { error: `Layer must be one of: ${VALID_LAYERS.join(", ")}` },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {
    updatedBy: authContext.userId,
  };
  if (title?.trim()) updates.title = title.trim();
  if (sectionId !== undefined) updates.sectionId = sectionId || null;
  if (description !== undefined) updates.description = description?.trim() || null;
  if (preconditions !== undefined) updates.preconditions = preconditions?.trim() || null;
  if (postconditions !== undefined) updates.postconditions = postconditions?.trim() || null;
  if (priority !== undefined) updates.priority = priority;
  if (type !== undefined) updates.type = type;
  if (severity !== undefined) updates.severity = severity;
  if (automationStatus !== undefined) updates.automationStatus = automationStatus;
  if (status !== undefined) updates.status = status;
  if (behavior !== undefined) updates.behavior = behavior;
  if (layer !== undefined) updates.layer = layer;
  if (isFlaky !== undefined) updates.isFlaky = isFlaky;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;

  const [updated] = await db
    .update(testCase)
    .set(updates)
    .where(
      and(
        eq(testCase.id, id),
        eq(testCase.projectId, projectId),
        isNull(testCase.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const access = await verifyProjectAccess(projectId, request);
  if (access instanceof NextResponse) return access;

  const { authContext } = access;
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check token permissions
  if (authContext.type === "api_token") {
    if (!hasTokenPermission(authContext, "testCase", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  const [deleted] = await db
    .update(testCase)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(
      and(
        eq(testCase.id, id),
        eq(testCase.projectId, projectId),
        isNull(testCase.deletedAt),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
