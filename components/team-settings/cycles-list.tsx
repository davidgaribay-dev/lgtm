"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Calendar, Loader2, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeamSettings } from "@/lib/team-settings-context";
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
import type { CycleRow } from "./cycle-columns";

const cycleStatuses = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

function getCycleStatusDotColor(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500 bg-emerald-500/20";
    case "planned":
      return "border-blue-500 bg-blue-500/20";
    case "completed":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getCycleStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "planned":
      return "Planned";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

const CYCLE_STATUS_ORDER = ["active", "planned", "completed"] as const;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatTimeline(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${startDate ? fmt(startDate) : "?"} → ${endDate ? fmt(endDate) : "?"}`;
}

export function CyclesList() {
  const { team } = useTeamSettings();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CycleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CycleRow | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("planned");
  const [formIsCurrent, setFormIsCurrent] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const { data: cycles, mutate } = useSWR<CycleRow[]>(
    `/api/cycles?projectId=${team.id}`,
    fetcher,
  );

  const groups = useMemo((): ListGroup<CycleRow>[] => {
    if (!cycles) return [];
    const map = new Map<string, CycleRow[]>();
    for (const c of cycles) {
      const list = map.get(c.status) ?? [];
      list.push(c);
      map.set(c.status, list);
    }
    return CYCLE_STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getCycleStatusLabel(s),
      dotColor: getCycleStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [cycles]);

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

  function handleOpenEdit(cycleData: CycleRow) {
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
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          status: formStatus,
          isCurrent: formIsCurrent,
          projectId: team.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create cycle");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch {
      setError("Failed to create cycle");
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
      const res = await fetch(`/api/cycles/${editTarget.id}`, {
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
        setError(data.message || "Failed to update cycle");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setEditTarget(null);
      resetForm();
      mutate();
    } catch {
      setError("Failed to update cycle");
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    setError("");
    try {
      const res = await fetch(`/api/cycles/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to delete cycle");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setDeleteTarget(null);
      mutate();
    } catch {
      setError("Failed to delete cycle");
      setIsPending(false);
    }
  }

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="cycle-name">Name</Label>
        <Input
          id="cycle-name"
          placeholder="Sprint 24 / Release 2.0"
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
          placeholder="Q1 release cycle"
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
          Set as current cycle
        </Label>
      </div>
    </>
  );

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb items={[{ label: "Cycles" }]}>
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
        {!cycles ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GroupedList
            groups={groups}
            getItemId={(c) => c.id}
            emptyIcon={
              <Calendar className="h-10 w-10 text-muted-foreground/40" />
            }
            emptyTitle="No cycles configured"
            emptyDescription="Add your first cycle to organize test execution by sprint."
            emptyAction={
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Cycle
              </Button>
            }
            renderRow={(cycle) => {
              const timeline = formatTimeline(cycle.startDate, cycle.endDate);
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
                      <DropdownMenuItem onClick={() => handleOpenEdit(cycle)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDeleteTarget(cycle);
                          setError("");
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getCycleStatusDotColor(cycle.status)}`}
                  />

                  <span className="min-w-0 flex-1 truncate font-medium">
                    {cycle.name}
                  </span>

                  <div className="flex shrink-0 items-center gap-3">
                    {cycle.isCurrent && (
                      <Badge variant="default" className="text-[10px] leading-none">
                        Current
                      </Badge>
                    )}

                    {timeline && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {timeline}
                      </span>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create cycle</DialogTitle>
            <DialogDescription>
              Add a new release cycle or sprint for {team.name}.
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
            <DialogTitle>Edit cycle</DialogTitle>
            <DialogDescription>
              Update the cycle configuration.
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
            <DialogTitle>Delete cycle</DialogTitle>
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
