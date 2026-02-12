/**
 * Utility helpers for the attachment system.
 */

/** Valid entity types that can have attachments. */
export const VALID_ATTACHMENT_ENTITY_TYPES = [
  "test_case",
  "test_result",
  "defect",
  "test_run",
  "comment",
] as const;

export type AttachmentEntityType =
  (typeof VALID_ATTACHMENT_ENTITY_TYPES)[number];

/** Validate that a string is a valid attachment entity type. */
export function isValidAttachmentEntityType(
  type: string,
): type is AttachmentEntityType {
  return (VALID_ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(type);
}

/** Allowed MIME types for attachments. */
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/zip",
  "text/plain",
]);

/** Maximum attachment file size in bytes (10 MB). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

/** Get file extension from MIME type. */
export function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "text/plain": "txt",
  };
  return map[mimeType] || "bin";
}

/** Check if a MIME type is an image type. */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/** Format file size for display. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitize a user-provided file name for safe storage.
 * Strips path separators, control characters, and limits length.
 */
export function sanitizeFileName(name: string): string {
  return name
    // Remove path separators and null bytes
    .replace(/[/\\:\0]/g, "_")
    // Remove control characters
    .replace(/[\x00-\x1f\x7f]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Limit length (preserve extension)
    .slice(0, 255) || "unnamed";
}
