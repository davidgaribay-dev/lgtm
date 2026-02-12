"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2, MoreHorizontal, Plus, RefreshCw, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeamSettings } from "@/lib/team-settings-context";
import { useWorkspace } from "@/lib/workspace-context";
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
  type ListGroup,
} from "@/components/grouped-list";

interface SharedStepRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const sharedStepStatuses = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

function getStatusDotColor(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500 bg-emerald-500/20";
    case "draft":
      return "border-blue-500 bg-blue-500/20";
    case "archived":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "draft":
      return "Draft";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

const STATUS_ORDER = ["active", "draft", "archived"] as const;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SharedStepsList() {
  const { team } = useTeamSettings();
  const { workspace } = useWorkspace();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SharedStepRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedStepRow | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const { data: sharedSteps, mutate } = useSWR<SharedStepRow[]>(
    `/api/shared-steps?projectId=${team.id}`,
    fetcher,
  );

  const groups = useMemo((): ListGroup<SharedStepRow>[] => {
    if (!sharedSteps) return [];
    const map = new Map<string, SharedStepRow[]>();
    for (const s of sharedSteps) {
      const list = map.get(s.status) ?? [];
      list.push(s);
      map.set(s.status, list);
    }
    return STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getStatusLabel(s),
      dotColor: getStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [sharedSteps]);

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("active");
    setError("");
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function handleOpenEdit(step: SharedStepRow) {
    setEditTarget(step);
    setFormTitle(step.title);
    setFormDescription(step.description ?? "");
    setFormStatus(step.status);
    setError("");
  }

  function handleNavigate(step: SharedStepRow) {
    router.push(`/${workspace.slug}/${team.key}/settings/shared-steps/${step.id}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!formTitle.trim()) {
      setError("Title is required");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/shared-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
          projectId: team.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create shared step");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch {
      setError("Failed to create shared step");
      setIsPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setError("");
    if (!formTitle.trim()) {
      setError("Title is required");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(`/api/shared-steps/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to update shared step");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setEditTarget(null);
      resetForm();
      mutate();
    } catch {
      setError("Failed to update shared step");
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    setError("");
    try {
      const res = await fetch(`/api/shared-steps/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to delete shared step");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setDeleteTarget(null);
      mutate();
    } catch {
      setError("Failed to delete shared step");
      setIsPending(false);
    }
  }

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="shared-step-title">Title</Label>
        <Input
          id="shared-step-title"
          placeholder="Login / Authentication"
          value={formTitle}
          onChange={(e) => {
            setFormTitle(e.target.value);
            setError("");
          }}
          disabled={isPending}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shared-step-status">Status</Label>
        <Select
          value={formStatus}
          onValueChange={setFormStatus}
          disabled={isPending}
        >
          <SelectTrigger className="w-full" id="shared-step-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sharedStepStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="shared-step-description">Description (optional)</Label>
        <Textarea
          id="shared-step-description"
          placeholder="Common steps for user authentication flow"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>
    </>
  );

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb items={[{ label: "Shared Steps" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleOpenCreate}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </PageBreadcrumb>

      <div className="flex-1">
        {!sharedSteps ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GroupedList
            groups={groups}
            getItemId={(s) => s.id}
            emptyIcon={
              <Workflow className="h-10 w-10 text-muted-foreground/40" />
            }
            emptyTitle="No shared steps yet"
            emptyDescription="Create reusable step sequences to share across test cases."
            emptyAction={
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Shared Step
              </Button>
            }
            renderRow={(step) => (
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
                    <DropdownMenuItem onClick={() => handleOpenEdit(step)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget(step);
                        setError("");
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getStatusDotColor(step.status)}`}
                />

                <button
                  type="button"
                  onClick={() => handleNavigate(step)}
                  className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
                >
                  {step.title}
                </button>

                {step.description && (
                  <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                    {step.description}
                  </span>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create shared step</DialogTitle>
            <DialogDescription>
              Add a reusable step sequence for {team.name}.
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
            <DialogTitle>Edit shared step</DialogTitle>
            <DialogDescription>
              Update the shared step configuration.
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
            <DialogTitle>Delete shared step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ? This action cannot be undone. Test cases using this shared step
              will no longer reference it.
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
