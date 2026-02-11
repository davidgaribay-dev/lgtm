"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { MessageSquare, Loader2 } from "lucide-react";
import { CommentThread } from "./comment-thread";
import { CommentEditor } from "./comment-editor";
import type { CommentData, ReactionData, MentionData, UserData } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CommentsResponse {
  comments: CommentData[];
  reactions: ReactionData[];
  mentions: MentionData[];
  users: UserData[];
}

interface CommentSectionProps {
  entityType: "test_case" | "test_result";
  entityId: string;
  projectId: string;
  currentUserId: string;
  currentUserImage?: string | null;
  currentUserName?: string;
  /** Whether the current user can create/edit comments (member+) */
  canWrite: boolean;
  /** Whether the current user can delete any comment (admin/owner) */
  canDeleteAny: boolean;
}

export function CommentSection({
  entityType,
  entityId,
  projectId,
  currentUserId,
  currentUserImage,
  currentUserName,
  canWrite,
  canDeleteAny,
}: CommentSectionProps) {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<CommentsResponse>(
    `/api/comments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    fetcher,
  );

  const usersMap = useMemo(() => {
    const map = new Map<string, UserData>();
    if (data?.users) {
      for (const u of data.users) {
        map.set(u.id, u);
      }
    }
    return map;
  }, [data]);

  // Group comments into threads
  const threads = useMemo(() => {
    if (!data?.comments) return [];
    const topLevel: CommentData[] = [];
    const repliesMap = new Map<string, CommentData[]>();

    for (const c of data.comments) {
      if (c.parentId === null) {
        topLevel.push(c);
      } else {
        const existing = repliesMap.get(c.parentId) || [];
        existing.push(c);
        repliesMap.set(c.parentId, existing);
      }
    }

    return topLevel.map((c) => ({
      comment: c,
      replies: repliesMap.get(c.id) || [],
    }));
  }, [data]);

  const commentCount = data?.comments?.length ?? 0;

  // Action handlers
  const handleCreateComment = useCallback(
    async (body: string) => {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, body }),
      });
      mutate();
    },
    [entityType, entityId, mutate],
  );

  const handleReply = useCallback(
    async (parentId: string, body: string) => {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, body, parentId }),
      });
      mutate();
    },
    [entityType, entityId, mutate],
  );

  const handleEdit = useCallback(
    async (commentId: string, body: string) => {
      await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      mutate();
    },
    [mutate],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      mutate();
    },
    [mutate],
  );

  const handleResolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      await fetch(`/api/comments/${commentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      mutate();
    },
    [mutate],
  );

  const handleReact = useCallback(
    async (commentId: string, emoji: string) => {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      mutate();
    },
    [mutate],
  );

  const handleUnreact = useCallback(
    async (commentId: string, emoji: string) => {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      mutate();
    },
    [mutate],
  );

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load comments.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">
          Comments
          {commentCount > 0 && (
            <span className="ml-1.5 text-muted-foreground">
              ({commentCount})
            </span>
          )}
        </h3>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading comments...</span>
        </div>
      )}

      {/* Threads */}
      {!isLoading && threads.length > 0 && (
        <div className="space-y-4">
          {threads.map(({ comment, replies }) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={replies}
              reactions={data?.reactions || []}
              users={usersMap}
              currentUserId={currentUserId}
              canWrite={canWrite}
              canDeleteAny={canDeleteAny}
              projectId={projectId}
              currentUserImage={currentUserImage}
              currentUserName={currentUserName}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onResolve={handleResolve}
              onReact={handleReact}
              onUnreact={handleUnreact}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && threads.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          No comments yet. {canWrite ? "Start the discussion below." : ""}
        </p>
      )}

      {/* New comment editor */}
      {canWrite && (
        <CommentEditor
          projectId={projectId}
          variant="comment"
          onSubmit={(body) => handleCreateComment(body)}
          placeholder="Leave a comment..."
        />
      )}
    </div>
  );
}
