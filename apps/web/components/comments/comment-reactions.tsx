"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SmilePlus } from "lucide-react";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import { type ReactionData, type UserData, normalizeEmoji } from "./types";

interface CommentReactionsProps {
  commentId: string;
  reactions: ReactionData[];
  users: Map<string, UserData>;
  currentUserId: string;
  canReact: boolean;
  onReact: (commentId: string, emoji: string) => void;
  onUnreact: (commentId: string, emoji: string) => void;
}

export function CommentReactions({
  commentId,
  reactions,
  users,
  currentUserId,
  canReact,
  onReact,
  onUnreact,
}: CommentReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const grouped = new Map<string, { count: number; userIds: string[]; hasCurrentUser: boolean }>();
  for (const r of reactions) {
    const existing = grouped.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.userIds.push(r.userId);
      if (r.userId === currentUserId) existing.hasCurrentUser = true;
    } else {
      grouped.set(r.emoji, {
        count: 1,
        userIds: [r.userId],
        hasCurrentUser: r.userId === currentUserId,
      });
    }
  }

  const handleToggle = (emoji: string) => {
    const group = grouped.get(emoji);
    if (group?.hasCurrentUser) {
      onUnreact(commentId, emoji);
    } else {
      onReact(commentId, emoji);
    }
  };

  const handlePickerSelect = (emoji: string) => {
    onReact(commentId, emoji);
  };

  if (grouped.size === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1">
        {Array.from(grouped.entries()).map(([emoji, group]) => {
          const emojiChar = normalizeEmoji(emoji);
          const userNames = group.userIds
            .map((id) => users.get(id)?.name || "Unknown")
            .join(", ");

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => canReact && handleToggle(emoji)}
                  disabled={!canReact}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    group.hasCurrentUser
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                  } ${canReact ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span>{emojiChar}</span>
                  <span>{group.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userNames}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {canReact && (
          <EmojiPickerPopover
            open={showPicker}
            onOpenChange={setShowPicker}
            onEmojiSelect={handlePickerSelect}
            side="top"
            align="start"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <SmilePlus className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add reaction</p>
              </TooltipContent>
            </Tooltip>
          </EmojiPickerPopover>
        )}
      </div>
    </TooltipProvider>
  );
}
