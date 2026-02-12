"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AuthLabel, PasswordInput } from "@/components/auth-ui";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token || tokenError) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-lg font-semibold">Invalid reset link</h2>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <Button className="h-11 w-full rounded-lg" asChild>
          <Link href="/forgot-password">Request New Link</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Password reset successfully</h2>
          <p className="text-sm text-muted-foreground">
            Your password has been updated. You can now sign in with your new
            password.
          </p>
        </div>
        <Button className="h-11 w-full rounded-lg" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsPending(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });

    if (error) {
      setError(
        error.message || "This reset link is invalid or has expired.",
      );
      setIsPending(false);
      return;
    }

    setIsSuccess(true);
    setIsPending(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Set new password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-2">
          <AuthLabel htmlFor="password">New Password</AuthLabel>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            disabled={isPending}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Must be at least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>

        <div className="space-y-2">
          <AuthLabel htmlFor="confirm-password">Confirm Password</AuthLabel>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            disabled={isPending}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg"
          disabled={isPending}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Resetting password…" : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
