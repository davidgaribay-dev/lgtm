import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { project, organization } from "@/db/schema";
import { PageContainer } from "@/components/page-container";

export default async function TestRunsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamSlug: string }>;
}) {
  const { workspaceSlug, teamSlug } = await params;

  const team = await db
    .select({ name: project.name })
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

  return (
    <PageContainer>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {team?.name} — Test Runs
          </h1>
          <p className="text-muted-foreground">
            View and manage test execution runs.
          </p>
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </PageContainer>
  );
}
