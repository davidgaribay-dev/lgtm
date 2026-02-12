import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testPlan, testPlanCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getTestPlanCases } from "@/lib/queries/test-plans";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await db
    .select({ id: testPlan.id })
    .from(testPlan)
    .where(and(eq(testPlan.id, id), isNull(testPlan.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!plan) {
    return NextResponse.json(
      { error: "Test plan not found" },
      { status: 404 },
    );
  }

  const cases = await getTestPlanCases(id);
  return NextResponse.json(cases);
}

/** PUT — Replace the entire case list for a test plan. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db
    .select({
      id: testPlan.id,
      projectId: testPlan.projectId,
    })
    .from(testPlan)
    .where(and(eq(testPlan.id, id), isNull(testPlan.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existing) {
    return NextResponse.json(
      { error: "Test plan not found" },
      { status: 404 },
    );
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, existing.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (authContext.type === "api_token") {
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasProjectAccess(authContext, existing.projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }
    if (!hasTokenPermission(authContext, "testPlan", "create")) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { testCaseIds } = body;

  if (!testCaseIds || !Array.isArray(testCaseIds)) {
    return NextResponse.json(
      { error: "testCaseIds array is required" },
      { status: 400 },
    );
  }

  // Delete existing and re-insert
  await db
    .delete(testPlanCase)
    .where(eq(testPlanCase.testPlanId, id));

  if (testCaseIds.length > 0) {
    const values = testCaseIds.map((testCaseId: string, i: number) => ({
      testPlanId: id,
      testCaseId,
      displayOrder: i,
    }));
    await db.insert(testPlanCase).values(values);
  }

  // Update plan timestamp
  await db
    .update(testPlan)
    .set({
      updatedAt: new Date(),
      updatedBy: authContext.userId,
    })
    .where(eq(testPlan.id, id));

  const updated = await getTestPlanCases(id);
  return NextResponse.json(updated);
}
