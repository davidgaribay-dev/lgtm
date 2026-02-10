"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TreeNodeType } from "@/lib/stores/test-repo-store";

export type DialogState =
  | {
      type: "createFolder";
      parentId: string | null;
      parentType: "suite" | "section" | "root";
      suiteId?: string;
    }
  | {
      type: "createFile";
      parentId: string | null;
      parentType: "suite" | "section" | "root";
      suiteId?: string;
    }
  | {
      type: "rename";
      id: string;
      nodeType: TreeNodeType;
      currentName: string;
    }
  | {
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

  switch (dialogState.type) {
    case "createFolder":
      return (
        <CreateDialog
          key="createFolder"
          title="New Folder"
          description="Create a new folder to organize test cases."
          inputLabel="Folder name"
          placeholder="e.g. Authentication"
          onClose={() => setDialogState(null)}
          onSubmit={async (name) => {
            // Root-level folder = test suite, otherwise = section
            if (
              dialogState.parentType === "root" &&
              !dialogState.parentId
            ) {
              const res = await fetch("/api/test-suites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, projectId }),
              });
              if (!res.ok) throw new Error("Failed to create folder");
            } else {
              const body: Record<string, unknown> = { name, projectId };
              if (dialogState.parentType === "suite") {
                body.suiteId = dialogState.parentId;
              } else if (dialogState.parentType === "section") {
                body.parentId = dialogState.parentId;
              }
              const res = await fetch("/api/sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) throw new Error("Failed to create folder");
            }
            router.refresh();
          }}
        />
      );

    case "createFile":
      return (
        <CreateDialog
          key="createFile"
          title="New Test Case"
          description="Create a new test case."
          inputLabel="Test case title"
          placeholder="e.g. User can log in with valid credentials"
          onClose={() => setDialogState(null)}
          onSubmit={async (title) => {
            const body: Record<string, unknown> = { title, projectId };
            if (dialogState.parentType === "section") {
              body.sectionId = dialogState.parentId;
            }
            const res = await fetch("/api/test-cases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed to create test case");
            router.refresh();
          }}
        />
      );

    case "rename":
      return (
        <RenameDialog
          key={`rename-${dialogState.id}`}
          nodeType={dialogState.nodeType}
          currentName={dialogState.currentName}
          onClose={() => setDialogState(null)}
          onSubmit={async (newName) => {
            const urlMap: Record<TreeNodeType, string> = {
              suite: `/api/test-suites/${dialogState.id}`,
              section: `/api/sections/${dialogState.id}`,
              testCase: `/api/test-cases/${dialogState.id}`,
            };
            const bodyKey =
              dialogState.nodeType === "testCase" ? "title" : "name";
            const res = await fetch(urlMap[dialogState.nodeType], {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [bodyKey]: newName, projectId }),
            });
            if (!res.ok) throw new Error("Failed to rename");
            router.refresh();
          }}
        />
      );

    case "delete":
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
}

// --- Create Dialog ---

function CreateDialog({
  title,
  description,
  inputLabel,
  placeholder,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  inputLabel: string;
  placeholder: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus and select on mount
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setIsPending(true);
    setError("");
    try {
      await onSubmit(value.trim());
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="tree-dialog-input">{inputLabel}</Label>
            <Input
              ref={inputRef}
              id="tree-dialog-input"
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              disabled={isPending}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !value.trim()}>
              {isPending && <Loader2 className="animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Rename Dialog ---

function RenameDialog({
  nodeType,
  currentName,
  onClose,
  onSubmit,
}: {
  nodeType: TreeNodeType;
  currentName: string;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
}) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const label =
    nodeType === "testCase" ? "Test case" : "Folder";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || value.trim() === currentName) {
      onClose();
      return;
    }
    setIsPending(true);
    setError("");
    try {
      await onSubmit(value.trim());
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
          <DialogTitle>Rename {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Enter a new name for this {label.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="rename-input">{label} name</Label>
            <Input
              ref={inputRef}
              id="rename-input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              disabled={isPending}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !value.trim()}>
              {isPending && <Loader2 className="animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const label =
    nodeType === "testCase" ? "test case" : "folder";

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
