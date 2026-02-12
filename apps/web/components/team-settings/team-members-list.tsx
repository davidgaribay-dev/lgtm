"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, RefreshCw, Users } from "lucide-react";
import { useTeamSettings } from "@/lib/team-settings-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  formatRelativeDate,
  type ListGroup,
} from "@/components/grouped-list";

interface TeamMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: string;
}

interface AvailableOrgMember {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  orgRole: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ROLE_ORDER = [
  "team_owner",
  "team_admin",
  "team_member",
  "team_viewer",
] as const;

const ROLE_LABELS: Record<string, string> = {
  team_owner: "Owners",
  team_admin: "Admins",
  team_member: "Members",
  team_viewer: "Viewers",
};

const ROLE_BADGE_LABELS: Record<string, string> = {
  team_owner: "Owner",
  team_admin: "Admin",
  team_member: "Member",
  team_viewer: "Viewer",
};

function getRoleDotColor(role: string) {
  switch (role) {
    case "team_owner":
      return "border-emerald-500 bg-emerald-500/20";
    case "team_admin":
      return "border-blue-500 bg-blue-500/20";
    case "team_member":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "team_viewer":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "team_owner":
      return "default";
    case "team_admin":
      return "secondary";
    default:
      return "outline";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamMembersList() {
  const router = useRouter();
  const { team } = useTeamSettings();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  const { data: members, mutate: mutateMembers } = useSWR<TeamMember[]>(
    `/api/teams/${team.id}/members`,
    fetcher,
  );

  const { data: availableMembers } = useSWR<AvailableOrgMember[]>(
    addDialogOpen
      ? `/api/organizations/${team.organizationId}/members?excludeTeam=${team.id}`
      : null,
    fetcher,
  );

  const groups = useMemo((): ListGroup<TeamMember>[] => {
    if (!members) return [];
    const map = new Map<string, TeamMember[]>();
    for (const m of members) {
      const list = map.get(m.role) ?? [];
      list.push(m);
      map.set(m.role, list);
    }
    return ROLE_ORDER.filter((r) => map.has(r)).map((r) => ({
      key: r,
      label: ROLE_LABELS[r] ?? r,
      dotColor: getRoleDotColor(r),
      items: map.get(r)!,
    }));
  }, [members]);

  async function handleRoleChange(memberId: string, newRole: string) {
    const res = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      mutateMembers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update member role");
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;

    const res = await fetch(
      `/api/teams/${team.id}/members/${removeTarget.memberId}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      mutateMembers();
      setRemoveTarget(null);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to remove member");
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb items={[{ label: "Members" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAddDialogOpen(true)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </PageBreadcrumb>

      <div className="flex-1">
        {!members ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GroupedList
            groups={groups}
            getItemId={(m) => m.memberId}
            emptyIcon={
              <Users className="h-10 w-10 text-muted-foreground/40" />
            }
            emptyTitle="No team members"
            emptyDescription="Add organization members to this team to get started."
            emptyAction={
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Member
              </Button>
            }
            renderRow={(member) => (
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
                    {ROLE_ORDER.filter((r) => r !== member.role).map((r) => (
                      <DropdownMenuItem
                        key={r}
                        onClick={() => handleRoleChange(member.memberId, r)}
                      >
                        Change to {ROLE_BADGE_LABELS[r]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <span className="min-w-0 flex-1 truncate font-medium">
                  {member.name}
                </span>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                  <Badge
                    variant={getRoleBadgeVariant(member.role)}
                    className="text-[10px] leading-none"
                  >
                    {ROLE_BADGE_LABELS[member.role] ?? member.role}
                  </Badge>
                  <span className="w-12 text-right text-[11px] text-muted-foreground">
                    {formatRelativeDate(member.joinedAt)}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Add member dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        teamId={team.id}
        availableMembers={availableMembers ?? []}
        onMemberAdded={() => {
          mutateMembers();
          router.refresh();
        }}
      />

      {/* Remove member confirmation */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeTarget?.name} from this
              team? They will lose access to all team resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  availableMembers,
  onMemberAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  availableMembers: AvailableOrgMember[];
  onMemberAdded: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("team_member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!selectedUserId) {
      setError("Please select a member to add");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      onMemberAdded();
      onOpenChange(false);
      setSelectedUserId("");
      setSelectedRole("team_member");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Select an organization member to add to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Member</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_owner">Team Owner</SelectItem>
                <SelectItem value="team_admin">Team Admin</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="team_viewer">Team Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || !selectedUserId}>
            {loading ? "Adding..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
