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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Copy, Check } from "lucide-react";

interface ShowTokenDialogProps {
  token: {
    id: string;
    name: string;
    token?: string; // Optional for pending tokens
    prefix: string;
    scopeType?: string;
    scopeStatus?: string;
    requiresApproval?: boolean;
    createdAt: string;
    expiresAt: string | null;
  } | null;
  onClose: () => void;
}

export function ShowTokenDialog({ token, onClose }: ShowTokenDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!token || !token.token) return;

    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const isPendingApproval = token?.requiresApproval || !token?.token;

  return (
    <Dialog open={!!token} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isPendingApproval
              ? "Token Awaiting Approval"
              : "Token Created Successfully"}
          </DialogTitle>
          <DialogDescription>
            {isPendingApproval
              ? "Your organization-wide token has been created and is awaiting admin approval."
              : "Your API token has been created. Make sure to copy it now - you won't be able to see it again."}
          </DialogDescription>
        </DialogHeader>

        {token && (
          <div className="space-y-4">
            {isPendingApproval ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Organization-wide tokens require approval from a workspace
                  admin before they can be used. You'll be able to see and use
                  this token once it's been approved.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This token will only be shown
                  once. Copy it now and store it securely.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">Token Name</div>
              <div className="text-sm text-muted-foreground">{token.name}</div>
            </div>

            {!isPendingApproval && token.token && (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Your API Token</div>
                  <div className="relative">
                    <div className="bg-muted p-3 rounded-md font-mono text-xs break-all border">
                      {token.token}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    • Use this token in the Authorization header as: Bearer{" "}
                    {token.token.slice(0, 20)}...
                  </p>
                  <p>• This token can be used to authenticate API requests</p>
                  <p>
                    • Created: {new Date(token.createdAt).toLocaleString()}
                  </p>
                  {token.expiresAt && (
                    <p>
                      • Expires: {new Date(token.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {isPendingApproval && (
              <div className="text-sm text-muted-foreground">
                <p>
                  • Created: {new Date(token.createdAt).toLocaleString()}
                </p>
                {token.expiresAt && (
                  <p>
                    • Will expire: {new Date(token.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
