"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StackedProgressBar,
  getStatusColor,
  getStatusLabel,
  type ResultMetrics,
} from "./progress-bar";

export interface TestRunRow {
  id: string;
  name: string;
  runNumber: number | null;
  runKey: string | null;
  status: string;
  environmentName: string | null;
  startedAt: Date | string | null;
  createdAt: Date | string;
  totalCases: number;
  metrics: ResultMetrics;
  [key: string]: unknown;
}

function formatRelativeDate(dateStr: Date | string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getTestRunColumns({
  workspaceSlug,
  teamKey,
  onAbort,
  onDelete,
}: {
  workspaceSlug: string;
  teamKey: string;
  onAbort: (run: TestRunRow) => void;
  onDelete: (run: TestRunRow) => void;
}): ColumnDef<TestRunRow>[] {
  return [
    {
      accessorKey: "runNumber",
      header: "#",
      cell: ({ row }) => {
        const run = row.original;
        return (
          <Link
            href={`/${workspaceSlug}/${teamKey}/test-runs/${run.runKey}`}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            #{run.runNumber}
          </Link>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const run = row.original;
        return (
          <Link
            href={`/${workspaceSlug}/${teamKey}/test-runs/${run.runKey}`}
            className="font-medium hover:underline"
          >
            {run.name}
          </Link>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
          >
            {getStatusLabel(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "environmentName",
      header: "Environment",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.environmentName ?? "—"}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const { metrics, totalCases } = row.original;
        return (
          <div className="w-32">
            <StackedProgressBar metrics={metrics} total={totalCases} />
          </div>
        );
      },
    },
    {
      accessorKey: "totalCases",
      header: "Cases",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.totalCases}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const run = row.original;
        const isActive =
          run.status === "pending" || run.status === "in_progress";
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isActive && (
                  <DropdownMenuItem onClick={() => onAbort(run)}>
                    Abort run
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(run)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
