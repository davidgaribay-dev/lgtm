import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import {
  getTestRunByKey,
  getTestResultByCaseKey,
  getTestRunResultCaseKeys,
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
    runKey: string;
    caseKey: string;
  }>;
}) {
  const { workspaceSlug, teamKey, runKey, caseKey } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const run = await getTestRunByKey(runKey);
  if (!run) notFound();
  if (run.projectId !== team.id) notFound();

  const [result, resultCaseKeys] = await Promise.all([
    getTestResultByCaseKey(run.id, caseKey),
    getTestRunResultCaseKeys(run.id),
  ]);

  if (!result) notFound();

  const [steps, hasLogs, environments, cycles] = await Promise.all([
    getTestResultSteps(result.id),
    hasResultLogs(result.id),
    getProjectEnvironments(team.id),
    getProjectCycles(team.id),
  ]);

  return (
    <TestResultExecutionContent
      run={{
        id: run.id,
        name: run.name,
        runNumber: run.runNumber,
        runKey: run.runKey,
      }}
      result={result}
      steps={steps}
      resultCaseKeys={resultCaseKeys}
      teamKey={team.key}
      workspaceSlug={workspaceSlug}
      hasLogs={hasLogs}
      projectId={team.id}
      environments={environments.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))}
      cycles={cycles.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
    />
  );
}
