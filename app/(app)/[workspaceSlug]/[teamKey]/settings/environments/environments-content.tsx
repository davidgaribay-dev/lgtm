"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  type ListGroup,
} from "@/components/grouped-list";
import type { EnvironmentRow } from "./columns";

const environmentTypes = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "qa", label: "QA" },
  { value: "production", label: "Production" },
  { value: "custom", label: "Custom" },
] as const;

function getEnvTypeDotColor(type: string) {
  switch (type) {
    case "development":
      return "border-blue-500 bg-blue-500/20";
    case "staging":
      return "border-amber-500 bg-amber-500/20";
    case "qa":
      return "border-cyan-500 bg-cyan-500/20";
    case "production":
      return "border-emerald-500 bg-emerald-500/20";
    case "custom":
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getEnvTypeLabel(type: string) {
  switch (type) {
    case "development":
      return "Development";
    case "staging":
      return "Staging";
    case "qa":
      return "QA";
    case "production":
      return "Production";
    case "custom":
      return "Custom";
    default:
      return type;
  }
}

const ENV_TYPE_ORDER = [
  "production",
  "staging",
  "qa",
  "development",
  "custom",
] as const;

interface EnvironmentsContentProps {
  environments: EnvironmentRow[];
  team: { id: string; name: string };
  isAdmin: boolean;
}

export function EnvironmentsContent({
  environments,
  team,
  isAdmin,
}: EnvironmentsContentProps) {
  const router = useRouter();

  const [envs] = useState(environments);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnvironmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnvironmentRow | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("custom");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const groups = useMemo((): ListGroup<EnvironmentRow>[] => {
    const map = new Map<string, EnvironmentRow[]>();
    for (const env of envs) {
      const list = map.get(env.type) ?? [];
      list.push(env);
      map.set(env.type, list);
    }
    return ENV_TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({
      key: t,
      label: getEnvTypeLabel(t),
      dotColor: getEnvTypeDotColor(t),
      items: map.get(t)!,
    }));
  }, [envs]);

  function resetForm() {
    setFormName("");
    setFormUrl("");
    setFormDescription("");
    setFormType("custom");
    setFormIsDefault(false);
    setError("");
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function handleOpenEdit(env: EnvironmentRow) {
    setEditTarget(env);
    setFormName(env.name);
    setFormUrl(env.url ?? "");
    setFormDescription(env.description ?? "");
    setFormType(env.type);
    setFormIsDefault(env.isDefault);
    setError("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          url: formUrl.trim() || null,
          description: formDescription.trim() || null,
          type: formType,
          isDefault: formIsDefault,
          projectId: team.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create environment");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setCreateOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Failed to create environment");
      setIsPending(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setError("");
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch(`/api/environments/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          url: formUrl.trim() || null,
          description: formDescription.trim() || null,
          type: formType,
          isDefault: formIsDefault,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to update environment");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setEditTarget(null);
      resetForm();
      router.refresh();
    } catch {
      setError("Failed to update environment");
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    setError("");
    try {
      const res = await fetch(`/api/environments/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to delete environment");
        setIsPending(false);
        return;
      }
      setIsPending(false);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError("Failed to delete environment");
      setIsPending(false);
    }
  }

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="env-name">Name</Label>
        <Input
          id="env-name"
          placeholder="Production"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
            setError("");
          }}
          disabled={isPending}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="env-type">Type</Label>
        <Select
          value={formType}
          onValueChange={setFormType}
          disabled={isPending}
        >
          <SelectTrigger className="w-full" id="env-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {environmentTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="env-url">URL (optional)</Label>
        <Input
          id="env-url"
          placeholder="https://app.example.com"
          value={formUrl}
          onChange={(e) => setFormUrl(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="env-description">Description (optional)</Label>
        <Input
          id="env-description"
          placeholder="Main production environment"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="env-default"
          type="checkbox"
          checked={formIsDefault}
          onChange={(e) => setFormIsDefault(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="env-default" className="text-sm font-normal">
          Set as default environment
        </Label>
      </div>
    </>
  );

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageBreadcrumb items={[{ label: "Environments" }]}>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenCreate}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </PageBreadcrumb>

      <div className="flex-1">
        <GroupedList
          groups={groups}
          getItemId={(env) => env.id}
          emptyIcon={
            <Globe className="h-10 w-10 text-muted-foreground/40" />
          }
          emptyTitle="No environments configured"
          emptyDescription="Add your first environment to organize test execution."
          emptyAction={
            isAdmin ? (
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Environment
              </Button>
            ) : undefined
          }
          renderRow={(env) => (
            <div className={groupedListRowClass}>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleOpenEdit(env)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget(env);
                        setError("");
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getEnvTypeDotColor(env.type)}`}
              />

              <span className="min-w-0 flex-1 truncate font-medium">
                {env.name}
              </span>

              <div className="flex shrink-0 items-center gap-3">
                {env.isDefault && (
                  <Badge variant="outline" className="text-[10px] leading-none">
                    Default
                  </Badge>
                )}

                {env.url && (
                  <span className="max-w-48 truncate text-xs text-muted-foreground">
                    {env.url}
                  </span>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create environment</DialogTitle>
            <DialogDescription>
              Add a new test environment for {team.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {formFields}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit environment</DialogTitle>
            <DialogDescription>
              Update the environment configuration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {formFields}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
    </div>
  );
}
