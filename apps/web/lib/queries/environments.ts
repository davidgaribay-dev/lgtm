import { db } from "@/db";
import { environment } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getProjectByTeamKey } from "./workspace";

// Re-export for backward compatibility
export { getProjectByTeamKey };

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

