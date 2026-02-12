import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getWorkspaceBySlug,
  getWorkspaceTeams,
} from "@/lib/queries/workspace";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarMainArea } from "@/components/sidebar-main-area";
import { DndProviderWrapper } from "@/components/dnd-provider-wrapper";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const workspace = await getWorkspaceBySlug(workspaceSlug, session.user.id);
  if (!workspace) notFound();

  const teams = await getWorkspaceTeams(workspace.orgId);

  const isAdmin = workspace.role === "owner" || workspace.role === "admin";

  return (
    <WorkspaceProvider
      value={{
        workspace: {
          id: workspace.orgId,
          name: workspace.orgName,
          slug: workspace.orgSlug,
          logo: workspace.orgLogo,
        },
        teams,
        userRole: workspace.role,
        isAdmin,
      }}
    >
      <DndProviderWrapper>
        <div className="min-h-svh bg-muted dark:bg-background">
          <AppSidebar user={session.user} />
          <SidebarMainArea>
            <main>{children}</main>
          </SidebarMainArea>
        </div>
      </DndProviderWrapper>
    </WorkspaceProvider>
  );
}
