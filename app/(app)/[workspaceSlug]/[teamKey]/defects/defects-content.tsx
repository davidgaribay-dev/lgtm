"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bug, Loader2, MoreHorizontal, Plus } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  formatRelativeDate,
  type ListGroup,
} from "@/components/grouped-list";
import type { DefectRow } from "./defect-columns";
import {
  getDefectStatusLabel,
  getDefectSeverityLabel,
  getDefectSeverityColor,
} from "./defect-status-helpers";

function getStatusDotColor(status: string) {
  switch (status) {
    case "open":
      return "border-red-500 bg-red-500/20";
    case "in_progress":
      return "border-blue-500 bg-blue-500/20";
    case "fixed":
      return "border-cyan-500 bg-cyan-500/20";
    case "verified":
      return "border-emerald-500 bg-emerald-500/20";
    case "closed":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "reopened":
      return "border-orange-500 bg-orange-500/20";
    case "deferred":
      return "border-violet-500 bg-violet-500/20";
    case "rejected":
    case "duplicate":
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

const STATUS_ORDER = [
  "open",
  "in_progress",
  "reopened",
  "fixed",
  "verified",
  "closed",
  "deferred",
  "rejected",
  "duplicate",
] as const;

interface DefectsContentProps {
  projectId: string;
  teamKey: string;
  teamName: string;
  workspaceSlug: string;
  initialDefects: DefectRow[];
}

export function DefectsContent({
  projectId,
  teamKey,
  teamName,
  workspaceSlug,
  initialDefects,
}: DefectsContentProps) {
  const router = useRouter();
  const [defects, setDefects] = useState(initialDefects);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DefectRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const groups = useMemo((): ListGroup<DefectRow>[] => {
    const map = new Map<string, DefectRow[]>();
    for (const d of defects) {
      const list = map.get(d.status) ?? [];
      list.push(d);
      map.set(d.status, list);
    }
    return STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getDefectStatusLabel(s),
      dotColor: getStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [defects]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/defects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled defect",
          projectId,
          severity: "normal",
          priority: "medium",
          defectType: "functional",
        }),
      });
      if (!res.ok) return;
      const created = await res.json();
      router.push(`/${workspaceSlug}/${teamKey}/defects/${created.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await fetch(`/api/defects/${deleteTarget.id}`, { method: "DELETE" });
      setDefects((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-card">
      <PageBreadcrumb items={[{ label: teamName }, { label: "Defects" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCreate}
          disabled={creating}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New
        </Button>
      </PageBreadcrumb>

      <div className="flex-1">
        <GroupedList
          groups={groups}
          getItemId={(d) => d.id}
          emptyIcon={
            <Bug className="h-10 w-10 text-muted-foreground/40" />
          }
          emptyTitle="No defects reported"
          emptyDescription="Report your first defect to start tracking issues."
          emptyAction={
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Report Defect
            </Button>
          }
          renderRow={(defect) => (
            <Link
              href={`/${workspaceSlug}/${teamKey}/defects/${defect.id}`}
              className={groupedListRowClass}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  onClick={(e) => e.preventDefault()}
                >
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteTarget(defect);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                {defect.defectKey}
              </span>

              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getStatusDotColor(defect.status)}`}
              />

              <span className="min-w-0 flex-1 truncate">
                {defect.title}
              </span>

              <div className="flex shrink-0 items-center gap-3">
                {defect.severity &&
                  defect.severity !== "normal" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${getDefectSeverityColor(defect.severity)}`}
                    >
                      {getDefectSeverityLabel(defect.severity)}
                    </span>
                  )}

                {defect.assigneeName ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={defect.assigneeImage ?? undefined}
                    />
                    <AvatarFallback className="text-[9px]">
                      {defect.assigneeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="h-5 w-5" />
                )}

                <span className="w-12 text-right text-[11px] text-muted-foreground">
                  {formatRelativeDate(defect.createdAt)}
                </span>
              </div>
            </Link>
          )}
        />
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete defect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
