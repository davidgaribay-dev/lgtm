import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { testCase, testStep, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get org from project
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
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
    if (!hasProjectAccess(authContext, projectId)) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    // Check permission (cloning requires create permission)
    if (!hasTokenPermission(authContext, "testCase", "create")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // For session auth, verify membership with member+ role
    const membership = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, proj.organizationId),
          eq(member.userId, authContext.userId),
          inArray(member.role, ["owner", "admin", "member"]),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Read source test case
  const source = await db
    .select()
    .from(testCase)
    .where(
      and(
        eq(testCase.id, id),
        eq(testCase.projectId, projectId),
        isNull(testCase.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Read source test steps
  const steps = await db
    .select()
    .from(testStep)
    .where(and(eq(testStep.testCaseId, id), isNull(testStep.deletedAt)))
    .orderBy(asc(testStep.stepOrder));

  const userId = authContext.userId;

  // Insert cloned test case
  const [cloned] = await db
    .insert(testCase)
    .values({
      title: `${source.title} (copy)`,
      description: source.description,
      preconditions: source.preconditions,
      type: source.type,
      priority: source.priority,
      status: source.status,
      templateType: source.templateType,
      sectionId: source.sectionId,
      projectId: source.projectId,
      displayOrder: source.displayOrder + 1,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  // Clone test steps
  if (steps.length > 0) {
    await db.insert(testStep).values(
      steps.map((s) => ({
        testCaseId: cloned.id,
        stepOrder: s.stepOrder,
        action: s.action,
        expectedResult: s.expectedResult,
        createdBy: userId,
        updatedBy: userId,
      })),
    );
  }

  return NextResponse.json(cloned, { status: 201 });
}
