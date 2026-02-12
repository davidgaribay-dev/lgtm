import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import { getTestRunByKey, getTestRunResults, getRunMetrics } from "@/lib/queries/test-runs";
import { hasRunLogs } from "@/lib/queries/test-run-logs";
import { TestRunDetailContent } from "./test-run-detail-content";

export default async function TestRunDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string; runKey: string }>;
}) {
  const { workspaceSlug, teamKey, runKey } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const run = await getTestRunByKey(runKey);
  if (!run) notFound();
  if (run.projectId !== team.id) notFound();

  const [results, metrics, hasLogs] = await Promise.all([
    getTestRunResults(run.id),
    getRunMetrics(run.id),
    hasRunLogs(run.id),
  ]);

  return (
    <TestRunDetailContent
      run={run}
      initialResults={results}
      metrics={metrics}
      projectId={team.id}
      teamKey={team.key}
      workspaceSlug={workspaceSlug}
      hasLogs={hasLogs}
    />
  );
}
