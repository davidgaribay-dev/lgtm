"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthInput, AuthLabel, PasswordInput } from "@/components/auth-ui";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("invite");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Profile photo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setIsPending(true);

    // Sign up — set onboardingStep for normal signups, omit for invite-based
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name,
      ...(inviteId ? {} : { onboardingStep: "workspace" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (signUpError) {
      setError(
        signUpError.message || "Something went wrong. Please try again.",
      );
      setIsPending(false);
      return;
    }

    // Upload profile photo if selected (user is now authenticated)
    if (selectedFile) {
      setIsUploading(true);
      try {
        await upload(selectedFile.name, selectedFile, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ context: "profile-image" }),
        });
      } catch {
        // Non-blocking: photo upload failure shouldn't block signup
        console.error("Photo upload failed during signup");
      }
      setIsUploading(false);
    }

    if (inviteId) {
      // Flow B: accept invitation and go to dashboard
      try {
        await authClient.organization.acceptInvitation({
          invitationId: inviteId,
        });
      } catch {
        // If acceptance fails, still redirect — they can accept later
        console.error("Failed to auto-accept invitation");
      }
      router.push("/workspace-redirect");
    } else {
      // Flow A: go to onboarding
      router.push("/onboarding/workspace");
    }
  }

  function clearError() {
    setError("");
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Profile photo */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={previewUrl || undefined} alt="Profile photo" />
            <AvatarFallback className="text-lg">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
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
            onChange={handleFileSelect}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Add a profile photo (optional)
        </p>
      </div>

      <div className="space-y-2">
        <AuthLabel htmlFor="name">Name</AuthLabel>
        <AuthInput
          id="name"
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError();
          }}
          disabled={isPending}
          required
          autoComplete="name"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <AuthLabel htmlFor="email">Email</AuthLabel>
        <AuthInput
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError();
          }}
          disabled={isPending}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <AuthLabel htmlFor="password">Password</AuthLabel>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError();
          }}
          disabled={isPending}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Must be at least {MIN_PASSWORD_LENGTH} characters
        </p>
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-lg"
        disabled={isPending}
      >
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Creating account…" : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
