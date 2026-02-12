import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import {
  getTestRun,
  getTestResult,
  getTestRunResultIds,
  getTestResultSteps,
} from "@/lib/queries/test-runs";
import { hasResultLogs } from "@/lib/queries/test-run-logs";
import { getProjectEnvironments } from "@/lib/queries/environments";
import { getProjectCycles } from "@/lib/queries/cycles";
import { TestResultExecutionContent } from "./test-result-execution-content";

export default async function TestResultExecutionPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    teamKey: string;
    runId: string;
    resultId: string;
  }>;
}) {
  const { workspaceSlug, teamKey, runId, resultId } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const [run, result, resultIds, steps, hasLogs, environments, cycles] =
    await Promise.all([
      getTestRun(runId),
      getTestResult(resultId),
      getTestRunResultIds(runId),
      getTestResultSteps(resultId),
      hasResultLogs(resultId),
      getProjectEnvironments(team.id),
      getProjectCycles(team.id),
    ]);

  if (!run || !result) notFound();

  // Verify result belongs to this run
  if (result.testRunId !== runId) notFound();

  return (
    <TestResultExecutionContent
      run={{
        id: run.id,
        name: run.name,
        runNumber: run.runNumber,
      }}
      result={result}
      steps={steps}
      resultIds={resultIds}
      teamKey={team.key}
      workspaceSlug={workspaceSlug}
      hasLogs={hasLogs}
      projectId={team.id}
      environments={environments.map((e) => ({ id: e.id, name: e.name }))}
      cycles={cycles.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
