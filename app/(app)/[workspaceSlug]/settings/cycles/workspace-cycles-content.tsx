"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  type WorkspaceCycleRow,
  getWorkspaceCycleColumns,
} from "./workspace-cycle-columns";

const cycleStatuses = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface WorkspaceCyclesContentProps {
  org: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
}

export function WorkspaceCyclesContent({ org }: WorkspaceCyclesContentProps) {
  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkspaceCycleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceCycleRow | null>(
    null,
  );

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("planned");
  const [formIsCurrent, setFormIsCurrent] = useState(false);

  // Async state
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const { data: cycles, mutate } = useSWR<WorkspaceCycleRow[]>(
    `/api/workspace-cycles?organizationId=${org.id}`,
    fetcher,
  );

  const columns = useMemo(
    () =>
      getWorkspaceCycleColumns({
        onEdit: (cycleData) => {
          setEditTarget(cycleData);
          setFormName(cycleData.name);
          setFormDescription(cycleData.description ?? "");
          setFormStartDate(
            cycleData.startDate
              ? new Date(cycleData.startDate).toISOString().split("T")[0]
              : "",
          );
          setFormEndDate(
            cycleData.endDate
              ? new Date(cycleData.endDate).toISOString().split("T")[0]
              : "",
          );
          setFormStatus(cycleData.status);
          setFormIsCurrent(cycleData.isCurrent);
          setError("");
        },
        onDelete: (cycleData) => {
          setDeleteTarget(cycleData);
          setError("");
        },
      }),
    [],
  );

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("planned");
    setFormIsCurrent(false);
    setError("");
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!formName.trim()) {
      setError("Name is required");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/workspace-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          status: formStatus,
          isCurrent: formIsCurrent,
          organizationId: org.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create workspace cycle");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch {
      setError("Failed to create workspace cycle");
      setIsPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setError("");

    if (!formName.trim()) {
      setError("Name is required");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch(`/api/workspace-cycles/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          status: formStatus,
          isCurrent: formIsCurrent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to update workspace cycle");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setEditTarget(null);
      resetForm();
      mutate();
    } catch {
      setError("Failed to update workspace cycle");
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    setError("");

    try {
      const res = await fetch(`/api/workspace-cycles/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to delete workspace cycle");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setDeleteTarget(null);
      mutate();
    } catch {
      setError("Failed to delete workspace cycle");
      setIsPending(false);
    }
  }

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="cycle-name">Name</Label>
        <Input
          id="cycle-name"
          placeholder="Q1 2024 Release / Version 2.0"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
            setError("");
          }}
          disabled={isPending}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cycle-status">Status</Label>
        <Select
          value={formStatus}
          onValueChange={setFormStatus}
          disabled={isPending}
        >
          <SelectTrigger className="w-full" id="cycle-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cycleStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cycle-start-date">Start Date (optional)</Label>
          <Input
            id="cycle-start-date"
            type="date"
            value={formStartDate}
            onChange={(e) => setFormStartDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cycle-end-date">End Date (optional)</Label>
          <Input
            id="cycle-end-date"
            type="date"
            value={formEndDate}
            onChange={(e) => setFormEndDate(e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cycle-description">Description (optional)</Label>
        <Textarea
          id="cycle-description"
          placeholder="Major release for Q1 2024"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="cycle-current"
          type="checkbox"
          checked={formIsCurrent}
          onChange={(e) => setFormIsCurrent(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="cycle-current" className="text-sm font-normal">
          Set as current workspace cycle
        </Label>
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Workspace Cycles
          </h1>
          <p className="text-muted-foreground">
            Manage cross-team release cycles for {org.name}.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Create cycle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Cycles</CardTitle>
          <CardDescription>
            {cycles?.length ?? 0}{" "}
            {cycles?.length === 1 ? "cycle" : "cycles"} configured for
            cross-team releases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cycles ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={cycles}
              emptyMessage="No workspace cycles configured yet."
            />
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace cycle</DialogTitle>
            <DialogDescription>
              Add a new cross-team release cycle for {org.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {formFields}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit workspace cycle</DialogTitle>
            <DialogDescription>
              Update the workspace cycle configuration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {formFields}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
