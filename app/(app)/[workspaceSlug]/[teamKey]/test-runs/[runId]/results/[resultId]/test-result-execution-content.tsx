"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  PanelRight,
  Clock,
  User,
  MoreHorizontal,
  RotateCcw,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogViewer } from "@/components/log-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStatusColor,
  getStatusLabel,
  getStatusTextColor,
} from "../../../progress-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { CreateDefectDialog } from "../../../../defects/create-defect-dialog";

interface RunInfo {
  id: string;
  name: string;
  runNumber: number | null;
}

interface ResultInfo {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: string;
  source: string;
  executedBy: string | null;
  executedByName: string | null;
  executedByImage: string | null;
  executedAt: Date | string | null;
  duration: number | null;
  comment: string | null;
  caseTitle: string;
  caseKey: string | null;
  casePriority: string | null;
  caseType: string | null;
  sectionId: string | null;
  sectionName: string | null;
}

interface StepData {
  id: string;
  stepOrder: number;
  action: string;
  expectedResult: string | null;
  stepResultId: string | null;
  status: string | null;
  actualResult: string | null;
  comment: string | null;
}

interface StepState {
  testStepId: string;
  status: string;
  actualResult: string;
  comment: string;
}

interface TestResultExecutionContentProps {
  run: RunInfo;
  result: ResultInfo;
  steps: StepData[];
  resultIds: string[];
  teamKey: string;
  workspaceSlug: string;
  hasLogs: boolean;
  projectId: string;
  environments: { id: string; name: string }[];
  cycles: { id: string; name: string }[];
}

const RESULT_STATUSES = ["untested", "passed", "failed", "blocked", "skipped"];

const STATUS_SHORTCUTS: Record<string, { status: string; key: string }> = {
  "1": { status: "passed", key: "1" },
  "2": { status: "failed", key: "2" },
  "3": { status: "blocked", key: "3" },
  "4": { status: "skipped", key: "4" },
};

