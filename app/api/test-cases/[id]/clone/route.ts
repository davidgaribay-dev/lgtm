import { NextResponse } from "next/server";
import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "@/db";
import { testCase, testStep } from "@/db/schema";
import { verifyProjectAccess } from "@/lib/api-auth";

export async function POST(
  request: Request,
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

  const access = await verifyProjectAccess(projectId);
  if (access instanceof NextResponse) return access;

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

  const userId = access.session.user.id;

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
