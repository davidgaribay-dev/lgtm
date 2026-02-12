import { notFound } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import { getProjectDefects } from "@/lib/queries/defects";
import { DefectsContent } from "./defects-content";

export default async function DefectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  const team = await getProjectByTeamKey(workspaceSlug, teamKey);
  if (!team) notFound();

  const defects = await getProjectDefects(team.id);

  return (
    <DefectsContent
      projectId={team.id}
      teamKey={team.key}
      teamName={team.name}
      workspaceSlug={workspaceSlug}
      initialDefects={defects}
    />
  );
}
