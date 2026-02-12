import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getWorkspaceBySlug,
  getWorkspaceTeams,
} from "@/lib/queries/workspace";
import { TeamsContent } from "./teams-content";

export const metadata: Metadata = {
  title: "Teams — LGTM",
};

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id);
  if (!workspace) redirect("/login");

  const teams = await getWorkspaceTeams(workspace.orgId);
  const isAdmin = workspace.role === "owner" || workspace.role === "admin";

  return (
    <TeamsContent
      teams={teams}
      workspaceSlug={workspaceSlug}
      organizationId={workspace.orgId}
      isAdmin={isAdmin}
      userId={session.user.id}
    />
  );
}
