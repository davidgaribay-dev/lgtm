"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreHorizontal,
  Clock,
  User,
  PanelRight,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { Label as RechartsLabel, Pie, PieChart } from "recharts";
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
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogViewer } from "@/components/log-viewer";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  type ListGroup,
} from "@/components/grouped-list";
import {
  getStatusColor,
  getStatusLabel,
} from "../progress-bar";
import type { TestResultRow } from "./test-result-columns";

interface RunMetrics {
  untested: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
  passRate: number;
}

interface TestRunDetail {
  id: string;
  name: string;
  runNumber: number | null;
  description: string | null;
  projectId: string;
  testPlanId: string | null;
  status: string;
  environmentId: string | null;
  environmentName: string | null;
  cycleId: string | null;
  cycleName: string | null;
  workspaceCycleId: string | null;
  workspaceCycleName: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  executedBy: string | null;
  createdAt: Date | string;
  createdBy: string | null;
  createdByName: string | null;
}

interface TestRunDetailContentProps {
  run: TestRunDetail;
  initialResults: TestResultRow[];
  metrics: RunMetrics;
  projectId: string;
  teamKey: string;
  workspaceSlug: string;
  hasLogs: boolean;
}

const RESULT_STATUSES = ["untested", "passed", "failed", "blocked", "skipped"];

const RESULT_STATUS_ORDER = [
  "failed",
  "blocked",
  "untested",
  "passed",
  "skipped",
] as const;

