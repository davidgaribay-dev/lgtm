"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ----- Types -----

export interface MemberRow {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: Date;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

// ----- Helpers -----

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={roleBadgeVariant[role] ?? "outline"} className="capitalize">
      {role}
    </Badge>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ----- Member columns -----

export function getMemberColumns({
  currentUserId,
  ownerCount,
  onChangeRole,
  onRemove,
}: {
  currentUserId: string;
  ownerCount: number;
  onChangeRole: (member: MemberRow) => void;
  onRemove: (member: MemberRow) => void;
}): ColumnDef<MemberRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={m.image ?? undefined} alt={m.name} />
              <AvatarFallback className="text-xs">
                {getInitials(m.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {m.name}
                {m.userId === currentUserId && (
                  <span className="ml-1 text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const m = row.original;
        const isSelf = m.userId === currentUserId;
        const isSoleOwner = m.role === "owner" && ownerCount <= 1;

        if (isSelf || isSoleOwner) return null;

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
                <DropdownMenuItem onClick={() => onChangeRole(m)}>
                  Change role
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onRemove(m)}
                >
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

// ----- Invitation columns -----

export function getInvitationColumns({
  onCancel,
}: {
  onCancel: (invitation: InvitationRow) => void;
}): ColumnDef<InvitationRow>[] {
  return [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onCancel(row.original)}
          >
            Revoke
          </Button>
        </div>
      ),
    },
  ];
}
