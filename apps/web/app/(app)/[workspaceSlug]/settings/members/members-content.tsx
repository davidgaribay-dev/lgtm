"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import {
  type MemberRow,
  type InvitationRow,
  getMemberColumns,
  getInvitationColumns,
} from "./columns";

interface MembersContentProps {
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

const assignableRoles = ["admin", "member", "viewer"] as const;

export function MembersContent({
  org,
  members,
  pendingInvitations,
  currentUserId,
}: MembersContentProps) {
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

  const memberColumns = useMemo(
    () =>
      getMemberColumns({
        currentUserId,
        ownerCount,
        onChangeRole: (m) => {
          setRoleTarget(m);
          setNewRole(m.role);
          setActionError("");
        },
        onRemove: (m) => {
          setRemoveTarget(m);
          setActionError("");
        },
      }),
    [currentUserId, ownerCount],
  );

  const invitationColumns = useMemo(
    () =>
      getInvitationColumns({
        onCancel: async (inv) => {
          setActionLoading(true);
          setActionError("");
          const { error } = await authClient.organization.cancelInvitation({
            invitationId: inv.id,
          });
          if (error) {
            setActionError(error.message || "Failed to cancel invitation.");
          }
          setActionLoading(false);
          router.refresh();
        },
      }),
    [router],
  );

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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage members and invitations for {org.name}.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"} in
            this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={memberColumns}
            data={members}
            emptyMessage="No members found."
          />
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              {pendingInvitations.length} pending{" "}
              {pendingInvitations.length === 1 ? "invitation" : "invitations"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={invitationColumns}
              data={pendingInvitations}
              emptyMessage="No pending invitations."
            />
          </CardContent>
        </Card>
      )}

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
