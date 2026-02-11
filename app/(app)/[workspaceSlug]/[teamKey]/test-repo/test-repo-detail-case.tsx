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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestStepsEditor, type TestStep } from "@/components/test-steps-editor";
import { CommentSection } from "@/components/comments/comment-section";
import { authClient } from "@/lib/auth-client";
import { useWorkspace } from "@/lib/workspace-context";

interface TestRepoDetailCaseProps {
  testCase: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    type: string;
    priority: string;
    status: string;
    templateType: string;
    sectionId: string | null;
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
  const [priority, setPriority] = useState(testCase.priority);
  const [type, setType] = useState(testCase.type);
  const [showProperties, setShowProperties] = useState(true);

  // Steps state: null = loading
  const [steps, setSteps] = useState<TestStep[] | null>(null);

  // Save status
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track last-saved values for dirty checking
  const savedRef = useRef({
    title: testCase.title,
    description: testCase.description ?? "",
    preconditions: testCase.preconditions ?? "",
    priority: testCase.priority,
    type: testCase.type,
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

  // Auto-save a field
  const saveField = useCallback(
    async (field: string, value: string) => {
      const key = field as keyof typeof savedRef.current;
      if (value === savedRef.current[key]) return;

      setSaveState("saving");
      clearTimeout(saveTimerRef.current);

      try {
        const res = await fetch(`/api/test-cases/${testCase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value, projectId }),
        });
        if (res.ok) {
          savedRef.current[key] = value;
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

  const loadingSteps = steps === null;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-2">
          <div className="space-y-1">
            {/* Title row with save indicator + toggle */}
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField("title", title.trim())}
                placeholder="Test case title"
                className="h-auto flex-1 border-0 px-0 text-5xl font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
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
              {!showProperties && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProperties(true)}
                  className="h-7 w-7 shrink-0 p-0"
                  title="Show properties"
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Description */}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => saveField("description", description)}
              placeholder="Add description..."
              rows={1}
              className="min-h-0 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
            />

            {/* Preconditions */}
            <Textarea
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              onBlur={() => saveField("preconditions", preconditions)}
              placeholder="Add preconditions..."
              rows={1}
              className="min-h-0 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
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

      {/* Right sidebar - Properties */}
      {showProperties && (
      <div className="w-80 border-l bg-card px-6 py-2">
        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Properties
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProperties(false)}
                className="h-7 w-7 p-0"
                title="Hide properties"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(val) => {
                    setPriority(val);
                    saveField("priority", val);
                  }}
                >
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
                <Select
                  value={type}
                  onValueChange={(val) => {
                    setType(val);
                    saveField("type", val);
                  }}
                >
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

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className="text-sm capitalize">{testCase.status}</div>
              </div>

              {/* Location */}
              {(suite || section) && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-1.5 text-sm">
                    {suite && <span>{suite.name}</span>}
                    {suite && section && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {section && <span>{section.name}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
