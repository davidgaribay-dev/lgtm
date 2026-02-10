"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { CreateTokenDialog } from "./create-token-dialog";
import { ShowTokenDialog } from "./show-token-dialog";
import { PendingTokensTable } from "./pending-tokens-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Token {
  id: string;
  name: string;
  description: string | null;
  tokenPrefix: string;
  status: string;
  scopeType: "personal" | "team" | "organization";
  scopeStatus: "pending" | "approved" | "rejected";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  permissions: Array<{ resource: string; action: string }>;
  projectScopes: string[];
}

interface NewToken {
  id: string;
  name: string;
  token?: string; // Only present for approved tokens
  prefix: string;
  scopeType: string;
  scopeStatus: string;
  requiresApproval?: boolean;
  createdAt: string;
  expiresAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TokensListProps {
  organizationId: string;
  teams?: Array<{ id: string; name: string }>;
  isAdmin?: boolean;
}

export function TokensList({
  organizationId,
  teams = [],
  isAdmin = false,
}: TokensListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newToken, setNewToken] = useState<NewToken | null>(null);

  const { data: tokens, mutate } = useSWR<Token[]>(
    `/api/tokens?organizationId=${organizationId}`,
    fetcher,
  );

  const handleRevoke = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this token? This action cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/tokens/${tokenId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      mutate();
    } else {
      alert("Failed to revoke token");
    }
  };

  const handleTokenCreated = (token: NewToken) => {
    mutate();
    setShowCreateDialog(false);
    setNewToken(token);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Tokens</h1>
          <p className="text-muted-foreground">
            Create and manage API tokens for programmatic access.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      {isAdmin && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              Review organization-wide token requests from team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingTokensTable
              organizationId={organizationId}
              onApprovalChange={() => mutate()}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active tokens</CardTitle>
          <CardDescription>
            {tokens?.length ?? 0} {tokens?.length === 1 ? "token" : "tokens"} in
            this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tokens && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {tokens && tokens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No API tokens yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
              {tokens?.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{token.name}</div>
                      {token.description && (
                        <div className="text-sm text-muted-foreground">
                          {token.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">...{token.tokenPrefix}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        token.scopeType === "organization"
                          ? "default"
                          : token.scopeType === "team"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {token.scopeType === "personal"
                        ? "Personal"
                        : token.scopeType === "team"
                          ? "Team"
                          : "Organization"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {token.scopeStatus === "pending" ? (
                      <Badge variant="outline" className="border-orange-500 text-orange-500">
                        Pending Approval
                      </Badge>
                    ) : token.scopeStatus === "rejected" ? (
                      <Badge variant="destructive">Rejected</Badge>
                    ) : isExpired(token.expiresAt) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : token.status === "revoked" ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {token.expiresAt ? formatDate(token.expiresAt) : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {token.permissions.length} permission
                      {token.permissions.length !== 1 ? "s" : ""}
                      {token.projectScopes.length > 0 && (
                        <div className="text-muted-foreground">
                          {token.projectScopes.length} project
                          {token.projectScopes.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(token.id)}
                      disabled={token.status === "revoked" || isExpired(token.expiresAt)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateTokenDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
        onTokenCreated={handleTokenCreated}
        teams={teams}
        isAdmin={isAdmin}
      />

      <ShowTokenDialog
        token={newToken}
        onClose={() => setNewToken(null)}
      />
    </div>
  );
}
