"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface ListGroup<T> {
  key: string;
  label: string;
  dotColor: string;
  items: T[];
}

interface GroupedListProps<T> {
  groups: ListGroup<T>[];
  renderRow: (item: T) => ReactNode;
  getItemId: (item: T) => string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function GroupedList<T>({
  groups,
  renderRow,
  getItemId,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: GroupedListProps<T>) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        {emptyTitle && (
          <h3 className="mb-1 text-sm font-medium">{emptyTitle}</h3>
        )}
        {emptyDescription && (
          <p className="mb-4 text-xs text-muted-foreground">
            {emptyDescription}
          </p>
        )}
        {emptyAction}
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => {
        if (group.items.length === 0) return null;
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="flex w-full items-center gap-2 px-4 py-1.5 text-xs hover:bg-muted/50"
            >
              <ChevronRight
                className={`h-3 w-3 text-muted-foreground transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
              <span
                className={`h-3 w-3 rounded-full border ${group.dotColor}`}
              />
              <span className="font-medium">{group.label}</span>
              <span className="text-muted-foreground">
                {group.items.length}
              </span>
            </button>
            {!isCollapsed && (
              <div>
                {group.items.map((item) => (
                  <Fragment key={getItemId(item)}>
                    {renderRow(item)}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Consistent row class for items inside GroupedList */
export const groupedListRowClass =
  "group flex items-center gap-3 px-4 py-1.5 text-sm hover:bg-muted/30";

/** Compact relative date formatter for list views */
export function formatRelativeDate(dateStr: Date | string | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
