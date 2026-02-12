import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { defect, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getProjectDefects } from "@/lib/queries/defects";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
    if (!hasTokenPermission(authContext, "defect", "read")) {
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

  const defects = await getProjectDefects(projectId);
  return NextResponse.json(defects);
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    projectId,
    severity,
    priority,
    defectType,
    assigneeId,
    stepsToReproduce,
    expectedResult,
    actualResult,
    testResultId,
    testRunId,
    testCaseId,
    externalUrl,
    environmentId,
    cycleId,
    workspaceCycleId,
  } = body;

  if (!title?.trim() || !projectId) {
    return NextResponse.json(
      { error: "Title and project ID are required" },
      { status: 400 },
    );
  }

  const proj = await db
    .select({
      organizationId: project.organizationId,
      key: project.key,
    })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
    if (!hasTokenPermission(authContext, "defect", "create")) {
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
          inArray(member.role, ["owner", "admin", "member"]),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Atomically increment defect counter
  const [team] = await db
    .update(project)
    .set({
      nextDefectNumber: sql`${project.nextDefectNumber} + 1`,
      updatedAt: new Date(),
      updatedBy: authContext.userId,
    })
    .where(eq(project.id, projectId))
    .returning({
      nextDefectNumber: project.nextDefectNumber,
      key: project.key,
    });

  if (!team) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const defectNumber = team.nextDefectNumber;
  const defectKey = `${team.key}-D-${defectNumber}`;

  const [created] = await db
    .insert(defect)
    .values({
      title: title.trim(),
      description: description?.trim() || null,
      defectNumber,
      defectKey,
      severity: severity || "normal",
      priority: priority || "medium",
      defectType: defectType || "functional",
      status: "open",
      assigneeId: assigneeId || null,
      stepsToReproduce: stepsToReproduce?.trim() || null,
      expectedResult: expectedResult?.trim() || null,
      actualResult: actualResult?.trim() || null,
      testResultId: testResultId || null,
      testRunId: testRunId || null,
      testCaseId: testCaseId || null,
      externalUrl: externalUrl?.trim() || null,
      projectId,
      environmentId: environmentId || null,
      cycleId: cycleId || null,
      workspaceCycleId: workspaceCycleId || null,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
