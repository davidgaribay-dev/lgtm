import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { testSuite, section, testCase } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";

interface ReorderItem {
  id: string;
  type: "suite" | "section" | "testCase";
  displayOrder: number;
  parentId?: string | null;
  suiteId?: string | null;
  sectionId?: string | null;
}

export async function PUT(request: Request) {
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

  const access = await verifyProjectAccess(projectId);
  if (access instanceof NextResponse) return access;

  const userId = access.session.user.id;

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
