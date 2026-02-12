"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { Paperclip, Loader2 } from "lucide-react";
import { AttachmentList } from "./attachment-list";
import { AttachmentUploader } from "./attachment-uploader";
import type { AttachmentEntityType } from "@/lib/attachment-utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AttachmentData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  createdBy: string;
}

interface AttachmentSectionProps {
  entityType: AttachmentEntityType;
  entityId: string;
  projectId: string;
  currentUserId?: string;
  /** Whether the current user can create attachments (member+) */
  canWrite: boolean;
  /** Whether the current user can delete any attachment (admin/owner) */
  canDeleteAny: boolean;
}

export function AttachmentSection({
  entityType,
  entityId,
  projectId,
  currentUserId,
  canWrite,
  canDeleteAny,
}: AttachmentSectionProps) {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<{ attachments: AttachmentData[] }>(
    `/api/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    fetcher,
  );

  const attachments = data?.attachments ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate],
  );

  const handleUploaded = useCallback(() => {
    mutate();
  }, [mutate]);

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load attachments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">
          Attachments
          {attachments.length > 0 && (
            <span className="ml-1.5 text-muted-foreground">
              ({attachments.length})
            </span>
          )}
        </h3>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading attachments...</span>
        </div>
      )}

      {/* Attachment list */}
      {!isLoading && attachments.length > 0 && (
        <AttachmentList
          attachments={attachments}
          canDelete={canDeleteAny}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />
      )}

      {/* Empty state */}
      {!isLoading && attachments.length === 0 && (
        <p className="py-1 text-sm text-muted-foreground">
          No attachments yet.
        </p>
      )}

      {/* Upload button */}
      {canWrite && (
        <AttachmentUploader
          entityType={entityType}
          entityId={entityId}
          projectId={projectId}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}