const STATUS_KEY_MAP: Record<string, string> = {
  passed: "1",
  failed: "2",
  blocked: "3",
  skipped: "4",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TestResultExecutionContent(props: TestResultExecutionContentProps) {
  return <TestResultExecutionInner key={props.result.id} {...props} />;
}

function TestResultExecutionInner({
  run,
  result,
  steps: initialSteps,
  resultIds,
  teamKey,
  workspaceSlug,
  hasLogs,
  projectId,
  environments,
  cycles,
}: TestResultExecutionContentProps) {
  const router = useRouter();
  const [createDefectOpen, setCreateDefectOpen] = useState(false);

  // Step states
  const [stepStates, setStepStates] = useState<StepState[]>(
    initialSteps.map((s) => ({
      testStepId: s.id,
      status: s.status ?? "untested",
      actualResult: s.actualResult ?? "",
      comment: s.comment ?? "",
    })),
  );

  // Overall result state
  const [overallStatus, setOverallStatus] = useState(result.status);
  const [comment, setComment] = useState(result.comment ?? "");
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (!result.duration) return "";
    return String(Math.floor(Math.floor(result.duration / 1000) / 60));
  });
  const [durationSeconds, setDurationSeconds] = useState(() => {
    if (!result.duration) return "";
    return String(Math.floor(result.duration / 1000) % 60);
  });
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Format dates on client only to avoid hydration mismatch
  const [executedAtDisplay, setExecutedAtDisplay] = useState("—");
  useEffect(() => {
    setExecutedAtDisplay(
      result.executedAt ? new Date(result.executedAt).toLocaleString() : "—",
    );
  }, [result.executedAt]);

  // Save state indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track saved values for dirty checking
  const savedRef = useRef({
    status: result.status,
    comment: result.comment ?? "",
    durationMinutes: result.duration
      ? String(Math.floor(Math.floor(result.duration / 1000) / 60))
      : "",
    durationSeconds: result.duration
      ? String(Math.floor(result.duration / 1000) % 60)
      : "",
  });

  function showSaving() {
    clearTimeout(saveTimerRef.current);
    setSaveState("saving");
  }

  function showSaved() {
    setSaveState("saved");
    saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
  }

  // Navigation
  const currentIndex = resultIds.indexOf(result.id);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < resultIds.length - 1;

  const navigateTo = useCallback(
    (index: number) => {
      const targetId = resultIds[index];
      if (targetId) {
        router.push(
          `/${workspaceSlug}/${teamKey}/test-runs/${run.id}/results/${targetId}`,
        );
      }
    },
    [resultIds, router, workspaceSlug, teamKey, run.id],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (canGoPrev) navigateTo(currentIndex - 1);
      } else if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (canGoNext) navigateTo(currentIndex + 1);
      } else if (e.key in STATUS_SHORTCUTS) {
        e.preventDefault();
        handleOverallStatusChange(STATUS_SHORTCUTS[e.key].status);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrev, canGoNext, currentIndex, navigateTo]);

  // Save result fields (status, comment, duration)
  const saveResult = useCallback(
    async (fields: { status?: string; comment?: string | null; duration?: number | null }) => {
      showSaving();
      try {
        await fetch(`/api/test-results/${result.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        router.refresh();
        showSaved();
      } catch {
        setSaveState("idle");
      }
    },
    [result.id, router],
  );

  // Save steps
  const saveSteps = useCallback(
    async (states: StepState[]) => {
      if (states.length === 0) return;
      showSaving();
      try {
        await fetch(`/api/test-results/${result.id}/steps`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: states }),
        });
        showSaved();
      } catch {
        setSaveState("idle");
      }
    },
    [result.id],
  );

  // Auto-compute overall status from step statuses
  function computeOverallFromSteps(states: StepState[]): string | null {
    if (states.length === 0) return null;
    const statuses = states.map((s) => s.status);
    if (statuses.some((s) => s === "failed")) return "failed";
    if (statuses.some((s) => s === "blocked")) return "blocked";
    if (statuses.every((s) => s === "passed")) return "passed";
    if (statuses.every((s) => s === "skipped")) return "skipped";
    return null;
  }

  // Step status change → auto-save steps + auto-compute and save overall
  function handleStepStatusChange(index: number, newStatus: string) {
    setStepStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status: newStatus };

      // Save steps
      saveSteps(next);

      // Auto-compute overall
      const computed = computeOverallFromSteps(next);
      if (computed && computed !== overallStatus) {
        setOverallStatus(computed);
        savedRef.current.status = computed;
        saveResult({ status: computed });
      }

      return next;
    });
  }

  // Step actual result change (just local, save on blur)
  function handleStepActualResultChange(index: number, value: string) {
    setStepStates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], actualResult: value };
      return next;
    });
  }

  // Step actual result blur → save steps
  function handleStepActualResultBlur() {
    saveSteps(stepStates);
  }

  // Overall status click → auto-save
  function handleOverallStatusChange(newStatus: string) {
    setOverallStatus(newStatus);
    savedRef.current.status = newStatus;
    saveResult({ status: newStatus });
  }

  // Fail + Create Defect combo action
  function handleFailAndCreateDefect() {
    handleOverallStatusChange("failed");
    setCreateDefectOpen(true);
  }

  // Comment blur → save if dirty
  function handleCommentBlur() {
    const trimmed = comment.trim();
    if (trimmed === savedRef.current.comment) return;
    savedRef.current.comment = trimmed;
    saveResult({ comment: trimmed || null });
  }

  // Duration blur → save if dirty
  function handleDurationBlur() {
    if (
      durationMinutes === savedRef.current.durationMinutes &&
      durationSeconds === savedRef.current.durationSeconds
    ) {
      return;
    }
    savedRef.current.durationMinutes = durationMinutes;
    savedRef.current.durationSeconds = durationSeconds;
    const mins = parseInt(durationMinutes) || 0;
    const secs = parseInt(durationSeconds) || 0;
    const durationMs = mins > 0 || secs > 0 ? (mins * 60 + secs) * 1000 : null;
    saveResult({ duration: durationMs });
  }

  // Reset result to untested
  async function handleReset() {
    setOverallStatus("untested");
    setComment("");
    setDurationMinutes("");
    setDurationSeconds("");
    setStepStates(
      initialSteps.map((s) => ({
        testStepId: s.id,
        status: "untested",
        actualResult: "",
        comment: "",
      })),
    );
    setSaveState("saving");
    clearTimeout(saveTimerRef.current);
    try {
      const res = await fetch(`/api/test-results/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "untested",
          comment: null,
          duration: null,
        }),
      });
      if (res.ok) {
        setSaveState("saved");
        saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
        router.refresh();
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  }

  return (
    <div className="flex min-h-svh bg-background">
      {/* Left: breadcrumb + main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <PageBreadcrumb
          items={[
            { label: "Test Runs", href: `/${workspaceSlug}/${teamKey}/test-runs` },
            { label: `${run.name}${run.runNumber ? ` #${run.runNumber}` : ""}`, href: `/${workspaceSlug}/${teamKey}/test-runs/${run.id}` },
            { label: result.caseKey ?? result.caseTitle },
          ]}
        >
          {/* Save state indicator */}
          {saveState !== "idle" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {saveState === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3" />
                  <span>Saved</span>
                </>
              )}
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            {currentIndex + 1} of {resultIds.length}
          </span>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!canGoPrev}
                  onClick={() => navigateTo(currentIndex - 1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-1.5">
                <span>Previous result</span>
                <kbd className="rounded border border-white/25 bg-white/15 px-1 py-0.5 font-mono text-[10px]">K</kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!canGoNext}
                  onClick={() => navigateTo(currentIndex + 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-1.5">
                <span>Next result</span>
                <kbd className="rounded border border-white/25 bg-white/15 px-1 py-0.5 font-mono text-[10px]">J</kbd>
              </TooltipContent>
            </Tooltip>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleReset}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reset to Untested
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-0.5 h-4 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className="h-7 w-7 shrink-0 p-0"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {propertiesOpen ? "Hide properties" : "Show properties"}
            </TooltipContent>
          </Tooltip>
        </PageBreadcrumb>

        {/* Tabs + main content */}
        <Tabs defaultValue="execution" className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b px-6 pt-1">
            <TabsList variant="line">
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5">
                Logs
                {hasLogs && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="execution" className="overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
              {/* Title */}
              <h1 className="text-2xl font-bold">{result.caseTitle}</h1>

              {/* Steps */}
              {initialSteps.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">
                    Steps ({initialSteps.length})
                  </h3>
                  {initialSteps.map((step, i) => (
                    <div
                      key={step.id}
                      className="space-y-2 rounded-md border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {step.stepOrder}
                            </span>
                            <span className="text-sm">{step.action}</span>
                          </div>
                          {step.expectedResult && (
                            <p className="ml-7 mt-1 text-xs text-muted-foreground">
                              Expected: {step.expectedResult}
                            </p>
                          )}
                        </div>
                        <Select
                          value={stepStates[i]?.status ?? "untested"}
                          onValueChange={(val) =>
                            handleStepStatusChange(i, val)
                          }
                        >
                          <SelectTrigger
                            className={`h-7 w-[100px] rounded-full border-0 px-2 text-xs font-medium ${getStatusColor(stepStates[i]?.status ?? "untested")}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESULT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                <span
                                  className={`text-xs ${getStatusTextColor(s)}`}
                                >
                                  {getStatusLabel(s)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actual result input when failed */}
                      {stepStates[i]?.status === "failed" && (
                        <div className="ml-7">
                          <Textarea
                            placeholder="Actual result..."
                            value={stepStates[i]?.actualResult ?? ""}
                            onChange={(e) =>
                              handleStepActualResultChange(i, e.target.value)
                            }
                            onBlur={handleStepActualResultBlur}
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No test steps defined for this test case.
                </p>
              )}

              {/* Overall Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Overall Status</Label>
                <div className="flex gap-2">
                  {RESULT_STATUSES.filter((s) => s !== "untested").map((s) =>
                    s === "failed" ? (
                      <div key={s} className="flex flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleOverallStatusChange(s)}
                              className={`flex-1 rounded-l-md border border-r-0 px-3 py-2 text-xs font-medium transition-colors ${
                                overallStatus === s
                                  ? `${getStatusColor(s)} border-current`
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {getStatusLabel(s)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="flex items-center gap-1.5">
                            <span>{getStatusLabel(s)}</span>
                            <kbd className="rounded border border-white/25 bg-white/15 px-1 py-0.5 font-mono text-[10px]">{STATUS_KEY_MAP[s]}</kbd>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`rounded-r-md border px-1 text-xs transition-colors ${
                                overallStatus === s
                                  ? `${getStatusColor(s)} border-current`
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={handleFailAndCreateDefect}>
                              <Bug className="mr-2 h-3.5 w-3.5" />
                              Fail + Create Defect
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <Tooltip key={s}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleOverallStatusChange(s)}
                            className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                              overallStatus === s
                                ? `${getStatusColor(s)} border-current`
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {getStatusLabel(s)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="flex items-center gap-1.5">
                          <span>{getStatusLabel(s)}</span>
                          <kbd className="rounded border border-white/25 bg-white/15 px-1 py-0.5 font-mono text-[10px]">{STATUS_KEY_MAP[s]}</kbd>
                        </TooltipContent>
                      </Tooltip>
                    ),
                  )}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="exec-comment" className="text-sm font-medium">
                  Comment
                </Label>
                <Textarea
                  id="exec-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onBlur={handleCommentBlur}
                  placeholder="Add a comment about this result..."
                  rows={3}
                  className="text-sm"
                />
              </div>

            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ResultLogsTab resultId={result.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Properties sidebar */}
      {propertiesOpen && (
        <div className="w-80 shrink-0 overflow-y-auto border-l bg-card">
          <div className="flex h-11 shrink-0 items-center border-b px-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Properties
            </h3>
          </div>
          <div className="px-6 py-2">
            {/* Status */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(overallStatus)}`}
              >
                {getStatusLabel(overallStatus)}
              </span>
            </div>

            {/* Case Key */}
            {result.caseKey && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Case ID</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {result.caseKey}
                </span>
              </div>
            )}

            {/* Priority */}
            {result.casePriority && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Priority</span>
                <span className="text-sm">{capitalize(result.casePriority)}</span>
              </div>
            )}

            {/* Type */}
            {result.caseType && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm">{capitalize(result.caseType)}</span>
              </div>
            )}

            {/* Section */}
            {result.sectionName && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Section</span>
                <span className="text-sm">{result.sectionName}</span>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Source</span>
              <span className="text-sm">{capitalize(result.source)}</span>
            </div>

            {/* Executed By */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Executed by</span>
              {result.executedByName ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <Avatar className="h-5 w-5">
                    {result.executedByImage && (
                      <AvatarImage
                        src={result.executedByImage}
                        alt={result.executedByName}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(result.executedByName)}
                    </AvatarFallback>
                  </Avatar>
                  {result.executedByName}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">—</span>
                </span>
              )}
            </div>

            {/* Executed At */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Executed at</span>
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {executedAtDisplay}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Duration</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  onBlur={handleDurationBlur}
                  placeholder="0"
                  className="h-7 w-12 rounded-md border bg-background px-1.5 text-center text-sm"
                />
                <span className="text-xs text-muted-foreground">m</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  onBlur={handleDurationBlur}
                  placeholder="0"
                  className="h-7 w-12 rounded-md border bg-background px-1.5 text-center text-sm"
                />
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Defect Dialog */}
      <CreateDefectDialog
        open={createDefectOpen}
        onOpenChange={setCreateDefectOpen}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
        teamKey={teamKey}
        environments={environments}
        cycles={cycles}
        prefill={{
          testResultId: result.id,
          testRunId: run.id,
          testCaseId: result.testCaseId,
          title: `[${result.caseKey ?? result.caseTitle}] Failed`,
          actualResult:
            stepStates.find((s) => s.status === "failed")?.actualResult || undefined,
        }}
      />
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

function ResultLogsTab({ resultId }: { resultId: string }) {
  const [chunks, setChunks] = useState<LogChunk[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/test-results/${resultId}/logs`)
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
  }, [resultId]);

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
