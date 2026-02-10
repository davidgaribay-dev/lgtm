"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { CreateTeamDialog } from "@/components/create-team-dialog";
import { type TeamRow, getTeamColumns } from "./columns";

interface TeamsContentProps {
  teams: TeamRow[];
  workspaceSlug: string;
  organizationId: string;
  isAdmin: boolean;
  userId: string;
}

export function TeamsContent({
  teams,
  workspaceSlug,
  organizationId,
  isAdmin,
}: TeamsContentProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo(
    () =>
      getTeamColumns({
        workspaceSlug,
        isAdmin,
        onEdit: () => {
          // TODO: edit team dialog
        },
        onDelete: () => {
          // TODO: delete team dialog
        },
      }),
    [workspaceSlug, isAdmin],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage the teams in your workspace.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All teams</CardTitle>
          <CardDescription>
            {teams.length} {teams.length === 1 ? "team" : "teams"} in this
            workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={teams}
            emptyMessage="No teams yet. Create one to get started."
          />
        </CardContent>
      </Card>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onCreated={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
