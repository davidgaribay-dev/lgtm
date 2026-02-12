import { db } from "@/db";
import { attachment } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/** Fetch all active attachments for an entity, ordered by creation time. */
export async function getEntityAttachments(
  entityType: string,
  entityId: string,
) {
  return db
    .select({
      id: attachment.id,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt,
      createdBy: attachment.createdBy,
    })
    .from(attachment)
    .where(
      and(
        eq(attachment.entityType, entityType),
        eq(attachment.entityId, entityId),
        isNull(attachment.deletedAt),
      ),
    )
    .orderBy(asc(attachment.createdAt));
}

/** Fetch a single attachment by ID (active only). */
export async function getAttachmentById(id: string) {
  return db
    .select({
      id: attachment.id,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt,
      createdBy: attachment.createdBy,
    })
    .from(attachment)
    .where(and(eq(attachment.id, id), isNull(attachment.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
