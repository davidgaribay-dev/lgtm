import { db } from "@/db";
import { member, projectMember } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type TeamPermissionLevel =
  | "none"
  | "viewer"
  | "member"
  | "admin"
  | "owner";

/**
 * Get user's effective permission level for a team.
 * Org admins/owners get team_admin access by default.
 */
export async function getTeamPermission(
  userId: string,
  projectId: string,
  organizationId: string,
): Promise<TeamPermissionLevel> {
  // Check org-level role first
  const orgMembership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  // Org admins/owners get automatic team admin access
  if (
    orgMembership?.role === "owner" ||
    orgMembership?.role === "admin"
  ) {
    return "admin";
  }

  // Check team-level membership
  const teamMembership = await db
    .select({ role: projectMember.role })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
        isNull(projectMember.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!teamMembership) return "none";

  // Map team role to permission level
  switch (teamMembership.role) {
    case "team_owner":
      return "owner";
    case "team_admin":
      return "admin";
    case "team_member":
      return "member";
    case "team_viewer":
      return "viewer";
    default:
      return "none";
  }
}

/**
 * Check if user can manage team settings.
 * Only team owners/admins or org admins/owners can manage settings.
 */
export async function canManageTeamSettings(
  userId: string,
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const level = await getTeamPermission(userId, projectId, organizationId);
  return level === "owner" || level === "admin";
}

/**
 * Check if user can manage team members.
 * Only team owners/admins or org admins/owners can manage members.
 */
export async function canManageTeamMembers(
  userId: string,
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const level = await getTeamPermission(userId, projectId, organizationId);
  return level === "owner" || level === "admin";
}

/**
 * Check if user has any access to a team (including read-only).
 */
export async function hasTeamAccess(
  userId: string,
  projectId: string,
  organizationId: string,
): Promise<boolean> {
  const level = await getTeamPermission(userId, projectId, organizationId);
  return level !== "none";
}
