export const ATTACHMENT_ENTITY_TYPES = [
  "test_case",
  "test_result",
  "defect",
  "test_run",
  "comment",
] as const;
export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number];

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/zip",
  "text/plain",
] as const;
export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/** Maximum attachment file size in bytes (10 MB). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
