"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  StackedProgressBar,
  getStatusLabel,
} from "./progress-bar";
import type { TestRunRow } from "./test-run-columns";
import { CreateTestRunDialog } from "./create-test-run-dialog";
import type { TreeNode } from "@/lib/tree-utils";

function getRunStatusDotColor(status: string) {
  switch (status) {
    case "pending":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "in_progress":
      return "border-blue-500 bg-blue-500/20";
    case "passed":
      return "border-emerald-500 bg-emerald-500/20";
    case "failed":
      return "border-red-500 bg-red-500/20";
    case "blocked":
      return "border-amber-500 bg-amber-500/20";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

const RUN_STATUS_ORDER = [
  "in_progress",
  "pending",
  "passed",
  "failed",
  "blocked",
] as const;

interface TestPlanSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  caseCount: number;
}

interface TestRunsContentProps {
  projectId: string;
  teamKey: string;
  teamName: string;
  workspaceSlug: string;
  initialRuns: TestRunRow[];
  environments: { id: string; name: string }[];
  cycles: { id: string; name: string }[];
  treeData: TreeNode[];
  testCases: { id: string; title: string; caseKey: string | null; sectionId: string | null; suiteId: string | null }[];
  testPlans: TestPlanSummary[];
}

export function TestRunsContent({
  projectId,
  teamKey,
  teamName,
  workspaceSlug,
  initialRuns,
  environments,
  cycles,
  treeData,
  testCases,
  testPlans,
}: TestRunsContentProps) {
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestRunRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const groups = useMemo((): ListGroup<TestRunRow>[] => {
    const map = new Map<string, TestRunRow[]>();
    for (const r of runs) {
      const list = map.get(r.status) ?? [];
      list.push(r);
      map.set(r.status, list);
    }
    return RUN_STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getStatusLabel(s),
      dotColor: getRunStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [runs]);

  async function handleAbort(run: TestRunRow) {
    try {
      await fetch(`/api/test-runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "blocked" }),
      });
      router.refresh();
      setRuns((prev) =>
        prev.map((r) =>
          r.id === run.id ? { ...r, status: "blocked" } : r,
        ),
      );
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await fetch(`/api/test-runs/${deleteTarget.id}`, { method: "DELETE" });
      setRuns((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb items={[{ label: teamName }, { label: "Test Runs" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCreateOpen(true)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </PageBreadcrumb>

      <div className="flex-1">
        <GroupedList
          groups={groups}
          getItemId={(r) => r.id}
          emptyIcon={
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
          }
          emptyTitle="No test runs yet"
          emptyDescription="Create your first test run to start executing test cases."
          emptyAction={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Test Run
            </Button>
          }
          renderRow={(run) => {
            const isActive =
              run.status === "pending" || run.status === "in_progress";
            return (
              <Link
                href={`/${workspaceSlug}/${teamKey}/test-runs/${run.runKey}`}
                className={groupedListRowClass}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.preventDefault()}
                  >
                    <button
                      type="button"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    onClick={(e) => e.preventDefault()}
                  >
                    {isActive && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleAbort(run);
                        }}
                      >
                        Abort run
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(run);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Run number */}
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  #{run.runNumber}
                </span>

                {/* Status dot */}
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getRunStatusDotColor(run.status)}`}
                />

                {/* Name */}
                <span className="min-w-0 flex-1 truncate">
                  {run.name}
                </span>

                {/* Right metadata */}
                <div className="flex shrink-0 items-center gap-3">
                  {/* Progress bar */}
                  <div className="w-24">
                    <StackedProgressBar
                      metrics={run.metrics}
                      total={run.totalCases}
                    />
                  </div>

                  {/* Cases count */}
                  <span className="w-14 text-right text-xs text-muted-foreground">
                    {run.totalCases} cases
                  </span>

                  {/* Environment */}
                  {run.environmentName && (
                    <span className="w-20 truncate text-xs text-muted-foreground">
                      {run.environmentName}
                    </span>
                  )}

                  {/* Date */}
                  <span className="w-12 text-right text-[11px] text-muted-foreground">
                    {formatRelativeDate(run.createdAt)}
                  </span>
                </div>
              </Link>
            );
          }}
        />
      </div>

      {/* Create Dialog */}
      <CreateTestRunDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        teamKey={teamKey}
        environments={environments}
        cycles={cycles}
        treeData={treeData}
        testCases={testCases}
        testPlans={testPlans}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and
              all its results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
