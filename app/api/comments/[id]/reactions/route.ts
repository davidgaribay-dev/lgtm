import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { commentReaction, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { getCommentById } from "@/lib/queries/comments";
import { isValidEmoji } from "@/lib/comment-utils";
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
  const { emoji } = body;

  if (!emoji || !isValidEmoji(emoji)) {
    return NextResponse.json(
      { error: "Valid emoji is required" },
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
    if (!hasTokenPermission(authContext, "comment", "create")) {
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

  // Check if reaction already exists
  const existingReaction = await db
    .select({ id: commentReaction.id })
    .from(commentReaction)
    .where(
      and(
        eq(commentReaction.commentId, id),
        eq(commentReaction.userId, authContext.userId),
        eq(commentReaction.emoji, emoji),
      ),
    )
    .limit(1);

  if (existingReaction.length > 0) {
    return NextResponse.json(
      { error: "Reaction already exists" },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(commentReaction)
    .values({
      commentId: id,
      userId: authContext.userId,
      emoji,
    })
    .returning();

  logger.info(
    {
      reactionId: created.id,
      commentId: id,
      emoji,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Reaction added",
  );

  return NextResponse.json(created, { status: 201 });
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
  const body = await request.json();
  const { emoji } = body;

  if (!emoji || !isValidEmoji(emoji)) {
    return NextResponse.json(
      { error: "Valid emoji is required" },
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

  // Delete own reaction only
  const deleted = await db
    .delete(commentReaction)
    .where(
      and(
        eq(commentReaction.commentId, id),
        eq(commentReaction.userId, authContext.userId),
        eq(commentReaction.emoji, emoji),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Reaction not found" },
      { status: 404 },
    );
  }

  logger.info(
    {
      commentId: id,
      emoji,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Reaction removed",
  );

  return NextResponse.json({ success: true });
}
