"use client";

import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUp, Loader2, Paperclip, Send } from "lucide-react";
import { MentionAutocomplete } from "./mention-autocomplete";
import { isImageMimeType } from "@/lib/attachment-utils";
import type { MentionableUser } from "./types";

interface CommentEditorProps {
  projectId: string;
  initialBody?: string;
  onSubmit: (body: string, mentions: string[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  variant?: "default" | "inline" | "comment";
  currentUserImage?: string | null;
  currentUserName?: string;
}

export function CommentEditor({
  projectId,
  initialBody = "",
  onSubmit,
  onCancel,
  placeholder = "Write a comment...",
  autoFocus = false,
  submitLabel = "Comment",
  variant = "default",
  currentUserImage,
  currentUserName,
}: CommentEditorProps) {
  const [body, setBody] = useState(initialBody);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [isAttaching, setIsAttaching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart;
      setBody(value);

      // Check if we're in a mention context
      const textBeforeCursor = value.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex >= 0) {
        // Check that @ is at the start or preceded by whitespace
        const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
        if (charBefore === " " || charBefore === "\n" || atIndex === 0) {
          const query = textBeforeCursor.slice(atIndex + 1);
          // Only show if no space in query (single word search) and no closing bracket
          if (!query.includes("[") && !query.includes("]")) {
            setMentionQuery(query);
            setMentionStartIndex(atIndex);
            setShowMentions(true);
            return;
          }
        }
      }

      setShowMentions(false);
    },
    [],
  );

  const handleMentionSelect = useCallback(
    (user: MentionableUser) => {
      const before = body.slice(0, mentionStartIndex);
      const after = body.slice(
        mentionStartIndex + 1 + mentionQuery.length,
      );
      const mentionText = `@[${user.name}](${user.userId})`;
      const newBody = before + mentionText + " " + after;

      setBody(newBody);
      setShowMentions(false);

      // Focus textarea and set cursor after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = before.length + mentionText.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [body, mentionStartIndex, mentionQuery],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = body.trim();
    if (!trimmed) return;

    // Extract mention user IDs
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(trimmed)) !== null) {
      mentions.push(match[2]);
    }

    onSubmit(trimmed, [...new Set(mentions)]);
    setBody("");
  }, [body, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Inline variant: Enter submits (unless mentions are open or shift is held)
      if (variant === "inline" && e.key === "Enter" && !e.shiftKey && !showMentions) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Comment variant: Enter submits (same as inline)
      if (variant === "comment" && e.key === "Enter" && !e.shiftKey && !showMentions) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Default variant: Submit on Ctrl/Cmd+Enter
      if (variant === "default" && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Close mentions on Escape
      if (e.key === "Escape" && showMentions) {
        e.preventDefault();
        setShowMentions(false);
      }
    },
    [variant, showMentions, handleSubmit],
  );

  const handleFileAttach = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setIsAttaching(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        // Upload to general upload endpoint for inline embedding
        formData.append("context", "comment-attachment");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();

        // Insert markdown link at cursor or end
        const isImage = isImageMimeType(file.type);
        const markdown = isImage
          ? `![${file.name}](${url})`
          : `[${file.name}](${url})`;

        setBody((prev) => {
          const newBody = prev ? `${prev}\n${markdown}` : markdown;
          return newBody;
        });
      } catch {
        // Silently fail — user can retry
      } finally {
        setIsAttaching(false);
      }
    },
    [],
  );

  const userInitials = currentUserName
    ? currentUserName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Inline variant: compact row with avatar + input + send
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Avatar size="sm" className="!size-5 shrink-0">
          {currentUserImage && (
            <AvatarImage src={currentUserImage} alt={currentUserName} />
          )}
          <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
        </Avatar>
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            rows={1}
            className="min-h-0 resize-none border-0 bg-transparent px-0 py-1 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {showMentions && (
            <MentionAutocomplete
              projectId={projectId}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentions(false)}
              placement="above"
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
          onClick={handleSubmit}
          disabled={!body.trim()}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Comment variant: bordered textarea with send button inside
  if (variant === "comment") {
    return (
      <div className="relative rounded-lg border bg-card">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={3}
          className="resize-none border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {showMentions && (
          <div className="relative">
            <MentionAutocomplete
              projectId={projectId}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentions(false)}
              placement="above"
            />
          </div>
        )}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAttaching}
              title="Attach file"
            >
              {isAttaching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,application/zip,text/plain"
              className="hidden"
              onChange={handleFileAttach}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
            onClick={handleSubmit}
            disabled={!body.trim()}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Default variant: full textarea + buttons
  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={3}
          className="resize-none pr-12"
        />
        {showMentions && (
          <MentionAutocomplete
            projectId={projectId}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentions(false)}
            placement="below"
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim()}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
