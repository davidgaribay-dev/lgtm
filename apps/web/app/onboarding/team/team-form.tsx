"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { generateTeamKey, validateTeamKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface TeamFormProps {
  orgId: string;
  orgName: string;
  orgSlug: string;
}

export function TeamForm({ orgId, orgName, orgSlug }: TeamFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Key validation
  const [keyStatus, setKeyStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "reserved" | "invalid"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleNameChange(value: string) {
    setName(value);
    setError("");
    if (!keyManuallyEdited && value) {
      try {
        const newKey = generateTeamKey(value, []);
        setKey(newKey);
        checkKeyAvailability(newKey);
      } catch {
        setKey("");
        setKeyStatus("idle");
      }
    }
  }

  function handleKeyChange(value: string) {
    const upperKey = value.toUpperCase().replace(/[^A-Z]/g, "");
    setKey(upperKey);
    setKeyManuallyEdited(true);
    setError("");
    checkKeyAvailability(upperKey);
  }

  function checkKeyAvailability(k: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!k || k.length < 2) {
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
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-team-key?key=${encodeURIComponent(upperKey)}&orgId=${encodeURIComponent(orgId)}`,
        );
        const data = await res.json();
        setKeyStatus(data.available ? "available" : "taken");
      } catch {
        setKeyStatus("idle");
      }
    }, 400);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!key.trim() || key.length < 2) {
      setError("Key must be at least 2 characters.");
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

    if (keyStatus === "taken") {
      setError("This key is already taken. Please choose another.");
      return;
    }

    setIsPending(true);

    // Create the team
    const teamRes = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        key: upperKey,
        organizationId: orgId,
      }),
    });

    if (!teamRes.ok) {
      const data = await teamRes.json().catch(() => null);
      setError(data?.message ?? "Failed to create team. Please try again.");
      setIsPending(false);
      return;
    }

    // Advance onboarding to complete
    const res = await fetch("/api/onboarding/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: null }),
    });

    if (!res.ok) {
      setError("Failed to update onboarding progress.");
      setIsPending(false);
      return;
    }

    router.push(`/${orgSlug}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Create your first team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Teams organize test cases and runs in {orgName}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            type="text"
            placeholder="Backend"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={isPending}
            required
            autoFocus
          />
        </div>

        {/* Team Key */}
        <div className="space-y-2">
          <Label htmlFor="team-key">
            Team key <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="team-key"
              type="text"
              placeholder="ENG"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              disabled={isPending}
              required
              maxLength={10}
              className="pr-9 font-mono uppercase"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {keyStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {keyStatus === "available" && (
                <Check className="h-4 w-4 text-emerald-600" />
              )}
              {(keyStatus === "taken" ||
                keyStatus === "reserved" ||
                keyStatus === "invalid") && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            2-10 uppercase letters. Cannot be changed after creation.
          </p>
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
          {keyStatus === "available" && (
            <p className="text-xs text-emerald-600">Available</p>
          )}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg"
          disabled={
            isPending ||
            keyStatus === "taken" ||
            keyStatus === "reserved" ||
            keyStatus === "invalid" ||
            keyStatus === "checking"
          }
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Creating team…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
