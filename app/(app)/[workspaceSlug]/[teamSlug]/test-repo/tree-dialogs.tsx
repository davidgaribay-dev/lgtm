"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TreeNodeType } from "@/lib/stores/test-repo-store";

export type DialogState = {
  type: "delete";
  id: string;
  nodeType: TreeNodeType;
  name: string;
  hasChildren: boolean;
};

interface TreeDialogsProps {
  dialogState: DialogState | null;
  setDialogState: (state: DialogState | null) => void;
  projectId: string;
}

export function TreeDialogs({
  dialogState,
  setDialogState,
  projectId,
}: TreeDialogsProps) {
  const router = useRouter();

  if (!dialogState) return null;

  return (
    <DeleteDialog
      key={`delete-${dialogState.id}`}
      name={dialogState.name}
      nodeType={dialogState.nodeType}
      hasChildren={dialogState.hasChildren}
      onClose={() => setDialogState(null)}
      onConfirm={async () => {
        const urlMap: Record<TreeNodeType, string> = {
          suite: `/api/test-suites/${dialogState.id}`,
          section: `/api/sections/${dialogState.id}`,
          testCase: `/api/test-cases/${dialogState.id}`,
        };
        const res = await fetch(
          `${urlMap[dialogState.nodeType]}?projectId=${projectId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Failed to delete");
        router.refresh();
      }}
    />
  );
}

// --- Delete Dialog ---

function DeleteDialog({
  name,
  nodeType,
  hasChildren,
  onClose,
  onConfirm,
}: {
  name: string;
  nodeType: TreeNodeType;
  hasChildren: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const label = nodeType === "testCase" ? "test case" : "folder";

  async function handleDelete() {
    setIsPending(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{name}</span>?
            {hasChildren &&
              " This will also delete all items inside."}{" "}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
