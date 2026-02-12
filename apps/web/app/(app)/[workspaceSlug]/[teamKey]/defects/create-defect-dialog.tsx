"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PanelRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateDefectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceSlug: string;
  teamKey: string;
  environments: { id: string; name: string }[];
  cycles: { id: string; name: string }[];
  prefill?: {
    testResultId?: string;
    testRunId?: string;
    testCaseId?: string;
    title?: string;
    actualResult?: string;
  };
}

export function CreateDefectDialog({
  open,
  onOpenChange,
  projectId,
  workspaceSlug,
  teamKey,
  environments,
  cycles,
  prefill,
}: CreateDefectDialogProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const creatingRef = useRef(false);

  // Created defect tracking
  const [defectId, setDefectId] = useState<string | null>(null);
  const [defectKey, setDefectKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState(
    prefill?.actualResult ?? "",
  );
  const [severity, setSeverity] = useState("normal");
  const [priority, setPriority] = useState("medium");
  const [defectType, setDefectType] = useState("functional");
  const [environmentId, setEnvironmentId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  // Properties panel
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Save indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // Dirty checking ref
  const savedRef = useRef({
    title: "",
    description: "",
    stepsToReproduce: "",
    expectedResult: "",
    actualResult: "",
    externalUrl: "",
  });

  // Sync prefill when it changes
  useEffect(() => {
    if (prefill) {
      setTitle(prefill.title ?? "");
      setActualResult(prefill.actualResult ?? "");
    }
  }, [prefill]);

  // Create defect immediately on open
  useEffect(() => {
    if (!open || defectId || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);

    const initialTitle = (prefill?.title ?? "Untitled defect").trim();

    fetch("/api/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: initialTitle,
        projectId,
        severity: "normal",
        priority: "medium",
        defectType: "functional",
        actualResult: prefill?.actualResult?.trim() || undefined,
        testResultId: prefill?.testResultId || undefined,
        testRunId: prefill?.testRunId || undefined,
        testCaseId: prefill?.testCaseId || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setDefectId(data.id);
        setDefectKey(data.defectKey);
        savedRef.current = {
          title: initialTitle,
          description: "",
          stepsToReproduce: "",
          expectedResult: "",
          actualResult: prefill?.actualResult ?? "",
          externalUrl: "",
        };
        setCreating(false);
        setTimeout(() => titleRef.current?.focus(), 50);
      })
      .catch(() => {
        setCreating(false);
        creatingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Patch helper
  const patchDefect = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!defectId) return;
      setSaveState("saving");
      try {
        await fetch(`/api/defects/${defectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    },
    [defectId],
  );

  // Text field blur handlers (dirty-checked)
  function handleTitleBlur() {
    const trimmed = title.trim() || "Untitled defect";
    if (trimmed === savedRef.current.title) return;
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

  function handleExpectedBlur() {
    const trimmed = expectedResult.trim();
    if (trimmed === savedRef.current.expectedResult) return;
    savedRef.current.expectedResult = trimmed;
    patchDefect({ expectedResult: trimmed || null });
  }

  function handleActualBlur() {
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

  // Property selects (immediate save)
  function handleSeverityChange(v: string) {
    setSeverity(v);
    patchDefect({ severity: v });
  }

  function handlePriorityChange(v: string) {
    setPriority(v);
    patchDefect({ priority: v });
  }

  function handleDefectTypeChange(v: string) {
    setDefectType(v);
    patchDefect({ defectType: v });
  }

  function handleEnvironmentChange(v: string) {
    const val = v === "__none__" ? "" : v;
    setEnvironmentId(val);
    patchDefect({ environmentId: val || null });
  }

  function handleCycleChange(v: string) {
    const val = v === "__none__" ? "" : v;
    setCycleId(val);
    patchDefect({ cycleId: val || null });
  }

  // Close handler — navigate to created defect
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (defectKey) {
        router.push(`/${workspaceSlug}/${teamKey}/defects/${defectKey}`);
        router.refresh();
      }
      // Reset state
      setDefectId(null);
      setDefectKey(null);
      creatingRef.current = false;
      setCreating(false);
      setTitle(prefill?.title ?? "");
      setDescription("");
      setStepsToReproduce("");
      setExpectedResult("");
      setActualResult(prefill?.actualResult ?? "");
      setSeverity("normal");
      setPriority("medium");
      setDefectType("functional");
      setEnvironmentId("");
      setCycleId("");
      setExternalUrl("");
      setPropertiesOpen(true);
      setSaveState("idle");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[80vh] w-[1100px] max-w-[90vw] flex-row gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        {/* Left: main content */}
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Report Defect</DialogTitle>
              <div className="flex items-center gap-2">
                {saveState === "saving" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3 w-3" />
                    Saved
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPropertiesOpen(!propertiesOpen)}
                  className="h-7 w-7 shrink-0 p-0"
                  title={
                    propertiesOpen ? "Hide properties" : "Show properties"
                  }
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {creating ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Title"
                className="border-0 px-0 text-base font-medium shadow-none focus-visible:ring-0"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Description"
                className="border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                rows={3}
              />
              <Textarea
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                onBlur={handleStepsBlur}
                placeholder="Steps to Reproduce"
                className="border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                rows={4}
              />
              <Textarea
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                onBlur={handleExpectedBlur}
                placeholder="Expected Result"
                className="border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                rows={3}
              />
              <Textarea
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                onBlur={handleActualBlur}
                placeholder="Actual Result"
                className="border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Right: Properties panel — full height of modal */}
        {propertiesOpen && (
          <div className="w-80 shrink-0 overflow-y-auto border-l bg-muted/30">
            <div className="px-6 pb-3 pt-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Properties
              </h3>
            </div>
            <div className="px-6">
              {/* Severity */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Severity</span>
                <Select value={severity} onValueChange={handleSeverityChange}>
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
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
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
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
                  value={defectType}
                  onValueChange={handleDefectTypeChange}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
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

              {/* Environment */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">
                  Environment
                </span>
                <Select
                  value={environmentId}
                  onValueChange={handleEnvironmentChange}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent align="end">
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
                <Select value={cycleId} onValueChange={handleCycleChange}>
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="__none__">None</SelectItem>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* External URL */}
              <div className="py-2.5">
                <span className="text-sm text-muted-foreground">
                  External URL
                </span>
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  onBlur={handleExternalUrlBlur}
                  placeholder="https://..."
                  className="mt-1.5 h-7 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
