import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import { getTestRun, getTestRunResults, getRunMetrics } from "@/lib/queries/test-runs";
import { hasRunLogs } from "@/lib/queries/test-run-logs";
import { TestRunDetailContent } from "./test-run-detail-content";

export default async function TestRunDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string; runId: string }>;
}) {
  const { workspaceSlug, teamKey, runId } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const [run, results, metrics, hasLogs] = await Promise.all([
    getTestRun(runId),
    getTestRunResults(runId),
    getRunMetrics(runId),
    hasRunLogs(runId),
  ]);

  if (!run) notFound();

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
