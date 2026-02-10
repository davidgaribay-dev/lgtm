import type { Metadata } from "next";
import { getProjectEnvironments } from "@/lib/queries/environments";
import { PageContainer } from "@/components/page-container";
import { EnvironmentsContent } from "./environments-content";

export const metadata: Metadata = {
  title: "Environments — LGTM",
};

export default async function EnvironmentsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  // Note: Team resolution and permission checking is handled by the team settings layout
  // We need to get the team from the context, but for now we'll use the query helper
  // TODO: Consider using TeamSettingsProvider context instead
  const { getProjectByTeamKey } = await import("@/lib/queries/environments");
  const team = await getProjectByTeamKey(workspaceSlug, teamKey);

  if (!team) {
    return null; // Layout will handle redirect
  }

  const environments = await getProjectEnvironments(team.id);

  return (
    <PageContainer>
      <EnvironmentsContent
        environments={environments}
        team={{ id: team.id, name: team.name }}
        isAdmin={true} // Team settings layout already checks admin permissions
      />
    </PageContainer>
  );
}
