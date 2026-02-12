"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TestPlanRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  caseCount: number;
  createdAt: string;
}

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline"> =
  {
    active: "default",
    completed: "secondary",
    draft: "outline",
    archived: "outline",
  };

interface TestPlanColumnsOptions {
  onEdit: (plan: TestPlanRow) => void;
  onDelete: (plan: TestPlanRow) => void;
}

export function getTestPlanColumns({
  onEdit,
  onDelete,
}: TestPlanColumnsOptions): ColumnDef<TestPlanRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div>
            <div className="font-medium">{plan.name}</div>
            {plan.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {plan.description}
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
        const variant = statusBadgeVariant[status] ?? "outline";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "caseCount",
      header: "Cases",
      cell: ({ row }) => {
        const count = row.original.caseCount;
        return (
          <span className="text-sm text-muted-foreground">
            {count} {count === 1 ? "case" : "cases"}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(plan)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(plan)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
