"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ResultMetrics {
  untested: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

interface StackedProgressBarProps {
  metrics: ResultMetrics;
  total: number;
  className?: string;
}

const segments = [
  { key: "passed", label: "Passed", color: "bg-emerald-500" },
  { key: "failed", label: "Failed", color: "bg-red-500" },
  { key: "blocked", label: "Blocked", color: "bg-amber-500" },
  { key: "skipped", label: "Skipped", color: "bg-violet-500" },
  { key: "untested", label: "Untested", color: "bg-muted-foreground/30" },
] as const;

export function StackedProgressBar({
  metrics,
  total,
  className,
}: StackedProgressBarProps) {
  if (total === 0) {
    return (
      <div className={`h-2 w-full rounded-full bg-muted ${className ?? ""}`} />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex h-2 w-full overflow-hidden rounded-full bg-muted ${className ?? ""}`}
        >
          {segments.map(({ key, color }) => {
            const count = metrics[key];
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <div
                key={key}
                className={`${color} transition-all duration-300`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex flex-col gap-1">
          {segments.map(({ key, label, color }) => {
            const count = metrics[key];
            if (count === 0) return null;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${color}`}
                />
                <span>
                  {label}: {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Status badge color utilities */
export function getStatusColor(status: string) {
  switch (status) {
    case "passed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "failed":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "blocked":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "skipped":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
    case "untested":
      return "bg-muted text-muted-foreground";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "pending":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Text-only status color (no background) for inline use */
export function getStatusTextColor(status: string) {
  switch (status) {
    case "passed":
      return "text-emerald-700 dark:text-emerald-400";
    case "failed":
      return "text-red-700 dark:text-red-400";
    case "blocked":
      return "text-amber-700 dark:text-amber-400";
    case "skipped":
      return "text-violet-700 dark:text-violet-400";
    case "in_progress":
      return "text-blue-700 dark:text-blue-400";
    case "untested":
    case "pending":
    default:
      return "text-muted-foreground";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "blocked":
      return "Blocked";
    case "skipped":
      return "Skipped";
    case "untested":
      return "Untested";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}
