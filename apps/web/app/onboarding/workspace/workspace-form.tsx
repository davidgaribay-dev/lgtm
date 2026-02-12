"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, X } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function WorkspaceForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
          `/api/check-slug?slug=${encodeURIComponent(s)}`,
        );
        const data = await res.json();
        setSlugStatus(data.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 400);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ context: "workspace-logo" }),
      });
      setLogoUrl(blob.url);
    } catch {
      setError("Failed to upload logo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Workspace name is required.");
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

    const { error: orgError } = await authClient.organization.create({
      name: name.trim(),
      slug: slug.trim(),
      logo: logoUrl || undefined,
    });

    if (orgError) {
      setError(
        orgError.message ?? "Failed to create workspace. Please try again.",
      );
      setIsPending(false);
      return;
    }

    // Advance onboarding step
    const res = await fetch("/api/onboarding/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "invite" }),
    });

    if (!res.ok) {
      setError("Failed to update onboarding progress.");
      setIsPending(false);
      return;
    }

    router.push("/onboarding/invite");
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Create your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your team&apos;s workspace to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logoUrl || undefined} alt="Workspace logo" />
              <AvatarFallback className="text-lg">
                {initials || "W"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Workspace logo (optional)
          </p>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            type="text"
            placeholder="Acme Inc."
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={isPending}
            required
            autoFocus
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="workspace-slug">URL slug</Label>
          <div className="relative">
            <Input
              id="workspace-slug"
              type="text"
              placeholder="acme-inc"
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
          disabled={isPending || slugStatus === "taken" || slugStatus === "checking"}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Creating workspace…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
