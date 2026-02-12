"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ClipboardList, Loader2, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TestCaseTreePicker } from "@/components/test-case-tree-picker";
import type { TestPlanRow } from "./test-plan-columns";
import type { TreeNode } from "@/lib/tree-utils";

const planStatuses = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

function getPlanStatusDotColor(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500 bg-emerald-500/20";
    case "draft":
      return "border-blue-500 bg-blue-500/20";
    case "completed":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "archived":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getPlanStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "draft":
      return "Draft";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

const PLAN_STATUS_ORDER = ["active", "draft", "completed", "archived"] as const;

interface TreeData {
  treeData: TreeNode[];
  testCases: {
    id: string;
    title: string;
    caseKey: string | null;
    sectionId: string | null;
    suiteId: string | null;
  }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TestPlansList() {
  const { team } = useTeamSettings();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TestPlanRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestPlanRow | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  // Tree state for create/edit dialogs
  const [treeState, setTreeState] = useState<TreeData | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(
    new Set(),
  );

  // Async state
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const { data: plans, mutate } = useSWR<TestPlanRow[]>(
    `/api/test-plans?projectId=${team.id}`,
    fetcher,
  );

  const groups = useMemo((): ListGroup<TestPlanRow>[] => {
    if (!plans) return [];
    const map = new Map<string, TestPlanRow[]>();
    for (const p of plans) {
      const list = map.get(p.status) ?? [];
      list.push(p);
      map.set(p.status, list);
    }
    return PLAN_STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getPlanStatusLabel(s),
      dotColor: getPlanStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [plans]);

  // Fetch tree data when create or edit dialog opens
  useEffect(() => {
    if (!createOpen && !editTarget) return;

    let cancelled = false;
    setTreeLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/test-repo?projectId=${team.id}`);
        if (!res.ok) throw new Error("Failed to load tree");
        const data: TreeData = await res.json();
        if (!cancelled) {
          setTreeState(data);
        }
      } catch {
        // Tree loading failed — user will see empty tree
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [createOpen, editTarget, team.id]);

  // Load existing plan cases when editing
  useEffect(() => {
    if (!editTarget) return;

    let cancelled = false;
    async function loadCases() {
      try {
        const res = await fetch(`/api/test-plans/${editTarget!.id}/cases`);
        if (!res.ok) return;
        const cases = await res.json();
        if (!cancelled) {
          setSelectedCaseIds(
            new Set(
              cases.map((c: { testCaseId: string }) => c.testCaseId),
            ),
          );
        }
      } catch {
        // Failed to load cases
      }
    }

    loadCases();
    return () => {
      cancelled = true;
    };
  }, [editTarget]);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormStatus("draft");
    setSelectedCaseIds(new Set());
    setTreeState(null);
    setError("");
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function handleOpenEdit(plan: TestPlanRow) {
    setEditTarget(plan);
    setFormName(plan.name);
    setFormDescription(plan.description ?? "");
    setFormStatus(plan.status);
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
      const res = await fetch("/api/test-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          projectId: team.id,
          testCaseIds: Array.from(selectedCaseIds),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create test plan");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch {
      setError("Failed to create test plan");
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
      // Update metadata and cases in parallel
      const [metaRes, casesRes] = await Promise.all([
        fetch(`/api/test-plans/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            status: formStatus,
          }),
        }),
        fetch(`/api/test-plans/${editTarget.id}/cases`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCaseIds: Array.from(selectedCaseIds),
          }),
        }),
      ]);

      if (!metaRes.ok) {
        const data = await metaRes.json();
        setError(data.error || "Failed to update test plan");
        setIsPending(false);
        return;
      }

      if (!casesRes.ok) {
        const data = await casesRes.json();
        setError(data.error || "Failed to update plan cases");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setEditTarget(null);
      resetForm();
      mutate();
    } catch {
      setError("Failed to update test plan");
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    setError("");

    try {
      const res = await fetch(`/api/test-plans/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete test plan");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setDeleteTarget(null);
      mutate();
    } catch {
      setError("Failed to delete test plan");
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageBreadcrumb items={[{ label: "Test Plans" }]}>
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
        {!plans ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GroupedList
            groups={groups}
            getItemId={(p) => p.id}
            emptyIcon={
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            }
            emptyTitle="No test plans"
            emptyDescription="Create a reusable selection of test cases."
            emptyAction={
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Test Plan
              </Button>
            }
            renderRow={(plan) => (
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
                    <DropdownMenuItem onClick={() => handleOpenEdit(plan)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget(plan);
                        setError("");
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getPlanStatusDotColor(plan.status)}`}
                />

                <span className="min-w-0 flex-1 truncate font-medium">
                  {plan.name}
                </span>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {plan.caseCount} {plan.caseCount === 1 ? "case" : "cases"}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle>Create test plan</DialogTitle>
            <DialogDescription>
              Create a reusable selection of test cases for {team.name}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCreate}
            className="flex flex-1 flex-col min-h-0 px-6 pb-6"
          >
            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
            <div className="mt-4 space-y-3 shrink-0">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  placeholder="Smoke Test Suite / Regression Pack"
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
                <Label htmlFor="plan-description">
                  Description (optional)
                </Label>
                <Textarea
                  id="plan-description"
                  placeholder="Describe what this plan covers..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={isPending}
                  rows={2}
                />
              </div>
            </div>

            {/* Tree picker */}
            <div className="mt-3 flex flex-col flex-1 min-h-0">
              <Label className="mb-2 text-sm">Test Cases</Label>
              {treeLoading ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading test cases...
                </div>
              ) : treeState ? (
                <TestCaseTreePicker
                  treeData={treeState.treeData}
                  testCases={treeState.testCases}
                  selectedCaseIds={selectedCaseIds}
                  onSelectionChange={setSelectedCaseIds}
                  className="flex-1"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  No test cases available.
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 shrink-0">
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
                Create plan ({selectedCaseIds.size} cases)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle>Edit test plan</DialogTitle>
            <DialogDescription>
              Update the plan configuration and test case selection.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEdit}
            className="flex flex-1 flex-col min-h-0 px-6 pb-6"
          >
            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
            <div className="mt-4 space-y-3 shrink-0">
              <div className="space-y-2">
                <Label htmlFor="edit-plan-name">Name</Label>
                <Input
                  id="edit-plan-name"
                  placeholder="Smoke Test Suite / Regression Pack"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-description">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="edit-plan-description"
                    placeholder="Describe what this plan covers..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={isPending}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-status">Status</Label>
                  <Select
                    value={formStatus}
                    onValueChange={setFormStatus}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full" id="edit-plan-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planStatuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tree picker */}
            <div className="mt-3 flex flex-col flex-1 min-h-0">
              <Label className="mb-2 text-sm">Test Cases</Label>
              {treeLoading ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading test cases...
                </div>
              ) : treeState ? (
                <TestCaseTreePicker
                  treeData={treeState.treeData}
                  testCases={treeState.testCases}
                  selectedCaseIds={selectedCaseIds}
                  onSelectionChange={setSelectedCaseIds}
                  className="flex-1"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  No test cases available.
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 shrink-0">
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
                Save changes ({selectedCaseIds.size} cases)
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
            <DialogTitle>Delete test plan</DialogTitle>
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
