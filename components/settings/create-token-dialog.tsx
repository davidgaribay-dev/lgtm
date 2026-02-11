"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onTokenCreated: (token: any) => void;
  defaultProjectIds?: string[];
  teams?: Array<{ id: string; name: string }>;
  isAdmin?: boolean;
}

// Define available permissions based on lib/permissions.ts
const PERMISSIONS = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
  comment: ["create", "read", "update", "delete"],
} as const;

const RESOURCE_LABELS: Record<string, string> = {
  organization: "Organization",
  member: "Members",
  invitation: "Invitations",
  project: "Teams",
  environment: "Environments",
  testCase: "Test Cases",
  testRun: "Test Runs",
  testPlan: "Test Plans",
  shareLink: "Share Links",
  comment: "Comments",
};

export function CreateTokenDialog({
  open,
  onOpenChange,
  organizationId,
  onTokenCreated,
  defaultProjectIds,
  teams = [],
  isAdmin = false,
}: CreateTokenDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState<
    "personal" | "team" | "organization"
  >("personal");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    defaultProjectIds || [],
  );
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (resource: string, action: string) => {
    const key = `${resource}:${action}`;
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedPermissions(newSelected);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Token name is required");
      return;
    }

    if (selectedPermissions.size === 0) {
      setError("At least one permission is required");
      return;
    }

    if (scopeType === "team" && selectedProjects.length === 0) {
      setError("Team-scoped tokens require at least one team");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const permissions = Array.from(selectedPermissions).map((key) => {
        const [resource, action] = key.split(":");
        return { resource, action };
      });

      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          organizationId,
          permissions,
          scopeType,
          projectIds:
            scopeType === "organization" ? undefined : selectedProjects,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create token");
      }

      const data = await response.json();
      onTokenCreated(data);

      // Reset form
      setName("");
      setDescription("");
      setScopeType("personal");
      setSelectedProjects(defaultProjectIds || []);
      setSelectedPermissions(new Set());
      setExpiresAt("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Token</DialogTitle>
          <DialogDescription>
            Create a new API token with fine-grained permissions. The token will
            be shown only once after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Token Name *</Label>
            <Input
              id="name"
              placeholder="My API Token"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of what this token is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Token Scope *</Label>
            <RadioGroup
              value={scopeType}
              onValueChange={(value) =>
                setScopeType(value as "personal" | "team" | "organization")
              }
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="personal" id="scope-personal" />
                <Label htmlFor="scope-personal" className="font-normal flex-1">
                  <div className="font-medium">Personal</div>
                  <div className="text-sm text-muted-foreground">
                    Private to you. Optionally limit to specific teams.
                  </div>
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="team" id="scope-team" />
                <Label htmlFor="scope-team" className="font-normal flex-1">
                  <div className="font-medium">Team</div>
                  <div className="text-sm text-muted-foreground">
                    Limited to specific teams only. Select teams below.
                  </div>
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="organization" id="scope-org" />
                <Label htmlFor="scope-org" className="font-normal flex-1">
                  <div className="font-medium">Organization</div>
                  <div className="text-sm text-muted-foreground">
                    Access all teams.{" "}
                    {!isAdmin && "Requires admin approval."}
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(scopeType === "personal" || scopeType === "team") && (
            <div className="space-y-2">
              <Label htmlFor="projects">
                Team Scope {scopeType === "team" && "*"}
              </Label>
              <div className="border rounded-lg p-2 space-y-1">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    No teams available
                  </p>
                ) : (
                  teams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center space-x-2 text-sm p-2 hover:bg-accent rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedProjects.includes(team.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects([...selectedProjects, team.id]);
                          } else {
                            setSelectedProjects(
                              selectedProjects.filter((id) => id !== team.id),
                            );
                          }
                        }}
                      />
                      <span>{team.name}</span>
                    </label>
                  ))
                )}
              </div>
              {scopeType === "personal" && (
                <p className="text-xs text-muted-foreground">
                  Leave empty to access all teams (within your permissions)
                </p>
              )}
            </div>
          )}

          {scopeType === "organization" && !isAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Organization-wide tokens require admin approval before they can
                be used.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions *</Label>
            <div className="border rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto">
              {Object.entries(PERMISSIONS).map(([resource, actions]) => (
                <div key={resource} className="space-y-2">
                  <div className="font-medium text-sm">
                    {RESOURCE_LABELS[resource]}
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-4">
                    {actions.map((action) => {
                      const key = `${resource}:${action}`;
                      return (
                        <label
                          key={key}
                          className="flex items-center space-x-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedPermissions.has(key)}
                            onCheckedChange={() =>
                              togglePermission(resource, action)
                            }
                          />
                          <span>{action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected {selectedPermissions.size} permission
              {selectedPermissions.size !== 1 ? "s" : ""}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The token will only be shown once after creation. Make sure to copy
              and save it securely.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
