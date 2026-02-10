import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { testSuite, section, testCase, project, member } from "@/db/schema";
import { getAuthContext } from "@/lib/api-auth";
import {
  hasTokenPermission,
  hasAnyTokenPermission,
  hasProjectAccess,
} from "@/lib/token-permissions";

interface ReorderItem {
  id: string;
  type: "suite" | "section" | "testCase";
  displayOrder: number;
  parentId?: string | null;
  suiteId?: string | null;
  sectionId?: string | null;
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { projectId, items } = body as {
    projectId: string;
    items: ReorderItem[];
  };

  if (!projectId || !Array.isArray(items)) {
    return NextResponse.json(
      { error: "projectId and items array are required" },
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

    // Check permissions (reordering requires update permission on any resource type)
    if (
      !hasAnyTokenPermission(authContext, [
        { resource: "testSuite", action: "update" },
        { resource: "section", action: "update" },
        { resource: "testCase", action: "update" },
      ])
    ) {
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

  const userId = authContext.userId;

  for (const item of items) {
    switch (item.type) {
      case "suite":
        await db
          .update(testSuite)
          .set({
            displayOrder: item.displayOrder,
            updatedBy: userId,
          })
          .where(
            and(
              eq(testSuite.id, item.id),
              eq(testSuite.projectId, projectId),
              isNull(testSuite.deletedAt),
            ),
          );
        break;

      case "section": {
        const sectionUpdates: Record<string, unknown> = {
          displayOrder: item.displayOrder,
          updatedBy: userId,
        };
        if (item.suiteId !== undefined) sectionUpdates.suiteId = item.suiteId;
        if (item.parentId !== undefined)
          sectionUpdates.parentId = item.parentId;

        await db
          .update(section)
          .set(sectionUpdates)
          .where(
            and(
              eq(section.id, item.id),
              eq(section.projectId, projectId),
              isNull(section.deletedAt),
            ),
          );
        break;
      }

      case "testCase": {
        const tcUpdates: Record<string, unknown> = {
          displayOrder: item.displayOrder,
          updatedBy: userId,
        };
        if (item.sectionId !== undefined) tcUpdates.sectionId = item.sectionId;

        await db
          .update(testCase)
          .set(tcUpdates)
          .where(
            and(
              eq(testCase.id, item.id),
              eq(testCase.projectId, projectId),
              isNull(testCase.deletedAt),
            ),
          );
        break;
      }
    }
  }

  return NextResponse.json({ success: true });
}
