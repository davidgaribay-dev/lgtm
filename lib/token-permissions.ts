import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { member } from "@/db/schema";
import type { TokenContext } from "@/lib/api-token-auth";
import { ownerRole, adminRole, memberRole, viewerRole } from "@/lib/permissions";

/**
 * Check if a token has permission for a specific resource:action.
 */
export function hasTokenPermission(
  context: TokenContext,
  resource: string,
  action: string,
): boolean {
  const resourcePerms = context.permissions.get(resource);
  return resourcePerms?.has(action) ?? false;
}

/**
 * Check if a token has ANY of the specified permissions.
 */
export function hasAnyTokenPermission(
  context: TokenContext,
  checks: Array<{ resource: string; action: string }>,
): boolean {
  return checks.some(({ resource, action }) =>
    hasTokenPermission(context, resource, action),
  );
}

/**
 * Check if a token has ALL of the specified permissions.
 */
export function hasAllTokenPermissions(
  context: TokenContext,
  checks: Array<{ resource: string; action: string }>,
): boolean {
  return checks.every(({ resource, action }) =>
    hasTokenPermission(context, resource, action),
  );
}

/**
 * Get user's role-based permissions (for comparison/validation).
 * Used when creating tokens to ensure we don't grant more than user has.
 */
export async function getUserMaxPermissions(
  userId: string,
  organizationId: string,
): Promise<Map<string, Set<string>>> {
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return new Map();
  }

  // Map role to permissions using lib/permissions.ts definitions
  let rolePermissions;
  switch (membership.role) {
    case "owner":
      rolePermissions = ownerRole;
      break;
    case "admin":
      rolePermissions = adminRole;
      break;
    case "member":
      rolePermissions = memberRole;
      break;
    case "viewer":
      rolePermissions = viewerRole;
      break;
    default:
      return new Map();
  }

  // Convert role object to Map<resource, Set<actions>>
  const permMap = new Map<string, Set<string>>();
  for (const [resource, actions] of Object.entries(rolePermissions)) {
    if (Array.isArray(actions)) {
      permMap.set(resource, new Set(actions));
    }
  }

  return permMap;
}

/**
 * Validate that requested permissions are subset of user's role permissions.
 * Returns validation result and list of invalid permissions.
 */
export async function validateTokenPermissions(
  userId: string,
  organizationId: string,
  requestedPermissions: Array<{ resource: string; action: string }>,
): Promise<{
  valid: boolean;
  invalidPerms: Array<{ resource: string; action: string }>;
}> {
  const userPerms = await getUserMaxPermissions(userId, organizationId);

  const invalidPerms: Array<{ resource: string; action: string }> = [];

  for (const { resource, action } of requestedPermissions) {
    const resourceActions = userPerms.get(resource);
    if (!resourceActions || !resourceActions.has(action)) {
      invalidPerms.push({ resource, action });
    }
  }

  return {
    valid: invalidPerms.length === 0,
    invalidPerms,
  };
}

/**
 * Check if a token has access to a specific project.
 * Organization tokens always have access.
 * Personal/team tokens check project scopes.
 */
export function hasProjectAccess(
  context: TokenContext,
  projectId: string,
): boolean {
  // Organization-scoped tokens always have access to all projects
  if (context.scopeType === "organization") {
    return true;
  }

  // Personal/team tokens check project scopes
  // null = no restrictions (personal token without project scopes)
  // array = restricted to listed projects
  if (context.projectScopes === null) {
    return true; // No project restrictions
  }

  // Check if project is in the allowed list
  return context.projectScopes.includes(projectId);
}
