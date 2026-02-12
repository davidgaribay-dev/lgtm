"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthInput, AuthLabel } from "@/components/auth-ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (error) {
      // Don't expose whether the email exists — show success regardless
      // Only show errors for unexpected failures (network, etc.)
      if (error.status && error.status >= 500) {
        setError("Something went wrong. Please try again.");
        setIsPending(false);
        return;
      }
    }

    setIsSuccess(true);
    setIsPending(false);
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a
            password reset link.
          </p>
        </div>
        <Button variant="outline" className="h-11 w-full rounded-lg" asChild>
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-2">
          <AuthLabel htmlFor="email">Email</AuthLabel>
          <AuthInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            disabled={isPending}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="h-11 w-full rounded-lg"
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? "Sending link…" : "Send Reset Link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full rounded-lg"
            asChild
          >
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
