import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  testRun,
  testResult,
  testCase,
  project,
  member,
  cycle,
  environment,
  workspaceCycle,
} from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getProjectTestRuns } from "@/lib/queries/test-runs";

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

  // Verify project exists and user has access
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
    if (!hasTokenPermission(authContext, "testRun", "read")) {
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

  const runs = await getProjectTestRuns(projectId);
  return NextResponse.json(runs);
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
    projectId,
    environmentId,
    cycleId,
    workspaceCycleId,
    testCaseIds,
  } = body;

  if (!name?.trim() || !projectId) {
    return NextResponse.json(
      { error: "Name and project ID are required" },
      { status: 400 },
    );
  }

  if (
    !testCaseIds ||
    !Array.isArray(testCaseIds) ||
    testCaseIds.length === 0
  ) {
    return NextResponse.json(
      { error: "At least one test case must be selected" },
      { status: 400 },
    );
  }

  // Verify project
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Auth checks
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
    if (!hasTokenPermission(authContext, "testRun", "create")) {
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

  // Validate all testCaseIds belong to this project
  const validCases = await db
    .select({ id: testCase.id })
    .from(testCase)
    .where(
      and(
        eq(testCase.projectId, projectId),
        inArray(testCase.id, testCaseIds),
        isNull(testCase.deletedAt),
      ),
    );

  if (validCases.length !== testCaseIds.length) {
    return NextResponse.json(
      { error: "One or more test cases do not belong to this project" },
      { status: 400 },
    );
  }

  // Validate cycleId belongs to this project (if provided)
  if (cycleId) {
    const validCycle = await db
      .select({ id: cycle.id })
      .from(cycle)
      .where(
        and(
          eq(cycle.id, cycleId),
          eq(cycle.projectId, projectId),
          isNull(cycle.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!validCycle) {
      return NextResponse.json(
        { error: "Cycle not found in this project" },
        { status: 400 },
      );
    }
  }

  // Validate environmentId belongs to this project (if provided)
  if (environmentId) {
    const validEnv = await db
      .select({ id: environment.id })
      .from(environment)
      .where(
        and(
          eq(environment.id, environmentId),
          eq(environment.projectId, projectId),
          isNull(environment.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!validEnv) {
      return NextResponse.json(
        { error: "Environment not found in this project" },
        { status: 400 },
      );
    }
  }

  // Validate workspaceCycleId belongs to this organization (if provided)
  if (workspaceCycleId) {
    const validWsCycle = await db
      .select({ id: workspaceCycle.id })
      .from(workspaceCycle)
      .where(
        and(
          eq(workspaceCycle.id, workspaceCycleId),
          eq(workspaceCycle.organizationId, proj.organizationId),
          isNull(workspaceCycle.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!validWsCycle) {
      return NextResponse.json(
        { error: "Workspace cycle not found in this organization" },
        { status: 400 },
      );
    }
  }

  // Atomically increment run counter
  const [team] = await db
    .update(project)
    .set({
      nextRunNumber: sql`${project.nextRunNumber} + 1`,
      updatedAt: new Date(),
      updatedBy: authContext.userId,
    })
    .where(eq(project.id, projectId))
    .returning({
      nextRunNumber: project.nextRunNumber,
      key: project.key,
    });

  if (!team) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const runNumber = team.nextRunNumber;
  const runKey = `${team.key}-TR-${runNumber}`;
  const source = authContext.type === "api_token" ? "api" : "manual";

  // Create the test run
  const [created] = await db
    .insert(testRun)
    .values({
      name: name.trim(),
      runNumber,
      runKey,
      description: description?.trim() || null,
      projectId,
      environmentId: environmentId || null,
      cycleId: cycleId || null,
      workspaceCycleId: workspaceCycleId || null,
      status: "pending",
      executedBy: authContext.userId,
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  // Bulk insert test results (one per case, all "untested")
  const resultValues = testCaseIds.map((testCaseId: string) => ({
    testRunId: created.id,
    testCaseId,
    status: "untested",
    source,
  }));

  await db.insert(testResult).values(resultValues);

  return NextResponse.json(
    { ...created, totalCases: testCaseIds.length },
    { status: 201 },
  );
}
