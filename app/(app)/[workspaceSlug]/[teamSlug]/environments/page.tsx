import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import {
  getProjectByTeamSlug,
  getProjectEnvironments,
} from "@/lib/queries/environments";
import { PageContainer } from "@/components/page-container";
import { EnvironmentsContent } from "./environments-content";

export const metadata: Metadata = {
  title: "Environments — LGTM",
};

export default async function EnvironmentsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamSlug: string }>;
}) {
  const { workspaceSlug, teamSlug } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const team = await getProjectByTeamSlug(workspaceSlug, teamSlug);

  if (!team) {
    redirect(`/${workspaceSlug}/dashboard`);
  }

  // Check if user is admin/owner for showing management UI
  const adminMembership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, team.organizationId),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const environments = await getProjectEnvironments(team.id);

  return (
    <PageContainer>
      <EnvironmentsContent
        environments={environments}
        team={{ id: team.id, name: team.name }}
        isAdmin={!!adminMembership}
      />
    </PageContainer>
  );
}
