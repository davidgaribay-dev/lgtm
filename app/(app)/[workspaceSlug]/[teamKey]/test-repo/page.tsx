import { notFound } from "next/navigation";
import {
  getProjectByTeamKey,
  getTestSuites,
  getSections,
  getTestCases,
} from "@/lib/queries/test-repo";
import { buildTree } from "@/lib/tree-utils";
import { TestRepoContent } from "./test-repo-content";

export default async function TestRepoPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  const projectInfo = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!projectInfo) notFound();

  const [suites, sections, testCases] = await Promise.all([
    getTestSuites(projectInfo.id),
    getSections(projectInfo.id),
    getTestCases(projectInfo.id),
  ]);

  const treeData = buildTree(suites, sections, testCases);

  return (
    <TestRepoContent
      projectId={projectInfo.id}
      treeData={treeData}
      suites={suites}
      sections={sections}
      testCases={testCases}
    />
  );
}
