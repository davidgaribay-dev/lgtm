"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { type EnvironmentRow, getEnvironmentColumns } from "./columns";

const environmentTypes = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "qa", label: "QA" },
  { value: "production", label: "Production" },
  { value: "custom", label: "Custom" },
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

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnvironmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnvironmentRow | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("custom");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Async state
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const columns = useMemo(
    () =>
      getEnvironmentColumns({
        isAdmin,
        onEdit: (env) => {
          setEditTarget(env);
          setFormName(env.name);
          setFormUrl(env.url ?? "");
          setFormDescription(env.description ?? "");
          setFormType(env.type);
          setFormIsDefault(env.isDefault);
          setError("");
        },
        onDelete: (env) => {
          setDeleteTarget(env);
          setError("");
        },
      }),
    [isAdmin],
  );

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Environments</h1>
          <p className="text-muted-foreground">
            Manage test environments for {team.name}.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create environment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environments</CardTitle>
          <CardDescription>
            {environments.length}{" "}
            {environments.length === 1 ? "environment" : "environments"}{" "}
            configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={environments}
            emptyMessage="No environments configured yet."
          />
        </CardContent>
      </Card>

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
