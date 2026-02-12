"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  SmilePlus,
} from "lucide-react";
import { CommentReactions } from "./comment-reactions";
import { CommentEditor } from "./comment-editor";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import { UserProfileHoverCard } from "./user-profile-hover-card";
import type { CommentData, ReactionData, UserData } from "./types";

interface CommentItemProps {
  comment: CommentData;
  users: Map<string, UserData>;
  reactions: ReactionData[];
  currentUserId: string;
  canWrite: boolean;
  canDeleteAny: boolean;
  isReply: boolean;
  isResolved?: boolean;
  projectId: string;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
  onResolve?: (commentId: string, resolved: boolean) => void;
  onReact: (commentId: string, emoji: string) => void;
  onUnreact: (commentId: string, emoji: string) => void;
}

/** Render mention syntax as styled spans. */
function renderBody(body: string, users: Map<string, UserData>) {
  const parts: (string | React.ReactElement)[] = [];
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(body)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    const displayName = match[1];
    const userId = match[2];
    const user = users.get(userId);
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-xs font-medium text-primary"
      >
        @{user?.name || displayName}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function CommentItem({
  comment,
  users,
  reactions,
  currentUserId,
  canWrite,
  canDeleteAny,
  isReply,
  isResolved,
  projectId,
  onEdit,
  onDelete,
  onResolve,
  onReact,
  onUnreact,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const author = users.get(comment.createdBy);
  const isOwnComment = comment.createdBy === currentUserId;
  const canEditThis = isOwnComment && canWrite;
  const canDeleteThis = (isOwnComment && canWrite) || canDeleteAny;
  const hasActions = canEditThis || canDeleteThis;

  const commentReactions = useMemo(
    () => reactions.filter((r) => r.commentId === comment.id),
    [reactions, comment.id],
  );

  const initials = author?.name
    ? author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (isEditing) {
    return (
      <CommentEditor
        projectId={projectId}
        initialBody={comment.body}
        onSubmit={(body) => {
          onEdit(comment.id, body);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
        submitLabel="Save"
        autoFocus
      />
    );
  }

  return (
    <div className="group relative flex gap-3">
      <UserProfileHoverCard user={author}>
        <Avatar size="sm" className="mt-0.5 shrink-0 cursor-pointer">
          {author?.image && <AvatarImage src={author.image} alt={author.name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </UserProfileHoverCard>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {author?.name || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>
        <div className="mt-0.5 whitespace-pre-wrap text-sm">
          {renderBody(comment.body, users)}
        </div>
        {commentReactions.length > 0 && (
          <div className="mt-1.5">
            <CommentReactions
              commentId={comment.id}
              reactions={commentReactions}
              users={users}
              currentUserId={currentUserId}
              canReact={canWrite}
              onReact={onReact}
              onUnreact={onUnreact}
            />
          </div>
        )}
      </div>

      {/* Hover action buttons — positioned at top-right */}
      {canWrite && (
        <div className="absolute -top-1 right-0 flex items-center gap-0.5 rounded-md border bg-card p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          {/* Resolve (top-level only) */}
          {!isReply && onResolve && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 ${isResolved ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                    onClick={() => onResolve(comment.id, !isResolved)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isResolved ? "Unresolve thread" : "Resolve thread"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* React emoji picker */}
          <EmojiPickerPopover
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            onEmojiSelect={(emoji) => onReact(comment.id, emoji)}
            side="bottom"
            align="end"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </Button>
          </EmojiPickerPopover>

          {/* More menu (Edit, Delete) */}
          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEditThis && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDeleteThis && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
