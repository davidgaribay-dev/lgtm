"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface EnvironmentRow {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  type: string;
  isDefault: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const typeBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  production: "default",
  staging: "secondary",
  qa: "secondary",
  development: "outline",
  custom: "outline",
};

export function getEnvironmentColumns({
  isAdmin,
  onEdit,
  onDelete,
}: {
  isAdmin: boolean;
  onEdit: (env: EnvironmentRow) => void;
  onDelete: (env: EnvironmentRow) => void;
}): ColumnDef<EnvironmentRow>[] {
  const columns: ColumnDef<EnvironmentRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const env = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{env.name}</span>
            {env.isDefault && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant={typeBadgeVariant[row.original.type] ?? "outline"}
          className="capitalize"
        >
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.original.url;
        if (!url) {
          return <span className="text-muted-foreground">&mdash;</span>;
        }
        return (
          <span className="truncate text-sm text-muted-foreground">{url}</span>
        );
      },
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const env = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(env)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(env)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });
  }

  return columns;
}
