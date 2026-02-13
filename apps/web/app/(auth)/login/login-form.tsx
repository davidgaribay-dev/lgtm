"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthInput, AuthLabel, PasswordInput } from "@/components/auth-ui";

const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === "true";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/workspace-redirect";

  const [email, setEmail] = useState(isDemo ? "demo@lgtm.dev" : "");
  const [password, setPassword] = useState(isDemo ? "demodemo1234" : "");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Invalid email or password");
      setIsPending(false);
      return;
    }

    router.push(callbackUrl);
  }

  return (
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
          readOnly={isDemo}
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            tabIndex={-1}
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          disabled={isPending}
          readOnly={isDemo}
          required
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-lg"
        disabled={isPending}
      >
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Signing in…" : "Sign In"}
      </Button>

      {process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== "false" && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      )}
    </form>
  );
}
