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
  getDefectSeverityColor,
  getDefectSeverityLabel,
  getDefectStatusColor,
  getDefectStatusLabel,
  getDefectPriorityLabel,
} from "./defect-status-helpers";

export interface DefectRow {
  id: string;
  title: string;
  defectNumber: number | null;
  defectKey: string | null;
  severity: string;
  priority: string;
  status: string;
  defectType: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  environmentName: string | null;
  testCaseKey: string | null;
  createdAt: Date | string;
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

export function getDefectColumns({
  workspaceSlug,
  teamKey,
  onDelete,
}: {
  workspaceSlug: string;
  teamKey: string;
  onDelete: (defect: DefectRow) => void;
}): ColumnDef<DefectRow>[] {
  return [
    {
      accessorKey: "defectKey",
      header: "#",
      cell: ({ row }) => {
        const defect = row.original;
        return (
          <Link
            href={`/${workspaceSlug}/${teamKey}/defects/${defect.id}`}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {defect.defectKey}
          </Link>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const defect = row.original;
        return (
          <Link
            href={`/${workspaceSlug}/${teamKey}/defects/${defect.id}`}
            className="font-medium hover:underline"
          >
            {defect.title}
          </Link>
        );
      },
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.original.severity;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDefectSeverityColor(severity)}`}
          >
            {getDefectSeverityLabel(severity)}
          </span>
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
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDefectStatusColor(status)}`}
          >
            {getDefectStatusLabel(status)}
          </span>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {getDefectPriorityLabel(row.original.priority)}
        </span>
      ),
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
      accessorKey: "assigneeName",
      header: "Assignee",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.assigneeName ?? "—"}
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
        const defect = row.original;
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
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(defect)}
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
