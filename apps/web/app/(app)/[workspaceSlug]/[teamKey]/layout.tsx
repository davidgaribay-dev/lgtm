import { notFound, redirect } from "next/navigation";
import { getProjectByTeamKey } from "@/lib/queries/workspace";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; teamKey: string }>;
}) {
  const { workspaceSlug, teamKey } = await params;

  // Normalize key to uppercase
  const upperKey = teamKey.toUpperCase();

  // Use shared helper to lookup team by key
  const team = await getProjectByTeamKey(workspaceSlug, upperKey);

  if (!team) notFound();

  // If key was lowercase in URL, redirect to uppercase
  if (teamKey !== upperKey) {
    redirect(`/${workspaceSlug}/${upperKey}`);
  }

  return <>{children}</>;
}
