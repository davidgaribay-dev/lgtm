import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachment, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { resolveProjectId } from "@/lib/queries/comments";
import { getAttachmentById } from "@/lib/queries/attachments";
import { logger } from "@/lib/logger";

/** DELETE — Soft-delete an attachment. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch attachment
  const existing = await getAttachmentById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }

  // Resolve projectId from entity
  const projectId = await resolveProjectId(
    existing.entityType,
    existing.entityId,
  );
  if (!projectId) {
    return NextResponse.json(
      { error: "Parent entity not found" },
      { status: 404 },
    );
  }

  // Verify project exists and get org
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Authorization
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
    if (!hasTokenPermission(authContext, "attachment", "delete")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // Session auth
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

    // Own attachments: member+ can delete
    // Others' attachments: admin/owner only
    const isOwner = existing.createdBy === authContext.userId;
    if (!isOwner && !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden - can only delete your own attachments" },
        { status: 403 },
      );
    }

    if (membership.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Soft-delete
  await db
    .update(attachment)
    .set({
      deletedAt: new Date(),
      deletedBy: authContext.userId,
    })
    .where(eq(attachment.id, id));

  logger.info(
    {
      attachmentId: id,
      entityType: existing.entityType,
      entityId: existing.entityId,
      userId: authContext.userId,
      authType: authContext.type,
    },
    "Attachment deleted",
  );

  return NextResponse.json({ success: true });
}
