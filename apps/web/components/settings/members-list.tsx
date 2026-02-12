"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Plus, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  formatRelativeDate,
  type ListGroup,
} from "@/components/grouped-list";

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

type ListItem =
  | { kind: "member"; data: MemberRow }
  | { kind: "invitation"; data: InvitationRow };

// ----- Helpers -----

const ROLE_ORDER = ["owner", "admin", "member", "viewer"] as const;

function getRoleDotColor(role: string) {
  switch (role) {
    case "owner":
      return "border-emerald-500 bg-emerald-500/20";
    case "admin":
      return "border-blue-500 bg-blue-500/20";
    case "member":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "viewer":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "pending":
      return "border-amber-500 bg-amber-500/20";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owners";
    case "admin":
      return "Admins";
    case "member":
      return "Members";
    case "viewer":
      return "Viewers";
    case "pending":
      return "Pending Invitations";
    default:
      return role;
  }
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
  viewer: "outline",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const assignableRoles = ["admin", "member", "viewer"] as const;

// ----- Component -----

interface MembersListProps {
  org: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
  members: MemberRow[];
  pendingInvitations: InvitationRow[];
  currentUserId: string;
}

export function MembersList({
  org,
  members,
  pendingInvitations,
  currentUserId,
}: MembersListProps) {
  const router = useRouter();

  // Dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<MemberRow | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Role change
  const [newRole, setNewRole] = useState<string>("");

  const ownerCount = members.filter((m) => m.role === "owner").length;

  const groups = useMemo((): ListGroup<ListItem>[] => {
    const roleMap = new Map<string, ListItem[]>();
    for (const m of members) {
      const list = roleMap.get(m.role) ?? [];
      list.push({ kind: "member", data: m });
      roleMap.set(m.role, list);
    }

    const result: ListGroup<ListItem>[] = ROLE_ORDER.filter((r) =>
      roleMap.has(r),
    ).map((r) => ({
      key: r,
      label: getRoleLabel(r),
      dotColor: getRoleDotColor(r),
      items: roleMap.get(r)!,
    }));

    if (pendingInvitations.length > 0) {
      result.push({
        key: "pending",
        label: getRoleLabel("pending"),
        dotColor: getRoleDotColor("pending"),
        items: pendingInvitations.map((inv) => ({
          kind: "invitation" as const,
          data: inv,
        })),
      });
    }

    return result;
  }, [members, pendingInvitations]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);

    const { error } = await authClient.organization.inviteMember({
      email: inviteEmail.trim(),
      role: inviteRole as "admin" | "member" | "viewer",
      organizationId: org.id,
    });

    if (error) {
      setInviteError(error.message || "Failed to send invitation.");
      setInviteLoading(false);
      return;
    }

    setInviteLoading(false);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
    router.refresh();
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setActionLoading(true);
    setActionError("");

    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: removeTarget.userId,
      organizationId: org.id,
    });

    if (error) {
      setActionError(error.message || "Failed to remove member.");
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    setRemoveTarget(null);
    router.refresh();
  }

  async function handleRoleChange() {
    if (!roleTarget || !newRole || newRole === roleTarget.role) return;
    setActionLoading(true);
    setActionError("");

    const { error } = await authClient.organization.updateMemberRole({
      memberId: roleTarget.memberId,
      role: newRole as "admin" | "member" | "viewer",
      organizationId: org.id,
    });

    if (error) {
      setActionError(error.message || "Failed to update role.");
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    setRoleTarget(null);
    router.refresh();
  }

  async function handleCancelInvitation(inv: InvitationRow) {
    const { error } = await authClient.organization.cancelInvitation({
      invitationId: inv.id,
    });
    if (error) {
      setActionError(error.message || "Failed to cancel invitation.");
    }
    router.refresh();
  }

  function renderRow(item: ListItem) {
    if (item.kind === "member") {
      return renderMemberRow(item.data);
    }
    return renderInvitationRow(item.data);
  }

  function renderMemberRow(m: MemberRow) {
    const isSelf = m.userId === currentUserId;
    const isSoleOwner = m.role === "owner" && ownerCount <= 1;
    const canAct = !isSelf && !isSoleOwner;

    return (
      <div className={groupedListRowClass}>
        {canAct ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  setRoleTarget(m);
                  setNewRole(m.role);
                  setActionError("");
                }}
              >
                Change role
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setRemoveTarget(m);
                  setActionError("");
                }}
              >
                Remove member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <Avatar className="h-6 w-6">
          <AvatarImage src={m.image ?? undefined} alt={m.name} />
          <AvatarFallback className="text-[10px]">
            {getInitials(m.name)}
          </AvatarFallback>
        </Avatar>

        <span className="min-w-0 flex-1 truncate font-medium">
          {m.name}
          {m.userId === currentUserId && (
            <span className="ml-1 text-muted-foreground">(you)</span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">{m.email}</span>
          <Badge
            variant={roleBadgeVariant[m.role] ?? "outline"}
            className="capitalize text-[10px] leading-none"
          >
            {m.role}
          </Badge>
          <span className="w-12 text-right text-[11px] text-muted-foreground">
            {formatRelativeDate(m.joinedAt)}
          </span>
        </div>
      </div>
    );
  }

  function renderInvitationRow(inv: InvitationRow) {
    return (
      <div className={groupedListRowClass}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleCancelInvitation(inv)}
            >
              Revoke invitation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="min-w-0 flex-1 truncate font-medium">{inv.email}</span>

        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant={roleBadgeVariant[inv.role] ?? "outline"}
            className="capitalize text-[10px] leading-none"
          >
            {inv.role}
          </Badge>
          <span className="w-12 text-right text-[11px] text-muted-foreground">
            {formatRelativeDate(inv.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageBreadcrumb items={[{ label: "Members" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setInviteOpen(true)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite
        </Button>
      </PageBreadcrumb>

      <div className="flex-1">
        <GroupedList
          groups={groups}
          getItemId={(item) =>
            item.kind === "member" ? item.data.memberId : item.data.id
          }
          emptyIcon={
            <Users className="h-10 w-10 text-muted-foreground/40" />
          }
          emptyTitle="No members"
          emptyDescription="Invite members to join this workspace."
          emptyAction={
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Invite member
            </Button>
          }
          renderRow={renderRow}
        />
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {org.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                required
                disabled={inviteLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={setInviteRole}
                disabled={inviteLoading}
              >
                <SelectTrigger className="w-full" id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={inviteLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading && <Loader2 className="animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {removeTarget?.name}
              </span>{" "}
              ({removeTarget?.email}) from {org.name}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog
        open={!!roleTarget}
        onOpenChange={(open) => !open && setRoleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update the role for{" "}
              <span className="font-medium text-foreground">
                {roleTarget?.name}
              </span>{" "}
              ({roleTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
          <div className="space-y-2">
            <Label>New role</Label>
            <Select
              value={newRole}
              onValueChange={setNewRole}
              disabled={actionLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleTarget(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={actionLoading || newRole === roleTarget?.role}
            >
              {actionLoading && <Loader2 className="animate-spin" />}
              Update role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
