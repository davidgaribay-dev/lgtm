import { db } from "@/db";
import { environment, project, organization } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/** Fetch all active environments for a project, ordered by display order. */
export async function getProjectEnvironments(projectId: string) {
  return db
    .select({
      id: environment.id,
      name: environment.name,
      url: environment.url,
      description: environment.description,
      type: environment.type,
      isDefault: environment.isDefault,
      displayOrder: environment.displayOrder,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    })
    .from(environment)
    .where(
      and(
        eq(environment.projectId, projectId),
        isNull(environment.deletedAt),
      ),
    )
    .orderBy(asc(environment.displayOrder), asc(environment.name));
}

/** Resolve a project by workspace slug + team slug. Returns null if not found. */
export async function getProjectByTeamSlug(
  workspaceSlug: string,
  teamSlug: string,
) {
  return db
    .select({
      id: project.id,
      name: project.name,
      organizationId: project.organizationId,
    })
    .from(project)
    .innerJoin(organization, eq(project.organizationId, organization.id))
    .where(
      and(
        eq(organization.slug, workspaceSlug),
        eq(project.slug, teamSlug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
