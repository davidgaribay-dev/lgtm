"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingToken {
  id: string;
  name: string;
  description: string | null;
  scopeType: string;
  scopeStatus: string;
  permissions: Array<{ resource: string; action: string }>;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
  expiresAt: string | null;
}

interface PendingTokensTableProps {
  organizationId: string;
  onApprovalChange?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PendingTokensTable({
  organizationId,
  onApprovalChange,
}: PendingTokensTableProps) {
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [approveTokenId, setApproveTokenId] = useState<string | null>(null);
  const [rejectTokenId, setRejectTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const { data, mutate } = useSWR<{ tokens: PendingToken[] }>(
    `/api/tokens/pending?organizationId=${organizationId}`,
    fetcher,
  );

  const tokens = data?.tokens || [];

  const toggleExpanded = (tokenId: string) => {
    const newExpanded = new Set(expandedTokens);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    setExpandedTokens(newExpanded);
  };

  const handleApprove = async () => {
    if (!approveTokenId) return;

    setLoading(approveTokenId);
    try {
      const res = await fetch(`/api/tokens/${approveTokenId}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        await mutate();
        onApprovalChange?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve token");
      }
    } catch (err) {
      alert("Failed to approve token");
    } finally {
      setLoading(null);
      setApproveTokenId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTokenId) return;

    setLoading(rejectTokenId);
    try {
      const res = await fetch(`/api/tokens/${rejectTokenId}/reject`, {
        method: "POST",
      });

      if (res.ok) {
        await mutate();
        onApprovalChange?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject token");
      }
    } catch (err) {
      alert("Failed to reject token");
    } finally {
      setLoading(null);
      setRejectTokenId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const groupPermissions = (permissions: Array<{ resource: string; action: string }>) => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach(({ resource, action }) => {
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(action);
    });
    return grouped;
  };

  if (tokens.length === 0) {
    return null;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            <TableHead>Token</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((token) => {
            const isExpanded = expandedTokens.has(token.id);
            const groupedPerms = groupPermissions(token.permissions);

            return (
              <>
                <TableRow key={token.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleExpanded(token.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{token.name}</div>
                      {token.description && (
                        <div className="text-sm text-muted-foreground">
                          {token.description}
                        </div>
                      )}
                      <Badge variant="default" className="mt-1">
                        Organization-wide
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">
                        {token.createdBy.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {token.createdBy.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {token.permissions.length} permission
                      {token.permissions.length !== 1 ? "s" : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(token.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setApproveTokenId(token.id)}
                        disabled={loading === token.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectTokenId(token.id)}
                        disabled={loading === token.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <div className="p-4 space-y-3">
                        <div className="font-medium text-sm">
                          Requested Permissions:
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(groupedPerms).map(
                            ([resource, actions]) => (
                              <div
                                key={resource}
                                className="text-sm space-y-1"
                              >
                                <div className="font-medium capitalize">
                                  {resource}
                                </div>
                                <div className="text-muted-foreground ml-4">
                                  {actions.join(", ")}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        {token.expiresAt && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Expires: {formatDate(token.expiresAt)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!approveTokenId}
        onOpenChange={(open) => !open && setApproveTokenId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow the token to be used for API authentication with
              organization-wide access. The user will be able to use the token
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectTokenId}
        onOpenChange={(open) => !open && setRejectTokenId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the token from being used. The user will need
              to create a new token request if they still need access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
