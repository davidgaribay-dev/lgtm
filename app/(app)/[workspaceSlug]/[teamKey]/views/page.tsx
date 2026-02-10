import { PageContainer } from "@/components/page-container";
import { getProjectByTeamKey } from "@/lib/queries/workspace";

export default async function ViewsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);

  return (
    <PageContainer>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {team?.name} — Views
          </h1>
          <p className="text-muted-foreground">
            Dashboards, reports, and metrics.
          </p>
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </PageContainer>
  );
}
