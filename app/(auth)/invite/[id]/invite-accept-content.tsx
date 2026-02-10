"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface InviteAcceptContentProps {
  invitation: {
    id: string;
    email: string;
    role: string;
    orgName: string;
    orgLogo: string | null;
  };
  isExpired: boolean;
  isAccepted: boolean;
  isAuthenticated: boolean;
}

export function InviteAcceptContent({
  invitation,
  isExpired,
  isAccepted,
  isAuthenticated,
}: InviteAcceptContentProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  if (isExpired) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="text-lg font-semibold">Invitation expired</h2>
        <p className="text-sm text-muted-foreground">
          This invitation has expired. Please ask the workspace admin to send a
          new one.
        </p>
        <Button variant="outline" asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="text-lg font-semibold">Already accepted</h2>
        <p className="text-sm text-muted-foreground">
          This invitation has already been accepted.
        </p>
        <Button asChild>
          <Link href="/workspace-redirect">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  async function handleAccept() {
    setIsPending(true);
    setError("");

    const { error: acceptError } =
      await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });

    if (acceptError) {
      setError(
        acceptError.message || "Failed to accept invitation. Please try again.",
      );
      setIsPending(false);
      return;
    }

    router.push("/workspace-redirect");
  }

  if (isAuthenticated) {
    return (
      <div className="space-y-6 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">
            Join {invitation.orgName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ve been invited to join as a{" "}
            <span className="font-medium capitalize">{invitation.role}</span>.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleAccept}
          className="h-11 w-full rounded-lg"
          disabled={isPending}
        >
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Accepting…" : "Accept Invitation"}
        </Button>
      </div>
    );
  }

  // Not authenticated
  return (
    <div className="space-y-6 text-center">
      <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">
          Join {invitation.orgName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ve been invited to join as a{" "}
          <span className="font-medium capitalize">{invitation.role}</span>.
          Sign in or create an account to accept.
        </p>
      </div>
      <div className="space-y-3">
        <Button asChild className="h-11 w-full rounded-lg">
          <Link href={`/login?callbackUrl=/invite/${invitation.id}`}>
            Sign In
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-11 w-full rounded-lg">
          <Link href={`/signup?invite=${invitation.id}`}>
            Create Account
          </Link>
        </Button>
      </div>
    </div>
  );
}
