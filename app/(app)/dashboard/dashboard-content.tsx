"use client";

import { useState } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { Session } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  role: string;
}

interface DashboardContentProps {
  session: Session;
  initialOrgs: Organization[];
}

export function DashboardContent({
  session,
  initialOrgs,
}: DashboardContentProps) {
  const { user } = session;

  const [orgs, setOrgs] = useState<Organization[]>(initialOrgs);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function refreshOrgs() {
    const { data } = await authClient.organization.list();
    if (data) {
      setOrgs(
        (data as unknown as Organization[]).map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          createdAt: org.createdAt,
          role: org.role ?? "member",
        })),
      );
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Member since {memberSince}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Teams you belong to</CardDescription>
            </div>
            {!showCreateForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                New
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showCreateForm && (
              <>
                <CreateOrgForm
                  onCreated={() => {
                    setShowCreateForm(false);
                    refreshOrgs();
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
                <Separator className="my-4" />
              </>
            )}

            {orgs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You&apos;re not part of any organization yet.
                </p>
                {!showCreateForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create one
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {orgs.map((org) => (
                  <li
                    key={org.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm font-medium">
                        {org.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.slug}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                      {org.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CreateOrgForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setError("");
    if (!isManualSlug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setIsPending(true);

    const { error } = await authClient.organization.create({
      name: name.trim(),
      slug: slug.trim(),
    });

    if (error) {
      setError(error.message ?? "Failed to create organization");
      setIsPending(false);
      return;
    }

    setIsPending(false);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          placeholder="My Team"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isPending}
          required
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="org-slug">Slug</Label>
        <Input
          id="org-slug"
          placeholder="my-team"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setIsManualSlug(true);
            setError("");
          }}
          disabled={isPending}
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
