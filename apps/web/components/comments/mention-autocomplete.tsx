"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import useSWR from "swr";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { MentionableUser } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MentionAutocompleteProps {
  projectId: string;
  query: string;
  onSelect: (user: MentionableUser) => void;
  onClose: () => void;
  placement?: "above" | "below";
}

export function MentionAutocomplete({
  projectId,
  query,
  onSelect,
  onClose,
  placement = "below",
}: MentionAutocompleteProps) {
  const [rawSelectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = useSWR<MentionableUser[]>(
    query.length > 0
      ? `/api/comments/mentions?projectId=${encodeURIComponent(projectId)}&query=${encodeURIComponent(query)}`
      : `/api/comments/mentions?projectId=${encodeURIComponent(projectId)}`,
    fetcher,
    { dedupingInterval: 300 },
  );

  // Clamp index to valid range (handles list shrinking without needing effect-based reset)
  const selectedIndex =
    users.length === 0 ? 0 : Math.min(rawSelectedIndex, users.length - 1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev: number) => Math.min(prev + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev: number) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = Math.min(rawSelectedIndex, users.length - 1);
        if (users[idx]) {
          onSelect(users[idx]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [users, rawSelectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const positionClass =
    placement === "above"
      ? "bottom-full left-0 mb-1"
      : "top-full left-0 mt-1";

  if (users.length === 0) {
    return (
      <div
        className={`absolute z-50 w-64 rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md ${positionClass}`}
      >
        No team members found
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={`absolute z-50 max-h-48 w-64 overflow-y-auto rounded-md border bg-popover shadow-md ${positionClass}`}
    >
      {users.map((u, i) => (
        <button
          key={u.userId}
          type="button"
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
            i === selectedIndex ? "bg-accent" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <Avatar size="sm">
            {u.image && <AvatarImage src={u.image} alt={u.name} />}
            <AvatarFallback>
              {u.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{u.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {u.email}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
