"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Film,
  FileArchive,
  Image as ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize, isImageMimeType } from "@/lib/attachment-utils";

interface AttachmentData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdBy: string;
}

interface AttachmentListProps {
  attachments: AttachmentData[];
  canDelete: boolean;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function isPreviewable(mimeType: string): boolean {
  return isImageMimeType(mimeType) || isVideoMimeType(mimeType);
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType === "application/zip") return FileArchive;
  return FileText;
}

export function AttachmentList({
  attachments,
  canDelete,
  currentUserId,
  onDelete,
}: AttachmentListProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const previewableIndices = attachments
    .map((att, i) => (isPreviewable(att.mimeType) ? i : -1))
    .filter((i) => i !== -1);

  const currentAttachment =
    previewIndex !== null ? attachments[previewIndex] : null;

  const currentPreviewPos =
    previewIndex !== null ? previewableIndices.indexOf(previewIndex) : -1;

  function goToPrev() {
    if (currentPreviewPos > 0) {
      setPreviewIndex(previewableIndices[currentPreviewPos - 1]);
    }
  }

  function goToNext() {
    if (currentPreviewPos < previewableIndices.length - 1) {
      setPreviewIndex(previewableIndices[currentPreviewPos + 1]);
    }
  }

  function handleClick(index: number) {
    if (isPreviewable(attachments[index].mimeType)) {
      setPreviewIndex(index);
    } else {
      window.open(attachments[index].fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {attachments.map((att, index) => {
          const isImage = isImageMimeType(att.mimeType);
          const isVideo = isVideoMimeType(att.mimeType);
          const Icon = getFileIcon(att.mimeType);
          const canDeleteThis =
            canDelete || (currentUserId && att.createdBy === currentUserId);

          return (
            <div
              key={att.id}
              className="group relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <button
                type="button"
                onClick={() => handleClick(index)}
                className="block w-full cursor-pointer text-left"
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.fileUrl}
                    alt={att.fileName}
                    className="aspect-video w-full object-cover"
                  />
                ) : isVideo ? (
                  <div className="relative flex aspect-video items-center justify-center bg-black/5">
                    <Film className="h-8 w-8 text-muted-foreground" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                      {att.mimeType.split("/")[1]?.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium">{att.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.fileSize)}
                  </p>
                </div>
              </button>
              {canDeleteThis && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/80 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(att.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview dialog */}
      <Dialog
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-xl">
          <DialogTitle className="sr-only">
            {currentAttachment?.fileName ?? "Attachment preview"}
          </DialogTitle>

          {/* Media area */}
          <div className="relative flex min-h-[300px] items-center justify-center bg-black">
            {currentAttachment &&
              isImageMimeType(currentAttachment.mimeType) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAttachment.fileUrl}
                  alt={currentAttachment.fileName}
                  className="max-h-[75vh] w-auto object-contain"
                />
              )}
            {currentAttachment &&
              isVideoMimeType(currentAttachment.mimeType) && (
                <video
                  key={currentAttachment.id}
                  src={currentAttachment.fileUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-auto"
                >
                  <track kind="captions" />
                </video>
              )}

            {/* Navigation arrows */}
            {previewableIndices.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/50 p-0 text-white hover:bg-black/70 disabled:opacity-30"
                  disabled={currentPreviewPos <= 0}
                  onClick={goToPrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/50 p-0 text-white hover:bg-black/70 disabled:opacity-30"
                  disabled={currentPreviewPos >= previewableIndices.length - 1}
                  onClick={goToNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {/* Footer bar */}
          {currentAttachment && (
            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {currentAttachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(currentAttachment.fileSize)}
                  {previewableIndices.length > 1 && (
                    <span className="ml-2">
                      {currentPreviewPos + 1} of {previewableIndices.length}
                    </span>
                  )}
                </p>
              </div>
              <a
                href={currentAttachment.fileUrl}
                download={currentAttachment.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3"
              >
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
