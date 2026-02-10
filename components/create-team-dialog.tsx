"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { generateSlug } from "@/lib/utils";
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

const RESERVED_SLUGS = ["dashboard", "teams", "settings"];

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: () => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "reserved"
  >("idle");

  function handleNameChange(value: string) {
    setName(value);
    setError("");
    if (!isManualSlug) {
      const generated = generateSlug(value);
      setSlug(generated);
      if (generated) {
        checkSlug(generated);
      } else {
        setSlugStatus("idle");
      }
    }
  }

  async function checkSlug(s: string) {
    if (s.length < 2) {
      setSlugStatus("idle");
      return;
    }

    if (RESERVED_SLUGS.includes(s)) {
      setSlugStatus("reserved");
      return;
    }

    setSlugStatus("checking");
    try {
      const res = await fetch(
        `/api/check-team-slug?slug=${encodeURIComponent(s)}&orgId=${encodeURIComponent(organizationId)}`,
      );
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    } catch {
      setSlugStatus("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (RESERVED_SLUGS.includes(slug.trim())) {
      setError("This slug is reserved");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          organizationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create team");
        setIsPending(false);
        return;
      }

      setIsPending(false);
      setName("");
      setSlug("");
      setDescription("");
      setIsManualSlug(false);
      setSlugStatus("idle");
      onCreated();
    } catch {
      setError("Failed to create team");
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Create a new team to organize test cases and runs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              placeholder="Mobile App"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isPending}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-slug">Slug</Label>
            <Input
              id="team-slug"
              placeholder="mobile-app"
              value={slug}
              onChange={(e) => {
                const val = e.target.value;
                setSlug(val);
                setIsManualSlug(true);
                setError("");
                checkSlug(val);
              }}
              disabled={isPending}
              required
            />
            {slugStatus === "checking" && (
              <p className="text-xs text-muted-foreground">Checking...</p>
            )}
            {slugStatus === "available" && (
              <p className="text-xs text-emerald-600">Available</p>
            )}
            {slugStatus === "taken" && (
              <p className="text-xs text-destructive">Already taken</p>
            )}
            {slugStatus === "reserved" && (
              <p className="text-xs text-destructive">
                This slug is reserved
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Description (optional)</Label>
            <Input
              id="team-description"
              placeholder="A short description of the team"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || slugStatus === "taken" || slugStatus === "reserved"
              }
            >
              {isPending && <Loader2 className="animate-spin" />}
              Create team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
