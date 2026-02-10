import { notFound } from "next/navigation";
import {
  getProjectByTeamSlug,
  getTestSuites,
  getSections,
  getTestCases,
} from "@/lib/queries/test-repo";
import { buildTree } from "@/lib/tree-utils";
import { TestRepoContent } from "./test-repo-content";

export default async function TestRepoPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamSlug: string }>;
}) {
  const { workspaceSlug, teamSlug } = await params;

  const projectInfo = await getProjectByTeamSlug(workspaceSlug, teamSlug);
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
