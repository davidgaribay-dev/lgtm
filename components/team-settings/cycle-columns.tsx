"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CycleRow {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "planned" | "active" | "completed";
  isCurrent: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CycleColumnsOptions {
  onEdit: (cycle: CycleRow) => void;
  onDelete: (cycle: CycleRow) => void;
}

export function getCycleColumns({
  onEdit,
  onDelete,
}: CycleColumnsOptions): ColumnDef<CycleRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const cycleRow = row.original;
        return (
          <div>
            <div className="font-medium flex items-center gap-2">
              {cycleRow.name}
              {cycleRow.isCurrent && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            {cycleRow.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {cycleRow.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant =
          status === "completed"
            ? "secondary"
            : status === "active"
              ? "default"
              : "outline";
        return (
          <Badge variant={variant}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Timeline",
      cell: ({ row }) => {
        const { startDate, endDate } = row.original;

        if (!startDate && !endDate) {
          return <span className="text-muted-foreground text-sm">Not scheduled</span>;
        }

        const formatDate = (date: string) =>
          new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

        return (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>
              {startDate ? formatDate(startDate) : "?"} → {endDate ? formatDate(endDate) : "?"}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const cycleRow = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(cycleRow)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(cycleRow)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
