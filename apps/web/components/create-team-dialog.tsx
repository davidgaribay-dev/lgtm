"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { generateTeamKey, validateTeamKey } from "@/lib/utils";
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
import { useWorkspace } from "@/lib/workspace-context";

const RESERVED_TEAM_KEYS = [
  "TEST",
  "TEMP",
  "ADMIN",
  "ROOT",
  "API",
  "APP",
  "WEB",
  "DASHBOARD",
  "TEAMS",
  "SETTINGS",
];

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
  const { teams } = useWorkspace();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [keyStatus, setKeyStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "reserved" | "invalid"
  >("idle");

  // Auto-generate key from name (unless manually edited)
  useEffect(() => {
    if (!keyManuallyEdited && name) {
      const existingKeys = teams.map((t) => t.key);
      try {
        const generated = generateTeamKey(name, existingKeys);
        setKey(generated);
        checkKey(generated);
      } catch {
        // If generation fails (unlikely), leave empty
        setKey("");
        setKeyStatus("idle");
      }
    }
  }, [name, keyManuallyEdited, teams]);

  async function checkKey(k: string) {
    if (k.length < 2) {
      setKeyStatus("idle");
      return;
    }

    const upperKey = k.toUpperCase();

    // Validate format
    const validation = validateTeamKey(upperKey);
    if (!validation.valid) {
      setKeyStatus("invalid");
      return;
    }

    // Check if reserved
    if (RESERVED_TEAM_KEYS.includes(upperKey)) {
      setKeyStatus("reserved");
      return;
    }

    setKeyStatus("checking");
    try {
      const res = await fetch(
        `/api/check-team-key?key=${encodeURIComponent(upperKey)}&orgId=${encodeURIComponent(organizationId)}`,
      );
      const data = await res.json();
      setKeyStatus(data.available ? "available" : "taken");
    } catch {
      setKeyStatus("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!key.trim()) {
      setError("Key is required");
      return;
    }

    const upperKey = key.trim().toUpperCase();

    // Validate key
    const validation = validateTeamKey(upperKey);
    if (!validation.valid) {
      setError(validation.error || "Invalid key");
      return;
    }

    if (RESERVED_TEAM_KEYS.includes(upperKey)) {
      setError("This key is reserved");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: upperKey,
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
      setKey("");
      setDescription("");
      setKeyManuallyEdited(false);
      setKeyStatus("idle");
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
              placeholder="Engineering Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-key">
              Team key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team-key"
              placeholder="ENG"
              value={key}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setKey(val);
                setKeyManuallyEdited(true);
                setError("");
                checkKey(val);
              }}
              disabled={isPending}
              maxLength={10}
              className="uppercase font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              2-10 uppercase letters. Cannot be changed after creation.
            </p>
            {keyStatus === "checking" && (
              <p className="text-xs text-muted-foreground">Checking...</p>
            )}
            {keyStatus === "available" && (
              <p className="text-xs text-emerald-600">Available</p>
            )}
            {keyStatus === "taken" && (
              <p className="text-xs text-destructive">Already taken</p>
            )}
            {keyStatus === "reserved" && (
              <p className="text-xs text-destructive">This key is reserved</p>
            )}
            {keyStatus === "invalid" && (
              <p className="text-xs text-destructive">
                Key must be 2-10 uppercase letters
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
                isPending ||
                keyStatus === "taken" ||
                keyStatus === "reserved" ||
                keyStatus === "invalid"
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
