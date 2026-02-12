"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  PanelRight,
  Clock,
  User,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { CommentSection } from "@/components/comments/comment-section";
import {
  getDefectStatusColor,
  getDefectStatusLabel,
  getDefectSeverityColor,
} from "../defect-status-helpers";

interface DefectInfo {
  id: string;
  title: string;
  description: string | null;
  defectNumber: number | null;
  defectKey: string | null;
  severity: string;
  priority: string;
  defectType: string;
  status: string;
  resolution: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  testResultId: string | null;
  testRunId: string | null;
  testRunName: string | null;
  testCaseId: string | null;
  testCaseKey: string | null;
  testCaseTitle: string | null;
  externalUrl: string | null;
  projectId: string;
  environmentId: string | null;
  environmentName: string | null;
  cycleId: string | null;
  cycleName: string | null;
  workspaceCycleId: string | null;
  workspaceCycleName: string | null;
  createdAt: Date | string;
  createdBy: string;
  createdByName: string | null;
  createdByImage: string | null;
}

interface DefectDetailContentProps {
  defect: DefectInfo;
  projectId: string;
  teamKey: string;
  workspaceSlug: string;
  environments: { id: string; name: string }[];
  cycles: { id: string; name: string }[];
}

export function DefectDetailContent(props: DefectDetailContentProps) {
  return <DefectDetailInner key={props.defect.id} {...props} />;
}

