"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  Check,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TestStepsEditor, type TestStep } from "@/components/test-steps-editor";
import { CommentSection } from "@/components/comments/comment-section";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/lib/workspace-context";
import {
  TestCasePropertiesSidebar,
  type TeamMember,
  type TestCasePropertyValues,
} from "@/components/test-case-properties-sidebar";

interface TestRepoDetailCaseProps {
  testCase: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    postconditions: string | null;
    type: string;
    priority: string;
    severity: string;
    automationStatus: string;
    status: string;
    behavior: string;
    layer: string;
    isFlaky: boolean;
    assigneeId: string | null;
    templateType: string;
    sectionId: string | null;
    caseKey: string | null;
  };
  section: { id: string; name: string } | null;
  suite: { id: string; name: string } | null;
  projectId: string;
}

export function TestRepoDetailCase(props: TestRepoDetailCaseProps) {
  return <TestRepoDetailCaseInner key={props.testCase.id} {...props} />;
}

function TestRepoDetailCaseInner({
  testCase,
  section,
  suite,
  projectId,
}: TestRepoDetailCaseProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { userRole } = useWorkspace();

  const currentUserId = session?.user?.id ?? "";
  const canWrite = userRole !== "viewer";
  const canDeleteAny = userRole === "owner" || userRole === "admin";

  // Local state for editable fields
  const [title, setTitle] = useState(testCase.title);
  const [description, setDescription] = useState(testCase.description ?? "");
  const [preconditions, setPreconditions] = useState(testCase.preconditions ?? "");
  const [postconditions, setPostconditions] = useState(testCase.postconditions ?? "");
  const [properties, setProperties] = useState<TestCasePropertyValues>({
    status: testCase.status,
    priority: testCase.priority,
    severity: testCase.severity,
    type: testCase.type,
    automationStatus: testCase.automationStatus,
    behavior: testCase.behavior,
    layer: testCase.layer,
    isFlaky: testCase.isFlaky,
    assigneeId: testCase.assigneeId ?? "unassigned",
  });
  const [showProperties, setShowProperties] = useState(true);

  // Team members for assignee selector
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Steps state: null = loading
  const [steps, setSteps] = useState<TestStep[] | null>(null);

  // Save status
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track last-saved values for dirty checking
  const savedRef = useRef<Record<string, unknown>>({
    title: testCase.title,
    description: testCase.description ?? "",
    preconditions: testCase.preconditions ?? "",
    postconditions: testCase.postconditions ?? "",
    priority: testCase.priority,
    severity: testCase.severity,
    type: testCase.type,
    automationStatus: testCase.automationStatus,
    status: testCase.status,
    behavior: testCase.behavior,
    layer: testCase.layer,
    isFlaky: testCase.isFlaky,
    assigneeId: testCase.assigneeId,
  });

  // Fetch steps on mount
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/test-cases/${encodeURIComponent(testCase.id)}/steps`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch steps");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSteps(
            data.map((s: { id: string; stepOrder: number; action: string; data?: string | null; expectedResult?: string | null }) => ({
              id: s.id,
              stepOrder: s.stepOrder,
              action: s.action,
              data: s.data ?? null,
              expectedResult: s.expectedResult ?? null,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSteps([]);
      });

    return () => {
      cancelled = true;
    };
  }, [testCase.id]);

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

  // Auto-save a field
  const saveField = useCallback(
    async (field: string, value: string | boolean | null) => {
      if (value === savedRef.current[field]) return;

      setSaveState("saving");
      clearTimeout(saveTimerRef.current);

      try {
        const res = await fetch(`/api/test-cases/${testCase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value, projectId }),
        });
        if (res.ok) {
          savedRef.current[field] = value;
          setSaveState("saved");
          saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
          router.refresh();
        } else {
          setSaveState("idle");
        }
      } catch {
        setSaveState("idle");
      }
    },
    [testCase.id, projectId, router],
  );

  // Property change handler that auto-saves
  const handlePropertyChange = useCallback(
    (field: string, value: string | boolean | null) => {
      setProperties((prev) => ({
        ...prev,
        [field]: field === "assigneeId" ? (value ?? "unassigned") : value,
      }));
      saveField(field, value);
    },
    [saveField],
  );

  // Step auto-save callbacks
  const handleStepSave = useCallback(
    async (step: TestStep) => {
      await fetch(`/api/test-steps/${step.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: step.action,
          data: step.data,
          expectedResult: step.expectedResult,
        }),
      });
    },
    [],
  );

  const handleStepCreate = useCallback(
    async (step: TestStep): Promise<TestStep> => {
      const res = await fetch(`/api/test-cases/${testCase.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: step.action,
          data: step.data,
          expectedResult: step.expectedResult,
        }),
      });
      const created = await res.json();
      return {
        id: created.id,
        stepOrder: created.stepOrder,
        action: created.action,
        data: created.data ?? null,
        expectedResult: created.expectedResult ?? null,
      };
    },
    [testCase.id],
  );

  const handleStepDelete = useCallback(
    async (stepId: string) => {
      await fetch(`/api/test-steps/${stepId}`, { method: "DELETE" });
    },
    [],
  );

  const handleStepsReorder = useCallback(
    async (stepIds: string[]) => {
      await fetch(`/api/test-cases/${testCase.id}/steps/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepIds }),
      });
    },
    [testCase.id],
  );

  const loadingSteps = steps === null;

  return (
    <div className="flex h-full">
      {/* Left side: breadcrumb + main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Breadcrumb bar */}
        <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {suite && (
              <>
                <span>{suite.name}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            {section && (
              <>
                <span>{section.name}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            {testCase.caseKey && (
              <span className="font-medium text-foreground">{testCase.caseKey}</span>
            )}
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
            <div className="space-y-1">
            {/* Title row with save indicator */}
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField("title", title.trim())}
                placeholder="Test case title"
                className="h-auto flex-1 border-0 bg-transparent px-0 text-4xl md:text-4xl leading-none font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 dark:bg-transparent"
              />
              {saveState !== "idle" && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
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
            </div>

            {/* Description */}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => saveField("description", description)}
              placeholder="Add description..."
              rows={8}
              className="min-h-48 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />

            {/* Preconditions */}
            <Textarea
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              onBlur={() => saveField("preconditions", preconditions)}
              placeholder="Add preconditions..."
              rows={1}
              className="min-h-0 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />

            {/* Postconditions */}
            <Textarea
              value={postconditions}
              onChange={(e) => setPostconditions(e.target.value)}
              onBlur={() => saveField("postconditions", postconditions)}
              placeholder="Add postconditions..."
              rows={1}
              className="min-h-0 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />

            {/* Test Steps */}
            {loadingSteps ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading steps...</span>
              </div>
            ) : (
              <TestStepsEditor
                steps={steps}
                onChange={setSteps}
                onStepSave={handleStepSave}
                onStepCreate={handleStepCreate}
                onStepDelete={handleStepDelete}
                onStepsReorder={handleStepsReorder}
              />
            )}

            {/* Comments */}
            {currentUserId && (
              <div className="border-t pt-8">
                <CommentSection
                  entityType="test_case"
                  entityId={testCase.id}
                  projectId={projectId}
                  currentUserId={currentUserId}
                  currentUserImage={session?.user?.image}
                  currentUserName={session?.user?.name}
                  canWrite={canWrite}
                  canDeleteAny={canDeleteAny}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Right sidebar - Properties */}
      {showProperties && (
        <TestCasePropertiesSidebar
          values={properties}
          onPropertyChange={handlePropertyChange}
          members={members}
        />
      )}
    </div>
  );
}
