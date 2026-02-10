import { NextRequest } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  apiToken,
  apiTokenPermission,
  apiTokenProjectScope,
  apiTokenActivity,
} from "@/db/schema";
import { verifyToken, parseToken } from "@/lib/token-utils";

export interface TokenContext {
  type: "api_token";
  userId: string;
  organizationId: string;
  tokenId: string;
  permissions: Map<string, Set<string>>; // resource -> Set<actions>
  projectScopes: string[] | null; // null = all projects, [] = none, [id1, id2] = specific
  scopeType: "personal" | "team" | "organization";
  scopeStatus: "pending" | "approved" | "rejected";
}

export interface SessionContext {
  type: "session";
  userId: string;
  organizationId: string | null;
  session: any; // Better Auth session
}

export type AuthContext = TokenContext | SessionContext | null;

/**
 * Extract and validate API token from Authorization header.
 * Returns null if no token found or invalid.
 */
export async function validateApiToken(
  request: NextRequest,
): Promise<TokenContext | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Validate token format
  const parsed = parseToken(token);
  if (!parsed.valid) {
    return null;
  }

  // Find token in database (only active, non-deleted, non-expired)
  const tokens = await db
    .select({
      id: apiToken.id,
      tokenHash: apiToken.tokenHash,
      userId: apiToken.userId,
      organizationId: apiToken.organizationId,
      status: apiToken.status,
      expiresAt: apiToken.expiresAt,
      scopeType: apiToken.scopeType,
      scopeStatus: apiToken.scopeStatus,
    })
    .from(apiToken)
    .where(and(eq(apiToken.status, "active"), isNull(apiToken.deletedAt)));

  // Try to find matching token by hash (bcrypt compare is expensive)
  let matchedToken = null;
  for (const t of tokens) {
    if (await verifyToken(token, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  if (!matchedToken) {
    return null;
  }

  // Check expiration
  if (
    matchedToken.expiresAt &&
    new Date(matchedToken.expiresAt) < new Date()
  ) {
    return null;
  }

  // Check scope status (only approved tokens can be used)
  if (matchedToken.scopeStatus !== "approved") {
    return null;
  }

  // Load permissions
  const permissions = await db
    .select({
      resource: apiTokenPermission.resource,
      action: apiTokenPermission.action,
    })
    .from(apiTokenPermission)
    .where(eq(apiTokenPermission.tokenId, matchedToken.id));

  const permissionMap = new Map<string, Set<string>>();
  for (const { resource, action } of permissions) {
    if (!permissionMap.has(resource)) {
      permissionMap.set(resource, new Set());
    }
    permissionMap.get(resource)!.add(action);
  }

  // Load project scopes (if any)
  const projectScopes = await db
    .select({ projectId: apiTokenProjectScope.projectId })
    .from(apiTokenProjectScope)
    .where(eq(apiTokenProjectScope.tokenId, matchedToken.id));

  const scopedProjects =
    projectScopes.length > 0
      ? projectScopes.map((s) => s.projectId)
      : null; // null = no scope restriction

  // Update last used timestamp (async, don't wait)
  updateTokenUsage(matchedToken.id, request).catch(console.error);

  return {
    type: "api_token",
    userId: matchedToken.userId,
    organizationId: matchedToken.organizationId,
    tokenId: matchedToken.id,
    permissions: permissionMap,
    projectScopes: scopedProjects,
    scopeType: matchedToken.scopeType as "personal" | "team" | "organization",
    scopeStatus: matchedToken.scopeStatus as "pending" | "approved" | "rejected",
  };
}

async function updateTokenUsage(tokenId: string, request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  await db
    .update(apiToken)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      updatedAt: new Date(),
    })
    .where(eq(apiToken.id, tokenId));
}

/**
 * Log API token activity for audit trail.
 * Call this from routes after successful/failed operations.
 */
export async function logTokenActivity(
  tokenId: string,
  request: NextRequest,
  statusCode: number,
  allowed: boolean,
  resource?: string,
  action?: string,
) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    null;

  const userAgent = request.headers.get("user-agent") || null;
  const url = new URL(request.url);

  await db
    .insert(apiTokenActivity)
    .values({
      tokenId,
      method: request.method,
      path: url.pathname,
      statusCode,
      ipAddress: ip,
      userAgent,
      resource: resource || null,
      action: action || null,
      allowed,
    })
    .catch((err) => {
      // Don't fail the request if activity logging fails
      console.error("Failed to log token activity:", err);
    });
}
