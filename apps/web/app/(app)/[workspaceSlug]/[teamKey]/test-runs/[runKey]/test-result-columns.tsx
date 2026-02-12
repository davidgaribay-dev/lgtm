"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusColor, getStatusTextColor, getStatusLabel } from "../progress-bar";

export interface TestResultRow {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: string;
  source: string;
  executedBy: string | null;
  executedByName: string | null;
  executedByImage: string | null;
  executedAt: Date | string | null;
  duration: number | null;
  comment: string | null;
  caseTitle: string;
  caseKey: string | null;
  casePriority: string | null;
  caseType: string | null;
  sectionId: string | null;
  sectionName: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const RESULT_STATUSES = ["untested", "passed", "failed", "blocked", "skipped"];

export function getTestResultColumns({
  onStatusChange,
  onClickRow,
}: {
  onStatusChange: (resultId: string, newStatus: string) => void;
  onClickRow: (result: TestResultRow) => void;
}): ColumnDef<TestResultRow>[] {
  return [
    {
      accessorKey: "caseKey",
      header: "ID",
      cell: ({ row }) => (
        <button
          onClick={() => onClickRow(row.original)}
          className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {row.original.caseKey ?? "—"}
        </button>
      ),
    },
    {
      accessorKey: "caseTitle",
      header: "Title",
      cell: ({ row }) => (
        <button
          onClick={() => onClickRow(row.original)}
          className="text-left text-sm font-medium hover:underline"
        >
          {row.original.caseTitle}
        </button>
      ),
    },
{
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const result = row.original;
        return (
          <Select
            value={result.status}
            onValueChange={(val) => onStatusChange(result.id, val)}
          >
            <SelectTrigger
              className={`h-7 w-auto gap-1 rounded-full border-0 px-3 text-xs font-medium shadow-none focus:ring-0 dark:hover:bg-transparent ${getStatusColor(result.status)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESULT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs ${getStatusTextColor(s)}`}
                  >
                    {getStatusLabel(s)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "executedByName",
      header: "Executed By",
      cell: ({ row }) => {
        const r = row.original;
        if (!r.executedByName) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={r.executedByImage ?? undefined}
                alt={r.executedByName}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(r.executedByName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{r.executedByName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDuration(row.original.duration)}
        </span>
      ),
    },
    {
      id: "comment",
      header: "",
      cell: ({ row }) => {
        const comment = row.original.comment;
        if (!comment) return null;
        return (
          <Tooltip>
            <TooltipTrigger>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">{comment}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];
}
