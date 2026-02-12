import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comment, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { getCommentById } from "@/lib/queries/comments";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { resolved } = body;

  if (typeof resolved !== "boolean") {
    return NextResponse.json(
      { error: "resolved (boolean) is required" },
      { status: 400 },
    );
  }

  // Get the comment
  const existing = await getCommentById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404 },
    );
  }

  // Only top-level comments can be resolved
  if (existing.parentId !== null) {
    return NextResponse.json(
      { error: "Only top-level comments (threads) can be resolved" },
      { status: 400 },
    );
  }

  // Verify project access
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(
      and(eq(project.id, existing.projectId), isNull(project.deletedAt)),
    )
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
    if (!hasTokenPermission(authContext, "comment", "update")) {
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

    if (!membership || membership.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Update resolution status
  const [updated] = await db
    .update(comment)
    .set({
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? authContext.userId : null,
      updatedBy: authContext.userId,
    })
    .where(and(eq(comment.id, id), isNull(comment.deletedAt)))
    .returning();

  logger.info(
    {
      commentId: id,
      projectId: existing.projectId,
      resolved,
      userId: authContext.userId,
      authType: authContext.type,
    },
    resolved ? "Comment thread resolved" : "Comment thread unresolved",
  );

  return NextResponse.json(updated);
}
