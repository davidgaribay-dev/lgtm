import { db } from "@/db";
import {
  projectMember,
  user,
  member,
  projectMemberInvitation,
} from "@/db/schema";
import { eq, and, isNull, notInArray, desc } from "drizzle-orm";

/**
 * Get all team members with user details.
 */
export async function getTeamMembers(projectId: string) {
  return db
    .select({
      memberId: projectMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: projectMember.role,
      joinedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(projectMember.userId, user.id))
    .where(
      and(eq(projectMember.projectId, projectId), isNull(projectMember.deletedAt)),
    )
    .orderBy(desc(projectMember.createdAt));
}

/**
 * Get org members who are NOT yet team members (for invitation).
 */
export async function getAvailableOrgMembers(
  organizationId: string,
  projectId: string,
) {
  // Get existing team member user IDs
  const existingMembers = await db
    .select({ userId: projectMember.userId })
    .from(projectMember)
    .where(
      and(eq(projectMember.projectId, projectId), isNull(projectMember.deletedAt)),
    );

  const existingUserIds = existingMembers.map((m) => m.userId);

  // Get org members not in team
  const queryConditions = [eq(member.organizationId, organizationId)];

  // Add notInArray condition only if there are existing members
  if (existingUserIds.length > 0) {
    queryConditions.push(notInArray(user.id, existingUserIds));
  }

  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      orgRole: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(...queryConditions));
}

/**
 * Get pending team member invitations.
 */
export async function getTeamInvitations(projectId: string) {
  return db
    .select({
      id: projectMemberInvitation.id,
      email: projectMemberInvitation.email,
      role: projectMemberInvitation.role,
      status: projectMemberInvitation.status,
      expiresAt: projectMemberInvitation.expiresAt,
      createdAt: projectMemberInvitation.createdAt,
    })
    .from(projectMemberInvitation)
    .where(
      and(
        eq(projectMemberInvitation.projectId, projectId),
        eq(projectMemberInvitation.status, "pending"),
      ),
    )
    .orderBy(desc(projectMemberInvitation.createdAt));
}

/**
 * Check if a user is already a team member.
 */
export async function isTeamMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: projectMember.id })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
        isNull(projectMember.deletedAt),
      ),
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get team member count by role.
 */
export async function getTeamMemberCountByRole(
  projectId: string,
  role: string,
): Promise<number> {
  const result = await db
    .select({ id: projectMember.id })
    .from(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.role, role),
        isNull(projectMember.deletedAt),
      ),
    );

  return result.length;
}
