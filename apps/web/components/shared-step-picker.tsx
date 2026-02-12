"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Loader2, Search, Workflow } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SharedStepOption {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

interface SharedStepWithActions {
  id: string;
  title: string;
  actions: {
    id: string;
    stepOrder: number;
    action: string;
    data: string | null;
    expectedResult: string | null;
  }[];
}

interface SharedStepPickerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (sharedStep: SharedStepWithActions) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SharedStepPicker({
  projectId,
  open,
  onOpenChange,
  onSelect,
}: SharedStepPickerProps) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: sharedSteps } = useSWR<SharedStepOption[]>(
    open ? `/api/shared-steps?projectId=${projectId}` : null,
    fetcher,
  );

  // Reset search when dialog opens
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!sharedSteps) return [];
    const active = sharedSteps.filter((s) => s.status === "active");
    if (!search.trim()) return active;
    const lower = search.toLowerCase();
    return active.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower),
    );
  }, [sharedSteps, search]);

  async function handleSelect(step: SharedStepOption) {
    setLoadingId(step.id);
    try {
      const res = await fetch(`/api/shared-steps/${step.id}`);
      if (!res.ok) return;
      const data: SharedStepWithActions = await res.json();
      onSelect(data);
      onOpenChange(false);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Insert shared step</DialogTitle>
          <DialogDescription>
            Select a shared step to insert its actions into this test case.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shared steps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {!sharedSteps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Workflow className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search.trim()
                  ? "No matching shared steps"
                  : "No active shared steps available"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleSelect(step)}
                  disabled={loadingId !== null}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{step.title}</div>
                    {step.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    )}
                  </div>
                  {loadingId === step.id && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
