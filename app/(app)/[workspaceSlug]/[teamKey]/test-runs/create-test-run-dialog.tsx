"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TreeNode } from "@/lib/tree-utils";
import { TestCaseTreePicker } from "@/components/test-case-tree-picker";

interface TestPlanSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  caseCount: number;
}

interface CreateTestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceSlug: string;
  teamKey: string;
  environments: { id: string; name: string }[];
  cycles: { id: string; name: string }[];
  treeData: TreeNode[];
  testCases: {
    id: string;
    title: string;
    caseKey: string | null;
    sectionId: string | null;
    suiteId: string | null;
  }[];
  testPlans: TestPlanSummary[];
}

export function CreateTestRunDialog({
  open,
  onOpenChange,
  projectId,
  workspaceSlug,
  teamKey,
  environments,
  cycles,
  treeData,
  testCases,
  testPlans,
}: CreateTestRunDialogProps) {
  const router = useRouter();

  // Form state
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState(`Test Run ${today}`);
  const [description, setDescription] = useState("");
  const [environmentId, setEnvironmentId] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");

  // Plan loading
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [planLoading, setPlanLoading] = useState(false);

  // Tree state
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(
    new Set(),
  );

  // Properties panel
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // Submit state
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handlePlanSelect(planId: string) {
    setSelectedPlanId(planId);
    if (!planId) {
      setSelectedCaseIds(new Set());
      return;
    }
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/test-plans/${planId}/cases`);
      if (res.ok) {
        const cases = await res.json();
        const ids = new Set<string>(
          cases.map((c: { testCaseId: string }) => c.testCaseId),
        );
        setSelectedCaseIds(ids);
      }
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (selectedCaseIds.size === 0) {
      setError("Select at least one test case");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          projectId,
          environmentId: environmentId || undefined,
          cycleId: cycleId || undefined,
          testCaseIds: Array.from(selectedCaseIds),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create test run");
        return;
      }

      const created = await res.json();
      onOpenChange(false);
      router.push(
        `/${workspaceSlug}/${teamKey}/test-runs/${created.id}`,
      );
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset form on close
      const today = new Date().toISOString().split("T")[0];
      setName(`Test Run ${today}`);
      setDescription("");
      setEnvironmentId("");
      setCycleId("");
      setSelectedCaseIds(new Set());
      setError("");
      setSelectedPlanId("");
      setPropertiesOpen(true);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-none w-[1100px] max-w-[90vw] h-[90vh] flex flex-row p-0 gap-0 overflow-hidden">
        {/* Left: main content */}
        <div className="flex flex-1 flex-col min-w-0 p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Create Test Run</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className="h-7 w-7 shrink-0 p-0"
                title={propertiesOpen ? "Hide properties" : "Show properties"}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Name & Description */}
          <div className="mt-4 space-y-2">
            <Input
              id="run-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Test Run Name"
              className="border-0 px-0 text-base font-medium shadow-none focus-visible:ring-0"
            />
            <Input
              id="run-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="border-0 px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Tree picker */}
          <TestCaseTreePicker
            treeData={treeData}
            testCases={testCases}
            selectedCaseIds={selectedCaseIds}
            onSelectionChange={setSelectedCaseIds}
            className="mt-3 flex-1"
          />

          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Run ({selectedCaseIds.size} cases)
            </Button>
          </DialogFooter>
        </div>

        {/* Right: Properties panel — full height of modal */}
        {propertiesOpen && (
          <div className="w-80 shrink-0 overflow-y-auto border-l bg-muted/30">
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Properties
              </h3>
            </div>
            <div className="px-6">
              {/* Test Plan */}
              {testPlans.length > 0 && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted-foreground">Test Plan</span>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={selectedPlanId}
                      onValueChange={(v) => handlePlanSelect(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="__none__">None</SelectItem>
                        {testPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {planLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>
              )}

              {/* Environment */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Environment</span>
                <Select value={environmentId} onValueChange={setEnvironmentId}>
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent align="end">
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
                <Select value={cycleId} onValueChange={setCycleId}>
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
