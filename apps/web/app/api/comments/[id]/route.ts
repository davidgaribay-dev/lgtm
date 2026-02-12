import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comment, commentMention, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { getCommentById } from "@/lib/queries/comments";
import { getTeamMembers } from "@/lib/queries/team-members";
import { parseMentions } from "@/lib/comment-utils";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { body: commentBody } = body;

  if (!commentBody?.trim()) {
    return NextResponse.json(
      { error: "body is required" },
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

  // Only own comments can be edited
  if (existing.createdBy !== authContext.userId) {
    return NextResponse.json(
      { error: "Can only edit own comments" },
      { status: 403 },
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

  // Update the comment
  const [updated] = await db
    .update(comment)
    .set({
      body: commentBody.trim(),
      editedAt: new Date(),
      updatedBy: authContext.userId,
    })
    .where(and(eq(comment.id, id), isNull(comment.deletedAt)))
    .returning();

  // Re-parse mentions and update
  const newMentionUserIds = parseMentions(commentBody);

  // Delete existing mentions for this comment
  await db
    .delete(commentMention)
    .where(eq(commentMention.commentId, id));

  // Insert new mentions (validate they are team members)
  if (newMentionUserIds.length > 0) {
    const teamMembers = await getTeamMembers(existing.projectId);
    const teamMemberIds = new Set(teamMembers.map((m) => m.userId));
    const validMentionUserIds = newMentionUserIds.filter((uid) =>
      teamMemberIds.has(uid),
    );

    if (validMentionUserIds.length > 0) {
      await db.insert(commentMention).values(
        validMentionUserIds.map((userId) => ({
          commentId: id,
          userId,
        })),
      );
    }
  }

  logger.info(
    {
      commentId: id,
      projectId: existing.projectId,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Comment updated",
  );

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get the comment
  const existing = await getCommentById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404 },
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

  const isOwnComment = existing.createdBy === authContext.userId;

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
    // Own comment: comment:create suffices. Others: need comment:delete
    if (!isOwnComment) {
      if (!hasTokenPermission(authContext, "comment", "delete")) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        );
      }
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

    // Non-owners: can only delete own comments unless admin/owner
    if (
      !isOwnComment &&
      !["owner", "admin"].includes(membership.role)
    ) {
      return NextResponse.json(
        { error: "Can only delete own comments" },
        { status: 403 },
      );
    }
  }

  const now = new Date();

  // Soft delete the comment
  await db
    .update(comment)
    .set({
      deletedAt: now,
      deletedBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .where(and(eq(comment.id, id), isNull(comment.deletedAt)));

  // If it's a top-level comment, cascade soft-delete all replies
  if (existing.parentId === null) {
    await db
      .update(comment)
      .set({
        deletedAt: now,
        deletedBy: authContext.userId,
        updatedBy: authContext.userId,
      })
      .where(
        and(eq(comment.parentId, id), isNull(comment.deletedAt)),
      );
  }

  logger.info(
    {
      commentId: id,
      projectId: existing.projectId,
      isOwnComment,
      cascadedReplies: existing.parentId === null,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Comment deleted",
  );

  return NextResponse.json({ success: true });
}
