"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OnboardingSteps } from "@/components/onboarding-steps";

interface Invitee {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
}

interface InviteFormProps {
  orgId: string;
  orgName: string;
}

const roles = ["admin", "member", "viewer"] as const;

export function InviteForm({ orgId, orgName }: InviteFormProps) {
  const router = useRouter();
  const [invitees, setInvitees] = useState<Invitee[]>([
    { id: crypto.randomUUID(), email: "", role: "member" },
  ]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  function addRow() {
    setInvitees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email: "", role: "member" },
    ]);
  }

  function removeRow(id: string) {
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  }

  function updateInvitee(
    id: string,
    field: "email" | "role",
    value: string,
  ) {
    setInvitees((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
    setError("");
  }

  async function finishOnboarding() {
    const res = await fetch("/api/onboarding/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: null }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setIsPending(false);
      return;
    }

    router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const valid = invitees.filter((i) => i.email.trim());

    if (valid.length === 0) {
      setIsPending(true);
      await finishOnboarding();
      return;
    }

    setIsPending(true);

    const results = await Promise.allSettled(
      valid.map((i) =>
        authClient.organization.inviteMember({
          email: i.email.trim(),
          role: i.role,
          organizationId: orgId,
        }),
      ),
    );

    const failures = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && r.value.error),
    );

    if (failures.length > 0 && failures.length === valid.length) {
      setError("Failed to send invitations. Please try again.");
      setIsPending(false);
      return;
    }

    await finishOnboarding();
  }

  async function handleSkip() {
    setIsPending(true);
    await finishOnboarding();
  }

  return (
    <div className="space-y-6">
      <OnboardingSteps currentStep="invite" />

      <div className="text-center">
        <h2 className="text-lg font-semibold">Invite your team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add team members to {orgName}. You can always invite more later.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-3">
          <Label>Team members</Label>
          {invitees.map((invitee, index) => (
            <div key={invitee.id} className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={invitee.email}
                onChange={(e) =>
                  updateInvitee(invitee.id, "email", e.target.value)
                }
                disabled={isPending}
                className="flex-1"
              />
              <Select
                value={invitee.role}
                onValueChange={(value) =>
                  updateInvitee(invitee.id, "role", value)
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      className="capitalize"
                    >
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invitees.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => removeRow(invitee.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {invitees.length === 1 && index === 0 && (
                <div className="h-9 w-9 shrink-0" />
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={isPending}
        >
          <Plus className="h-4 w-4" />
          Add another
        </Button>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={handleSkip}
            disabled={isPending}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isPending ? "Finishing…" : "Send & continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