function getResultStatusDotColor(status: string) {
  switch (status) {
    case "passed":
      return "border-emerald-500 bg-emerald-500/20";
    case "failed":
      return "border-red-500 bg-red-500/20";
    case "blocked":
      return "border-amber-500 bg-amber-500/20";
    case "skipped":
      return "border-violet-500 bg-violet-500/20";
    case "untested":
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
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

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const chartConfig = {
  count: { label: "Count" },
  passed: { label: "Passed", color: "oklch(0.723 0.191 149.58)" },
  failed: { label: "Failed", color: "oklch(0.637 0.237 25.33)" },
  blocked: { label: "Blocked", color: "oklch(0.769 0.188 70.08)" },
  skipped: { label: "Skipped", color: "oklch(0.606 0.25 292.72)" },
  untested: { label: "Untested", color: "oklch(0.556 0.000 0.00)" },
} satisfies ChartConfig;

const legendItems = [
  { key: "passed", label: "Passed", dotClass: "bg-emerald-500" },
  { key: "failed", label: "Failed", dotClass: "bg-red-500" },
  { key: "blocked", label: "Blocked", dotClass: "bg-amber-500" },
  { key: "skipped", label: "Skipped", dotClass: "bg-violet-500" },
  { key: "untested", label: "Untested", dotClass: "bg-muted-foreground/40" },
] as const;

export function TestRunDetailContent({
  run,
  initialResults,
  metrics: initialMetrics,
  teamKey,
  workspaceSlug,
  hasLogs,
}: TestRunDetailContentProps) {
  const router = useRouter();
  const [results, setResults] = useState(initialResults);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [runStatus, setRunStatus] = useState(run.status);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Format dates on client only to avoid hydration mismatch
  const [createdAtDisplay, setCreatedAtDisplay] = useState("—");
  useEffect(() => {
    setCreatedAtDisplay(
      run.createdAt ? new Date(run.createdAt).toLocaleString() : "—",
    );
  }, [run.createdAt]);

  const chartData = useMemo(() => {
    return [
      { status: "passed", count: metrics.passed, fill: "var(--color-passed)" },
      { status: "failed", count: metrics.failed, fill: "var(--color-failed)" },
      { status: "blocked", count: metrics.blocked, fill: "var(--color-blocked)" },
      { status: "skipped", count: metrics.skipped, fill: "var(--color-skipped)" },
      { status: "untested", count: metrics.untested, fill: "var(--color-untested)" },
    ].filter((d) => d.count > 0);
  }, [metrics]);

  const groups = useMemo((): ListGroup<TestResultRow>[] => {
    const map = new Map<string, TestResultRow[]>();
    for (const r of results) {
      const list = map.get(r.status) ?? [];
      list.push(r);
      map.set(r.status, list);
    }
    return RESULT_STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getStatusLabel(s),
      dotColor: getResultStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [results]);

  // Recompute local metrics when results change
  useMemo(() => {
    const m = { untested: 0, passed: 0, failed: 0, blocked: 0, skipped: 0 };
    for (const r of results) {
      if (r.status in m) {
        (m as Record<string, number>)[r.status]++;
      }
    }
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    const passRate =
      total > 0 ? Math.round(((m.passed / total) * 100) * 10) / 10 : 0;
    setMetrics({ ...m, total, passRate });
  }, [results]);

  async function handleResultStatusChange(resultId: string, newStatus: string) {
    setResults((prev) =>
      prev.map((r) =>
        r.id === resultId ? { ...r, status: newStatus } : r,
      ),
    );

    try {
      await fetch(`/api/test-results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch {
      setResults(initialResults);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    try {
      await fetch(`/api/test-runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setRunStatus(newStatus);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await fetch(`/api/test-runs/${run.id}`, { method: "DELETE" });
      router.push(`/${workspaceSlug}/${teamKey}/test-runs`);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  const [activeTab, setActiveTab] = useState("results");

  return (
    <div className="flex min-h-svh bg-background">
      {/* Left: breadcrumb + main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <PageBreadcrumb
          items={[
            { label: "Test Runs", href: `/${workspaceSlug}/${teamKey}/test-runs` },
            { label: `${run.name}${run.runNumber ? ` #${run.runNumber}` : ""}` },
          ]}
        >
          {runStatus === "pending" && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange("in_progress")}
              disabled={actionLoading}
            >
              <Play className="mr-1 h-3 w-3" />
              Start Run
            </Button>
          )}
          {runStatus === "in_progress" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  const finalStatus =
                    metrics.failed > 0
                      ? "failed"
                      : metrics.blocked > 0
                        ? "blocked"
                        : "passed";
                  handleStatusChange(finalStatus);
                }}
                disabled={actionLoading}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleStatusChange("blocked")}
                disabled={actionLoading}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Abort
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-0.5 h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPropertiesOpen(!propertiesOpen)}
            className="h-7 w-7 shrink-0 p-0"
            title={propertiesOpen ? "Hide properties" : "Show properties"}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </PageBreadcrumb>

        {/* Tabs + main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b px-6 pt-1">
            <TabsList variant="line">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5">
                Logs
                {hasLogs && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="results" className="flex-1 overflow-y-auto">
            <GroupedList
              groups={groups}
              getItemId={(r) => r.id}
              emptyIcon={
                <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
              }
              emptyTitle="No test results"
              emptyDescription="This test run has no test cases assigned."
              renderRow={(result) => (
                <Link
                  href={`/${workspaceSlug}/${teamKey}/test-runs/${run.id}/results/${result.id}`}
                  className={groupedListRowClass}
                >
                  {/* Status change dropdown */}
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
                      {RESULT_STATUSES.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          disabled={s === result.status}
                          onClick={(e) => {
                            e.preventDefault();
                            handleResultStatusChange(result.id, s);
                          }}
                        >
                          <span
                            className={`h-2 w-2 rounded-full border ${getResultStatusDotColor(s)}`}
                          />
                          <span className={s === result.status ? "font-medium" : ""}>
                            {getStatusLabel(s)}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Case key */}
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    {result.caseKey ?? "—"}
                  </span>

                  {/* Status dot */}
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getResultStatusDotColor(result.status)}`}
                  />

                  {/* Title */}
                  <span className="min-w-0 flex-1 truncate">
                    {result.caseTitle}
                  </span>

                  {/* Right metadata */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Comment indicator */}
                    {result.comment && (
                      <Tooltip>
                        <TooltipTrigger
                          onClick={(e) => e.preventDefault()}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs">{result.comment}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Duration */}
                    {formatDuration(result.duration) && (
                      <span className="w-14 text-right text-xs text-muted-foreground">
                        {formatDuration(result.duration)}
                      </span>
                    )}

                    {/* Assignee */}
                    {result.executedByName ? (
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={result.executedByImage ?? undefined}
                          alt={result.executedByName}
                        />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(result.executedByName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="w-5" />
                    )}
                  </div>
                </Link>
              )}
            />
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <RunLogsTab runId={run.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: Properties panel — full height */}
      {propertiesOpen && (
        <div className="w-80 shrink-0 overflow-y-auto border-l bg-card">
          <div className="flex h-11 shrink-0 items-center border-b px-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Properties
            </h3>
          </div>
          <div className="px-6 py-2">
            <div>
              {/* Status */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(runStatus)}`}
                >
                  {getStatusLabel(runStatus)}
                </span>
              </div>

              {/* Environment */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Environment</span>
                <span className="text-sm">
                  {run.environmentName ?? "—"}
                </span>
              </div>

              {/* Cycle */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Cycle</span>
                <span className="text-sm">
                  {run.cycleName ?? "—"}
                </span>
              </div>

              {/* Created by */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Created by</span>
                <span className="flex items-center gap-1.5 text-sm">
                  {run.createdByName ? (
                    <>
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {run.createdByName}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              {/* Created at */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {createdAtDisplay}
                </span>
              </div>

              {/* Description */}
              {run.description && (
                <div className="py-2.5">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <p className="mt-1 text-sm">{run.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Donut chart */}
          <div className="px-6 pt-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Results
            </h3>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[180px]"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={50}
                  outerRadius={75}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  <RechartsLabel
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {metrics.passRate}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 20}
                              className="fill-muted-foreground text-xs"
                            >
                              pass rate
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="mt-3 space-y-1.5 pb-6">
              {legendItems.map(({ key, label, dotClass }) => {
                const count = metrics[key];
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{run.name}&quot; and all its
              results. This action cannot be undone.
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

/* ------------------------------------------------------------------ */
/*  Lazy-loaded logs tab                                               */
/* ------------------------------------------------------------------ */

interface LogChunk {
  id: string;
  stepName: string | null;
  content: string;
  lineOffset: number;
  lineCount: number;
}

function RunLogsTab({ runId }: { runId: string }) {
  const [chunks, setChunks] = useState<LogChunk[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/test-runs/${runId}/logs`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setChunks(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Failed to load logs.
      </div>
    );
  }

  if (chunks === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading logs...
      </div>
    );
  }

  return <LogViewer chunks={chunks} className="h-full" />;
}
