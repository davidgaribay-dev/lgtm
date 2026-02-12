import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { attachment, project, member } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission, hasProjectAccess } from "@/lib/token-permissions";
import { resolveProjectId } from "@/lib/queries/comments";
import { getEntityAttachments } from "@/lib/queries/attachments";
import { getStorage } from "@/lib/storage";
import {
  isValidAttachmentEntityType,
  VALID_ATTACHMENT_ENTITY_TYPES,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE,
  getExtensionFromMime,
  sanitizeFileName,
} from "@/lib/attachment-utils";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

/** POST — Upload a file and create an attachment record. */
export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 uploads per minute per user
  const rateLimited = checkRateLimit(request, authContext.userId, { limit: 20 });
  if (rateLimited) return rateLimited;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string | null;
  const entityId = formData.get("entityId") as string | null;
  let projectId = formData.get("projectId") as string | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 },
    );
  }

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  if (!isValidAttachmentEntityType(entityType)) {
    return NextResponse.json(
      {
        error: `entityType must be one of: ${VALID_ATTACHMENT_ENTITY_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `File type "${file.type}" not allowed. Accepted: ${[...ALLOWED_ATTACHMENT_TYPES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_ATTACHMENT_SIZE / (1024 * 1024)} MB` },
      { status: 400 },
    );
  }

  // Resolve projectId if not provided
  if (!projectId) {
    projectId = await resolveProjectId(entityType, entityId);
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "Entity not found or projectId could not be resolved" },
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
    if (!hasTokenPermission(authContext, "attachment", "create")) {
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

  try {
    const ext = getExtensionFromMime(file.type);
    const key = `attachments/${entityType}/${entityId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const storage = getStorage();
    const result = await storage.put(key, buffer, file.type);

    const [created] = await db
      .insert(attachment)
      .values({
        entityType,
        entityId,
        fileName: sanitizeFileName(file.name),
        fileUrl: result.url,
        fileSize: file.size,
        mimeType: file.type,
        createdBy: authContext.userId,
        updatedBy: authContext.userId,
      })
      .returning();

    logger.info(
      {
        attachmentId: created.id,
        entityType,
        entityId,
        projectId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        userId: authContext.userId,
        authType: authContext.type,
      },
      "Attachment created",
    );

    return NextResponse.json(
      {
        id: created.id,
        entityType: created.entityType,
        entityId: created.entityId,
        fileName: created.fileName,
        fileUrl: created.fileUrl,
        fileSize: created.fileSize,
        mimeType: created.mimeType,
        createdAt: created.createdAt,
        createdBy: created.createdBy,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error({ error }, "Failed to create attachment");
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}

/** GET — List attachments for an entity. */
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

  if (!isValidAttachmentEntityType(entityType)) {
    return NextResponse.json(
      {
        error: `entityType must be one of: ${VALID_ATTACHMENT_ENTITY_TYPES.join(", ")}`,
      },
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
    if (!hasTokenPermission(authContext, "attachment", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  } else {
    // Session: any org member
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

  const attachments = await getEntityAttachments(entityType, entityId);

  return NextResponse.json({ attachments });
}
