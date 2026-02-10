"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamFormProps {
  orgId: string;
  orgName: string;
  orgSlug: string;
}

export function TeamForm({ orgId, orgName, orgSlug }: TeamFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Slug validation
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleNameChange(value: string) {
    setName(value);
    setError("");
    if (!isManualSlug) {
      const newSlug = generateSlug(value);
      setSlug(newSlug);
      checkSlugAvailability(newSlug);
    }
  }

  function handleSlugChange(value: string) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setIsManualSlug(true);
    setError("");
    checkSlugAvailability(sanitized);
  }

  function checkSlugAvailability(s: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!s || s.length < 2) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-team-slug?slug=${encodeURIComponent(s)}&orgId=${encodeURIComponent(orgId)}`,
        );
        const data = await res.json();
        setSlugStatus(data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
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
    if (!slug.trim() || slug.length < 2) {
      setError("Slug must be at least 2 characters.");
      return;
    }
    if (slugStatus === "taken") {
      setError("This slug is already taken. Please choose another.");
      return;
    }

    setIsPending(true);

    // Create the team
    const teamRes = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
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

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="team-slug">URL slug</Label>
          <div className="relative">
            <Input
              id="team-slug"
              type="text"
              placeholder="backend"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isPending}
              required
              className="pr-9"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {slugStatus === "available" && (
                <Check className="h-4 w-4 text-emerald-600" />
              )}
              {slugStatus === "taken" && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          {slugStatus === "taken" && (
            <p className="text-xs text-destructive">
              This slug is already taken.
            </p>
          )}
          {slugStatus === "available" && (
            <p className="text-xs text-emerald-600">
              This slug is available.
            </p>
          )}
          {slugStatus === "idle" && slug.length > 0 && slug.length < 2 && (
            <p className="text-xs text-muted-foreground">
              Slug must be at least 2 characters.
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg"
          disabled={
            isPending || slugStatus === "taken" || slugStatus === "checking"
          }
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Creating team…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
