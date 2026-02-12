"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Loader2,
  Check,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TestStepsEditor, type TestStep } from "@/components/test-steps-editor";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { useTeamSettings } from "@/lib/team-settings-context";
import { useWorkspace } from "@/lib/workspace-context";

interface SharedStepWithActions {
  id: string;
  title: string;
  description: string | null;
  status: string;
  actions: {
    id: string;
    stepOrder: number;
    action: string;
    data: string | null;
    expectedResult: string | null;
  }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SharedStepDetail({ sharedStepId }: { sharedStepId: string }) {
  const router = useRouter();
  const { team } = useTeamSettings();
  const { workspace } = useWorkspace();

  const { data: sharedStep } = useSWR<SharedStepWithActions>(
    `/api/shared-steps/${sharedStepId}`,
    fetcher,
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<TestStep[] | null>(null);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const savedRef = useRef<Record<string, unknown>>({});

  // Sync from fetched data
  useEffect(() => {
    if (sharedStep) {
      setTitle(sharedStep.title);
      setDescription(sharedStep.description ?? "");
      setSteps(
        sharedStep.actions.map((a) => ({
          id: a.id,
          stepOrder: a.stepOrder,
          action: a.action,
          data: a.data ?? null,
          expectedResult: a.expectedResult ?? null,
        })),
      );
      savedRef.current = {
        title: sharedStep.title,
        description: sharedStep.description ?? "",
      };
    }
  }, [sharedStep]);

  const saveField = useCallback(
    async (field: string, value: string | null) => {
      if (value === savedRef.current[field]) return;

      setSaveState("saving");
      clearTimeout(saveTimerRef.current);

      try {
        const res = await fetch(`/api/shared-steps/${sharedStepId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          savedRef.current[field] = value;
          setSaveState("saved");
          saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
        } else {
          setSaveState("idle");
        }
      } catch {
        setSaveState("idle");
      }
    },
    [sharedStepId],
  );

  // Step action callbacks — same pattern as test case detail but using shared step action endpoints
  const handleStepSave = useCallback(
    async (step: TestStep) => {
      await fetch(`/api/shared-steps/${sharedStepId}/actions/${step.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: step.action,
          data: step.data,
          expectedResult: step.expectedResult,
        }),
      });
    },
    [sharedStepId],
  );

  const handleStepCreate = useCallback(
    async (step: TestStep): Promise<TestStep> => {
      const res = await fetch(`/api/shared-steps/${sharedStepId}/actions`, {
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
    [sharedStepId],
  );

  const handleStepDelete = useCallback(
    async (stepId: string) => {
      await fetch(`/api/shared-steps/${sharedStepId}/actions/${stepId}`, {
        method: "DELETE",
      });
    },
    [sharedStepId],
  );

  const handleStepsReorder = useCallback(
    async (stepIds: string[]) => {
      await fetch(`/api/shared-steps/${sharedStepId}/actions/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionIds: stepIds }),
      });
    },
    [sharedStepId],
  );

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/shared-steps/${sharedStepId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push(`/${workspace.slug}/${team.key}/settings/shared-steps`);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!sharedStep) {
    return (
      <div className="flex min-h-svh flex-col bg-card">
        <PageBreadcrumb
          items={[
            {
              label: "Shared Steps",
              onClick: () =>
                router.push(`/${workspace.slug}/${team.key}/settings/shared-steps`),
            },
            { label: "Loading..." },
          ]}
        />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const loadingSteps = steps === null;

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb
        items={[
          {
            label: "Shared Steps",
            onClick: () =>
              router.push(`/${workspace.slug}/${team.key}/settings/shared-steps`),
          },
          { label: sharedStep.title },
        ]}
      >
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
      </PageBreadcrumb>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-2">
          <div className="space-y-1">
            {/* Title row with save indicator */}
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField("title", title.trim())}
                placeholder="Shared step title"
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
              rows={3}
              className="min-h-20 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />

            {/* Steps */}
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
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shared step?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{sharedStep.title}&quot; and all
              its actions. Test cases using this shared step will no longer
              reference it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
