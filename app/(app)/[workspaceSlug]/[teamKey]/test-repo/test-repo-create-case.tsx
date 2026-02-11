"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";
import { TestStepsEditor, type TestStep } from "@/components/test-steps-editor";
import {
  TestCasePropertiesSidebar,
  type TeamMember,
  type TestCasePropertyValues,
} from "@/components/test-case-properties-sidebar";

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
  const [postconditions, setPostconditions] = useState("");
  const [properties, setProperties] = useState<TestCasePropertyValues>({
    status: "draft",
    priority: "medium",
    severity: "normal",
    type: "functional",
    automationStatus: "not_automated",
    behavior: "not_set",
    layer: "not_set",
    isFlaky: false,
    assigneeId: "unassigned",
  });
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  // Team members for assignee selector
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  // Fetch team members for assignee selector
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/teams/${encodeURIComponent(projectId)}/members?includeImplicit=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMembers(data);
        }
      })
      .catch(() => {
        // Ignore — members won't show in assignee selector
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const handlePropertyChange = useCallback(
    (field: string, value: string | boolean | null) => {
      setProperties((prev) => ({
        ...prev,
        [field]: field === "assigneeId" ? (value ?? "unassigned") : value,
      }));
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
          postconditions: postconditions.trim() || null,
          priority: properties.priority,
          severity: properties.severity,
          type: properties.type,
          automationStatus: properties.automationStatus,
          status: properties.status,
          behavior: properties.behavior,
          layer: properties.layer,
          isFlaky: properties.isFlaky,
          assigneeId: properties.assigneeId === "unassigned" ? null : properties.assigneeId,
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
      {/* Left side: breadcrumb + main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Breadcrumb bar */}
        <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {parentSuite && (
              <>
                <span>{parentSuite.name}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            {parentSection && (
              <>
                <span>{parentSection.name}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <span className="font-medium text-foreground">New test case</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProperties(!showProperties)}
            className="h-7 w-7 shrink-0 p-0"
            title={showProperties ? "Hide properties" : "Show properties"}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-2">
            <form onSubmit={handleSubmit} className="space-y-1">
              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Title - Large, prominent */}
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
                className="h-auto border-0 bg-transparent px-0 text-4xl md:text-4xl leading-none font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 dark:bg-transparent"
              />

              {/* Description */}
              <Textarea
                id="tc-description"
                placeholder="Add description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                rows={8}
                className="min-h-48 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />

              {/* Preconditions */}
              <Textarea
                id="tc-preconditions"
                placeholder="Add preconditions..."
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                disabled={isPending}
                rows={1}
                className="min-h-0 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />

              {/* Postconditions */}
              <Textarea
                id="tc-postconditions"
                placeholder="Add postconditions..."
                value={postconditions}
                onChange={(e) => setPostconditions(e.target.value)}
                disabled={isPending}
                rows={1}
                className="min-h-0 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />

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
      </div>

      {/* Right sidebar - Properties */}
      {showProperties && (
        <TestCasePropertiesSidebar
          values={properties}
          onPropertyChange={handlePropertyChange}
          members={members}
          disabled={isPending}
        />
      )}
    </div>
  );
}
