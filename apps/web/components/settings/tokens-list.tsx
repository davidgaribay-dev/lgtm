"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Key, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import {
  GroupedList,
  groupedListRowClass,
  formatRelativeDate,
  type ListGroup,
} from "@/components/grouped-list";
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
  token?: string;
  prefix: string;
  scopeType: string;
  scopeStatus: string;
  requiresApproval?: boolean;
  createdAt: string;
  expiresAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getTokenEffectiveStatus(token: Token): string {
  if (token.scopeStatus === "pending") return "pending";
  if (token.scopeStatus === "rejected") return "rejected";
  if (token.status === "revoked") return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) < new Date())
    return "expired";
  return "active";
}

function getTokenStatusDotColor(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500 bg-emerald-500/20";
    case "pending":
      return "border-amber-500 bg-amber-500/20";
    case "revoked":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    case "expired":
      return "border-red-500 bg-red-500/20";
    case "rejected":
      return "border-muted-foreground/40 bg-muted-foreground/10";
    default:
      return "border-muted-foreground/40 bg-muted-foreground/10";
  }
}

function getTokenStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending Approval";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

const TOKEN_STATUS_ORDER = [
  "active",
  "pending",
  "revoked",
  "expired",
  "rejected",
] as const;

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

  const groups = useMemo((): ListGroup<Token>[] => {
    if (!tokens) return [];
    const map = new Map<string, Token[]>();
    for (const t of tokens) {
      const effectiveStatus = getTokenEffectiveStatus(t);
      const list = map.get(effectiveStatus) ?? [];
      list.push(t);
      map.set(effectiveStatus, list);
    }
    return TOKEN_STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({
      key: s,
      label: getTokenStatusLabel(s),
      dotColor: getTokenStatusDotColor(s),
      items: map.get(s)!,
    }));
  }, [tokens]);

  const handleRevoke = async (tokenId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this token? This action cannot be undone.",
      )
    ) {
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

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageBreadcrumb items={[{ label: "API Tokens" }]}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateDialog(true)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </PageBreadcrumb>

      {isAdmin && (
        <div className="border-b px-4 py-4">
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
        </div>
      )}

      <div className="flex-1">
        {!tokens ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <GroupedList
            groups={groups}
            getItemId={(t) => t.id}
            emptyIcon={
              <Key className="h-10 w-10 text-muted-foreground/40" />
            }
            emptyTitle="No API tokens"
            emptyDescription="Create a token to enable programmatic API access."
            emptyAction={
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Token
              </Button>
            }
            renderRow={(token) => {
              const effectiveStatus = getTokenEffectiveStatus(token);
              const canRevoke =
                effectiveStatus === "active" || effectiveStatus === "pending";
              return (
                <div className={groupedListRowClass}>
                  {canRevoke && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRevoke(token.id)}
                        >
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {!canRevoke && <span className="w-5 shrink-0" />}

                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${getTokenStatusDotColor(effectiveStatus)}`}
                  />

                  <span className="min-w-0 flex-1 truncate font-medium">
                    {token.name}
                  </span>

                  <div className="flex shrink-0 items-center gap-3">
                    <code className="text-xs text-muted-foreground">
                      ...{token.tokenPrefix}
                    </code>

                    <Badge
                      variant={
                        token.scopeType === "organization"
                          ? "default"
                          : token.scopeType === "team"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px] leading-none"
                    >
                      {token.scopeType === "personal"
                        ? "Personal"
                        : token.scopeType === "team"
                          ? "Team"
                          : "Org"}
                    </Badge>

                    <span className="text-xs text-muted-foreground">
                      {token.permissions.length} perm
                      {token.permissions.length !== 1 ? "s" : ""}
                    </span>

                    <span className="w-12 text-right text-[11px] text-muted-foreground">
                      {formatRelativeDate(token.createdAt)}
                    </span>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

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
