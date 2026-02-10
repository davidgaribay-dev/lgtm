import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectByTeamKey } from "@/lib/queries/workspace";
import { canManageTeamSettings } from "@/lib/queries/team-permissions";
import { TeamSettingsProvider } from "@/lib/team-settings-context";

export default async function TeamSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { workspaceSlug, teamKey } = await params;

  // Fetch team with org
  const team = await getProjectByTeamKey(workspaceSlug, teamKey);

  if (!team) {
    notFound();
  }

  // Check permission
  const canManage = await canManageTeamSettings(
    session.user.id,
    team.id,
    team.organizationId,
  );

  if (!canManage) {
    redirect(`/${workspaceSlug}/${teamKey}/test-repo`);
  }

  return <TeamSettingsProvider team={team}>{children}</TeamSettingsProvider>;
}
