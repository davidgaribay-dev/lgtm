"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";
import { TestStepsEditor, type TestStep } from "@/components/test-steps-editor";

interface TestRepoCreateCaseProps {
  projectId: string;
  parentId: string | null;
  parentType: "suite" | "section" | "root";
  suites: { id: string; name: string }[];
  sections: {
    id: string;
    name: string;
    suiteId: string | null;
    parentId: string | null;
  }[];
}

export function TestRepoCreateCase({
  projectId,
  parentId,
  parentType,
  suites,
  sections,
}: TestRepoCreateCaseProps) {
  const router = useRouter();
  const setCreatingTestCase = useTestRepoStore((s) => s.setCreatingTestCase);
  const selectNode = useTestRepoStore((s) => s.selectNode);
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [priority, setPriority] = useState("medium");
  const [type, setType] = useState("functional");
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  // Build breadcrumb from parent context
  const parentSection =
    parentType === "section"
      ? sections.find((s) => s.id === parentId)
      : null;
  const parentSuite =
    parentType === "suite"
      ? suites.find((s) => s.id === parentId)
      : parentSection?.suiteId
        ? suites.find((s) => s.id === parentSection.suiteId)
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsPending(true);
    setError("");

    try {
      const sectionId =
        parentType === "section" ? parentId : null;

      // Create test case
      const res = await fetch("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          preconditions: preconditions.trim() || null,
          priority,
          type,
          sectionId,
          projectId,
        }),
      });

      if (!res.ok) throw new Error("Failed to create test case");

      const created = await res.json();

      // Create test steps if any
      if (steps.length > 0) {
        await Promise.all(
          steps.map((step) =>
            fetch(`/api/test-cases/${created.id}/steps`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: step.action,
                data: step.data,
                expectedResult: step.expectedResult,
              }),
            }),
          ),
        );
      }

      setCreatingTestCase(null);
      selectNode({ id: created.id, type: "testCase" });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 pt-3 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Title - Large, prominent */}
            <div className="space-y-3">
              <Input
                ref={titleRef}
                id="tc-title"
                placeholder="Test case title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError("");
                }}
                disabled={isPending}
                required
                className="border-0 px-0 text-5xl font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Textarea
                id="tc-description"
                placeholder="Add description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                rows={6}
                className="resize-none border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Preconditions */}
            <div className="space-y-3">
              <Textarea
                id="tc-preconditions"
                placeholder="Add preconditions..."
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                disabled={isPending}
                rows={4}
                className="resize-none border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Test Steps */}
            <TestStepsEditor
              steps={steps}
              onChange={setSteps}
              disabled={isPending}
            />

            {/* Actions - Subtle, bottom placement */}
            <div className="flex items-center gap-3 pt-8">
              <Button type="submit" disabled={isPending || !title.trim()} size="sm">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create test case
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreatingTestCase(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right sidebar - Properties */}
      <div className="w-80 border-l bg-card px-6 pt-3 pb-6">
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Properties
            </h3>

            <div className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={setType} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="smoke">Smoke</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="usability">Usability</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              {(parentSuite || parentSection) && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-1.5 text-sm">
                    {parentSuite && <span>{parentSuite.name}</span>}
                    {parentSuite && parentSection && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {parentSection && <span>{parentSection.name}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
