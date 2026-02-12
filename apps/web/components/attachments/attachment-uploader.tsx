"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE,
  formatFileSize,
} from "@/lib/attachment-utils";
import type { AttachmentEntityType } from "@/lib/attachment-utils";

interface AttachmentUploaderProps {
  entityType: AttachmentEntityType;
  entityId: string;
  projectId: string;
  onUploaded: (attachment: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    createdBy: string;
  }) => void;
  variant?: "button" | "compact";
}

export function AttachmentUploader({
  entityType,
  entityId,
  projectId,
  onUploaded,
  variant = "button",
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = "";

    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      setError(
        `File type not allowed. Accepted: images, videos, PDF, ZIP, text`,
      );
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(
        `File too large. Maximum size is ${formatFileSize(MAX_ATTACHMENT_SIZE)}`,
      );
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      formData.append("projectId", projectId);

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const attachment = await res.json();
      onUploaded(attachment);
    } catch (err) {
      setError((err as Error).message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }

  const acceptTypes = [...ALLOWED_ATTACHMENT_TYPES].join(",");

  if (variant === "compact") {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          className="hidden"
          onChange={handleFileSelect}
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip className="mr-1.5 h-3.5 w-3.5" />
        )}
        Attach file
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        onChange={handleFileSelect}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
