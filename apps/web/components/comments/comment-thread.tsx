"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, ChevronRight, ChevronsDownUp } from "lucide-react";
import { CommentItem } from "./comment-item";
import { CommentEditor } from "./comment-editor";
import type { CommentData, ReactionData, UserData } from "./types";

interface CommentThreadProps {
  comment: CommentData;
  replies: CommentData[];
  reactions: ReactionData[];
  users: Map<string, UserData>;
  currentUserId: string;
  canWrite: boolean;
  canDeleteAny: boolean;
  projectId: string;
  currentUserImage?: string | null;
  currentUserName?: string;
  onReply: (parentId: string, body: string) => void;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
  onReact: (commentId: string, emoji: string) => void;
  onUnreact: (commentId: string, emoji: string) => void;
}

export function CommentThread({
  comment,
  replies,
  reactions,
  users,
  currentUserId,
  canWrite,
  canDeleteAny,
  projectId,
  currentUserImage,
  currentUserName,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReact,
  onUnreact,
}: CommentThreadProps) {
  const isResolved = comment.resolvedAt !== null;
  const [expanded, setExpanded] = useState(!isResolved);
  const resolvedByUser = comment.resolvedBy
    ? users.get(comment.resolvedBy)
    : null;
  const totalComments = 1 + replies.length;

  // Resolve = collapse, called from CommentItem's ✓ button
  const handleResolve = useCallback(
    (commentId: string, resolved: boolean) => {
      onResolve(commentId, resolved);
      if (resolved) {
        // Resolve → collapse
        setExpanded(false);
      }
    },
    [onResolve],
  );

  // Collapsed resolved thread — card style
  if (isResolved && !expanded) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
        onClick={() => setExpanded(true)}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="flex-1 truncate text-muted-foreground">
          {resolvedByUser?.name || "Someone"} resolved the thread
        </span>
        <span className="shrink-0 text-xs text-muted-foreground/70">
          {totalComments} {totalComments === 1 ? "comment" : "comments"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  // Expanded thread (active or resolved) — wrapped in a card
  return (
    <div>
      <div className="rounded-lg border bg-card">
        <div className="space-y-3 p-4">
          {/* Top-level comment */}
          <CommentItem
            comment={comment}
            users={users}
            reactions={reactions}
            currentUserId={currentUserId}
            canWrite={canWrite}
            canDeleteAny={canDeleteAny}
            isReply={false}
            isResolved={isResolved}
            projectId={projectId}
            onEdit={onEdit}
            onDelete={onDelete}
            onResolve={handleResolve}
            onReact={onReact}
            onUnreact={onUnreact}
          />

          {/* Resolved banner — plain separator with collapse */}
          {isResolved && (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-b py-2 text-sm transition-colors hover:bg-muted/50"
              onClick={() => setExpanded(false)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="flex-1 text-left text-muted-foreground">
                {resolvedByUser?.name || "Someone"} resolved the thread
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Collapse
                <ChevronsDownUp className="h-3 w-3" />
              </span>
            </button>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className={`space-y-3 ${isResolved ? "" : "ml-8 pl-4"}`}>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  users={users}
                  reactions={reactions}
                  currentUserId={currentUserId}
                  canWrite={canWrite}
                  canDeleteAny={canDeleteAny}
                  isReply
                  projectId={projectId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onUnreact={onUnreact}
                />
              ))}
            </div>
          )}

          {/* Inline reply input */}
          {canWrite && (
            <div className={isResolved ? "" : "ml-8 pl-4"}>
              <CommentEditor
                projectId={projectId}
                variant="inline"
                currentUserImage={currentUserImage}
                currentUserName={currentUserName}
                onSubmit={(body) => onReply(comment.id, body)}
                placeholder="Leave a reply..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Collapse link below card — resolved threads only */}
      {isResolved && (
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setExpanded(false)}
        >
          <ChevronsDownUp className="h-3 w-3" />
          Collapse resolved thread
        </button>
      )}
    </div>
  );
}