function DefectDetailInner({
  defect,
  projectId,
  teamKey,
  workspaceSlug,
  environments,
  cycles,
}: DefectDetailContentProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [title, setTitle] = useState(defect.title);
  const [description, setDescription] = useState(defect.description ?? "");
  const [stepsToReproduce, setStepsToReproduce] = useState(
    defect.stepsToReproduce ?? "",
  );
  const [expectedResult, setExpectedResult] = useState(
    defect.expectedResult ?? "",
  );
  const [actualResult, setActualResult] = useState(defect.actualResult ?? "");
  const [externalUrl, setExternalUrl] = useState(defect.externalUrl ?? "");
  const [status, setStatus] = useState(defect.status);

  // Properties sidebar
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Save state indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dirty tracking
  const savedRef = useRef({
    title: defect.title,
    description: defect.description ?? "",
    stepsToReproduce: defect.stepsToReproduce ?? "",
    expectedResult: defect.expectedResult ?? "",
    actualResult: defect.actualResult ?? "",
    externalUrl: defect.externalUrl ?? "",
  });

  // Auto-focus title for newly created defects
  useEffect(() => {
    if (defect.title === "Untitled defect") {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side date formatting
  const [createdAtDisplay, setCreatedAtDisplay] = useState("—");
  useEffect(() => {
    setCreatedAtDisplay(
      defect.createdAt
        ? new Date(defect.createdAt).toLocaleString()
        : "—",
    );
  }, [defect.createdAt]);

  function showSaving() {
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }

  function showSaved() {
    setSaveState("saved");
    saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
  }

  const patchDefect = useCallback(
    async (fields: Record<string, unknown>) => {
      showSaving();
      try {
        const res = await fetch(`/api/defects/${defect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (res.ok) {
          router.refresh();
          showSaved();
        } else {
          setSaveState("idle");
        }
      } catch {
        setSaveState("idle");
      }
    },
    [defect.id, router],
  );

  // Field blur handlers with dirty checking
  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed === savedRef.current.title || !trimmed) return;
    savedRef.current.title = trimmed;
    patchDefect({ title: trimmed });
  }

  function handleDescriptionBlur() {
    const trimmed = description.trim();
    if (trimmed === savedRef.current.description) return;
    savedRef.current.description = trimmed;
    patchDefect({ description: trimmed || null });
  }

  function handleStepsBlur() {
    const trimmed = stepsToReproduce.trim();
    if (trimmed === savedRef.current.stepsToReproduce) return;
    savedRef.current.stepsToReproduce = trimmed;
    patchDefect({ stepsToReproduce: trimmed || null });
  }

  function handleExpectedResultBlur() {
    const trimmed = expectedResult.trim();
    if (trimmed === savedRef.current.expectedResult) return;
    savedRef.current.expectedResult = trimmed;
    patchDefect({ expectedResult: trimmed || null });
  }

  function handleActualResultBlur() {
    const trimmed = actualResult.trim();
    if (trimmed === savedRef.current.actualResult) return;
    savedRef.current.actualResult = trimmed;
    patchDefect({ actualResult: trimmed || null });
  }

  function handleExternalUrlBlur() {
    const trimmed = externalUrl.trim();
    if (trimmed === savedRef.current.externalUrl) return;
    savedRef.current.externalUrl = trimmed;
    patchDefect({ externalUrl: trimmed || null });
  }

  // Status transitions
  async function handleStatusChange(newStatus: string, resolution?: string | null) {
    setStatus(newStatus);
    const fields: Record<string, unknown> = { status: newStatus };
    if (resolution !== undefined) fields.resolution = resolution;
    await patchDefect(fields);
  }

  // Property changes (immediate save)
  function handlePropertyChange(field: string, value: string | null) {
    patchDefect({ [field]: value });
  }

  // Delete
  async function handleDelete() {
    setActionLoading(true);
    try {
      await fetch(`/api/defects/${defect.id}`, { method: "DELETE" });
      router.push(`/${workspaceSlug}/${teamKey}/defects`);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  const breadcrumbItems = [
    {
      label: "Defects",
      href: `/${workspaceSlug}/${teamKey}/defects`,
    },
    {
      label: defect.defectKey ?? defect.title,
    },
  ];

  // Status action buttons based on current status
  function renderStatusActions() {
    switch (status) {
      case "open":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("in_progress")}
          >
            Start Working
          </Button>
        );
      case "in_progress":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("fixed", "fixed")}
            >
              Mark Fixed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("deferred", "deferred")}
            >
              Defer
            </Button>
          </>
        );
      case "fixed":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("verified")}
            >
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("reopened", null)}
            >
              Reopen
            </Button>
          </>
        );
      case "verified":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("closed")}
          >
            Close
          </Button>
        );
      case "closed":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("reopened", null)}
          >
            Reopen
          </Button>
        );
      case "reopened":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("in_progress")}
          >
            Start Working
          </Button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex h-svh flex-col bg-card">
      {/* Breadcrumb */}
      <PageBreadcrumb items={breadcrumbItems}>
        {/* Save indicator */}
        {saveState === "saving" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {saveState === "saved" && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}

        {/* Status actions */}
        {renderStatusActions()}

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status !== "duplicate" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("duplicate", "duplicate")}
              >
                Mark as Duplicate
              </DropdownMenuItem>
            )}
            {status !== "rejected" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("rejected", "wont_fix")}
              >
                Reject
              </DropdownMenuItem>
            )}
            {status !== "deferred" && status !== "in_progress" && (
              <DropdownMenuItem
                onClick={() => handleStatusChange("deferred", "deferred")}
              >
                Defer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Properties toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPropertiesOpen((p) => !p)}
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      </PageBreadcrumb>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Title */}
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              placeholder="Defect title"
            />

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Reproduction */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reproduction
              </h3>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Steps to Reproduce
                </Label>
                <Textarea
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  onBlur={handleStepsBlur}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                  rows={4}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Expected Result
                </Label>
                <Textarea
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  onBlur={handleExpectedResultBlur}
                  placeholder="What should have happened..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Actual Result
                </Label>
                <Textarea
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  onBlur={handleActualResultBlur}
                  placeholder="What actually happened..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Traceability */}
            {(defect.testCaseId ||
              defect.testRunId ||
              defect.externalUrl ||
              true) && (
              <div className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Traceability
                </h3>

                {defect.testCaseId && defect.testCaseKey && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Test Case
                    </span>
                    <Link
                      href={`/${workspaceSlug}/${teamKey}/test-repo`}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:underline"
                    >
                      {defect.testCaseKey}
                      {defect.testCaseTitle
                        ? ` — ${defect.testCaseTitle}`
                        : ""}
                    </Link>
                  </div>
                )}

                {defect.testRunId && defect.testRunName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Test Run
                    </span>
                    <Link
                      href={`/${workspaceSlug}/${teamKey}/test-runs/${defect.testRunId}`}
                      className="text-sm hover:underline"
                    >
                      {defect.testRunName}
                    </Link>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    External URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      onBlur={handleExternalUrlBlur}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                    {externalUrl && (
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="border-t pt-6">
              <CommentSection
                entityType="defect"
                entityId={defect.id}
                projectId={projectId}
                currentUserId={defect.createdBy}
                canWrite={true}
                canDeleteAny={true}
              />
            </div>
          </div>
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
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDefectStatusColor(status)}`}
                >
                  {getDefectStatusLabel(status)}
                </span>
              </div>

              {/* Defect ID */}
              {defect.defectKey && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">
                    Defect ID
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {defect.defectKey}
                  </span>
                </div>
              )}

              {/* Severity */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Severity</span>
                <Select
                  value={defect.severity}
                  onValueChange={(v) => handlePropertyChange("severity", v)}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs shadow-none">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDefectSeverityColor(defect.severity)}`}
                    >
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocker">Blocker</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="trivial">Trivial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Select
                  value={defect.priority}
                  onValueChange={(v) => handlePropertyChange("priority", v)}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Type</span>
                <Select
                  value={defect.defectType}
                  onValueChange={(v) => handlePropertyChange("defectType", v)}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="ui">UI</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="crash">Crash</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution (show only when relevant) */}
              {defect.resolution && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">
                    Resolution
                  </span>
                  <span className="text-sm capitalize">
                    {defect.resolution.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {/* Environment */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">
                  Environment
                </span>
                <Select
                  value={defect.environmentId ?? "__none__"}
                  onValueChange={(v) =>
                    handlePropertyChange(
                      "environmentId",
                      v === "__none__" ? null : v,
                    )
                  }
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs shadow-none">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cycle */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Cycle</span>
                <Select
                  value={defect.cycleId ?? "__none__"}
                  onValueChange={(v) =>
                    handlePropertyChange(
                      "cycleId",
                      v === "__none__" ? null : v,
                    )
                  }
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 px-2 text-xs shadow-none">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Created by */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">
                  Created by
                </span>
                <div className="flex items-center gap-1.5">
                  {defect.createdByName ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={defect.createdByImage ?? undefined}
                          alt={defect.createdByName}
                        />
                        <AvatarFallback className="text-[10px]">
                          {defect.createdByName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{defect.createdByName}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />—
                    </span>
                  )}
                </div>
              </div>

              {/* Created */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {createdAtDisplay}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete defect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{defect.defectKey ?? defect.title}&quot;.
              This action cannot be undone.
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
