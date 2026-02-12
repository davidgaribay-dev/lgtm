import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import {
  getTestSuites,
  getSections,
  getTestCases,
} from "@/lib/queries/test-repo";
import { getProjectTestRuns } from "@/lib/queries/test-runs";
import { getProjectTestPlans } from "@/lib/queries/test-plans";
import { getProjectEnvironments } from "@/lib/queries/environments";
import { getProjectCycles } from "@/lib/queries/cycles";
import { buildTree } from "@/lib/tree-utils";
import { TestRunsContent } from "./test-runs-content";

export default async function TestRunsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const [runs, environments, cycles, suites, sections, testCases, testPlans] =
    await Promise.all([
      getProjectTestRuns(team.id),
      getProjectEnvironments(team.id),
      getProjectCycles(team.id),
      getTestSuites(team.id),
      getSections(team.id),
      getTestCases(team.id),
      getProjectTestPlans(team.id),
    ]);

  const treeData = buildTree(suites, sections, testCases);

  return (
    <TestRunsContent
      projectId={team.id}
      teamKey={team.key}
      teamName={team.name}
      workspaceSlug={workspaceSlug}
      initialRuns={runs}
      environments={environments}
      cycles={cycles}
      treeData={treeData}
      testCases={testCases}
      testPlans={testPlans}
    />
  );
}
