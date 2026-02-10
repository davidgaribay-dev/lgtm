import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { testCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, projectId, sectionId, description, preconditions, priority, type } = body;

  if (!title?.trim() || !projectId) {
    return NextResponse.json(
      { error: "Title and project ID are required" },
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

  // Use transaction to atomically increment counter and create test case
  const [created] = await db.transaction(async (tx) => {
    // Get team key and increment counter
    const [team] = await tx
      .update(project)
      .set({
        nextTestCaseNumber: sql`${project.nextTestCaseNumber} + 1`,
        updatedAt: new Date(),
        updatedBy: authContext.userId,
      })
      .where(eq(project.id, projectId))
      .returning({
        key: project.key,
        nextNumber: project.nextTestCaseNumber,
      });

    if (!team) {
      throw new Error("Project not found");
    }

    const caseNumber = team.nextNumber;
    const caseKey = `${team.key}-${caseNumber}`;

    // Create test case with number and key
    return tx
      .insert(testCase)
      .values({
        title: title.trim(),
        projectId,
        sectionId: sectionId || null,
        description: description?.trim() || null,
        preconditions: preconditions?.trim() || null,
        priority: priority || "medium",
        type: type || "functional",
        caseNumber,
        caseKey,
        createdBy: authContext.userId,
        updatedBy: authContext.userId,
      })
      .returning();
  });

  return NextResponse.json(created, { status: 201 });
}
