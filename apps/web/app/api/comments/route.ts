import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { comment, commentMention, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import {
  getEntityComments,
  getCommentReactions,
  getCommentMentions,
  getCommentUsers,
  resolveProjectId,
  getCommentById,
} from "@/lib/queries/comments";
import { getTeamMembers } from "@/lib/queries/team-members";
import { isValidEntityType, parseMentions, VALID_ENTITY_TYPES } from "@/lib/comment-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  if (!isValidEntityType(entityType)) {
    return NextResponse.json(
      { error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Resolve projectId from the entity
  const projectId = await resolveProjectId(entityType, entityId);

  if (!projectId) {
    return NextResponse.json(
      { error: "Entity not found" },
      { status: 404 },
    );
  }

  // Verify access
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
    if (!hasTokenPermission(authContext, "comment", "read")) {
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

  // Fetch comments and related data
  const comments = await getEntityComments(entityType, entityId);
  const commentIds = comments.map((c) => c.id);
  const [reactions, mentions] = await Promise.all([
    getCommentReactions(commentIds),
    getCommentMentions(commentIds),
  ]);

  // Collect all user IDs (authors + mentioned + resolvers)
  const userIdSet = new Set<string>();
  for (const c of comments) {
    userIdSet.add(c.createdBy);
    if (c.resolvedBy) userIdSet.add(c.resolvedBy);
  }
  for (const m of mentions) {
    userIdSet.add(m.userId);
  }
  for (const r of reactions) {
    userIdSet.add(r.userId);
  }

  const users = await getCommentUsers([...userIdSet]);

  return NextResponse.json({ comments, reactions, mentions, users });
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { entityType, entityId, body: commentBody, parentId } = body;

  if (!entityType || !entityId || !commentBody?.trim()) {
    return NextResponse.json(
      { error: "entityType, entityId, and body are required" },
      { status: 400 },
    );
  }

  if (!isValidEntityType(entityType)) {
    return NextResponse.json(
      { error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Resolve projectId from entity
  const projectId = await resolveProjectId(entityType, entityId);

  if (!projectId) {
    return NextResponse.json(
      { error: "Entity not found" },
      { status: 404 },
    );
  }

  // Verify access
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
    if (!hasTokenPermission(authContext, "comment", "create")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // Session: member+ (not viewer)
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

  // If parentId is provided, validate the parent comment
  if (parentId) {
    const parent = await getCommentById(parentId);
    if (!parent) {
      return NextResponse.json(
        { error: "Parent comment not found" },
        { status: 404 },
      );
    }
    // Only allow replies to top-level comments (no nested threading)
    if (parent.parentId !== null) {
      return NextResponse.json(
        { error: "Cannot reply to a reply" },
        { status: 400 },
      );
    }
    // Parent must belong to the same entity
    if (parent.entityType !== entityType || parent.entityId !== entityId) {
      return NextResponse.json(
        { error: "Parent comment belongs to a different entity" },
        { status: 400 },
      );
    }
  }

  // Parse mentions and validate they are team members
  const mentionedUserIds = parseMentions(commentBody);
  let validMentionUserIds: string[] = [];

  if (mentionedUserIds.length > 0) {
    const teamMembers = await getTeamMembers(projectId);
    const teamMemberIds = new Set(teamMembers.map((m) => m.userId));
    validMentionUserIds = mentionedUserIds.filter((id) =>
      teamMemberIds.has(id),
    );
  }

  // Insert comment
  const [created] = await db
    .insert(comment)
    .values({
      entityType,
      entityId,
      projectId,
      parentId: parentId || null,
      body: commentBody.trim(),
      createdBy: authContext.userId,
      updatedBy: authContext.userId,
    })
    .returning();

  // Insert mentions
  if (validMentionUserIds.length > 0) {
    await db.insert(commentMention).values(
      validMentionUserIds.map((userId) => ({
        commentId: created.id,
        userId,
      })),
    );
  }

  logger.info(
    {
      commentId: created.id,
      entityType,
      entityId,
      projectId,
      parentId: parentId || null,
      mentionCount: validMentionUserIds.length,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Comment created",
  );

  return NextResponse.json(created, { status: 201 });
}
