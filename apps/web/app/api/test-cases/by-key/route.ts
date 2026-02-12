import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";
import { getTestSteps } from "@/lib/queries/test-repo";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const caseKey = searchParams.get("caseKey");

  if (!projectId || !caseKey) {
    return NextResponse.json(
      { error: "projectId and caseKey are required" },
      { status: 400 },
    );
  }

  // Verify project exists
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
    if (!hasTokenPermission(authContext, "testCase", "read")) {
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

  // Find test case by key
  const tc = await db
    .select()
    .from(testCase)
    .where(
      and(
        eq(testCase.projectId, projectId),
        eq(testCase.caseKey, caseKey.toUpperCase()),
        isNull(testCase.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!tc) {
    return NextResponse.json(
      { error: "Test case not found" },
      { status: 404 },
    );
  }

  // Include steps
  const steps = await getTestSteps(tc.id);

  return NextResponse.json({ ...tc, steps });
}
