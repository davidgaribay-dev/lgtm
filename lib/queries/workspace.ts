import { db } from "@/db";
import { organization, member, project } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/** Validate workspace slug and user membership. Returns null if invalid. */
export async function getWorkspaceBySlug(slug: string, userId: string) {
  return db
    .select({
      orgId: organization.id,
      orgName: organization.name,
      orgSlug: organization.slug,
      orgLogo: organization.logo,
      role: member.role,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(and(eq(organization.slug, slug), eq(member.userId, userId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/** Fetch all active teams (projects) in a workspace. */
export async function getWorkspaceTeams(organizationId: string) {
  return db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      displayOrder: project.displayOrder,
    })
    .from(project)
    .where(
      and(eq(project.organizationId, organizationId), isNull(project.deletedAt))
    )
    .orderBy(asc(project.displayOrder), asc(project.name));
}

/** Get user's first workspace slug (for redirects). */
export async function getFirstWorkspaceSlug(userId: string) {
  const result = await db
    .select({ slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return result?.slug ?? null;
}
