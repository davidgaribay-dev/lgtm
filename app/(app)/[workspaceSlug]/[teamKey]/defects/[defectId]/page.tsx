import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import { getDefect } from "@/lib/queries/defects";
import { getProjectEnvironments } from "@/lib/queries/environments";
import { getProjectCycles } from "@/lib/queries/cycles";
import { DefectDetailContent } from "./defect-detail-content";

export default async function DefectDetailPage({
  params,
}: {
  params: Promise<{
    workspaceSlug: string;
    teamKey: string;
    defectId: string;
  }>;
}) {
  const { workspaceSlug, teamKey, defectId } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const [defectData, environments, cycles] = await Promise.all([
    getDefect(defectId),
    getProjectEnvironments(team.id),
    getProjectCycles(team.id),
  ]);

  if (!defectData) notFound();

  return (
    <DefectDetailContent
      defect={defectData}
      projectId={team.id}
      teamKey={team.key}
      workspaceSlug={workspaceSlug}
      environments={environments}
      cycles={cycles}
    />
  );
}
