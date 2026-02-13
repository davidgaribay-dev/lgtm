import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, project, member } from "@/db/schema";
import { TokensList } from "@/components/settings/tokens-list";

export const metadata: Metadata = {
  title: "API Tokens — looptn",
};

export default async function TokensPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { workspaceSlug } = await params;

  // Get organization from slug
  const org = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slug, workspaceSlug))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!org) {
    notFound();
  }

  // Check if user is admin
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, org.id),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const isAdmin =
    membership && ["owner", "admin"].includes(membership.role);

  // Fetch teams (projects) for team scope selector
  const teams = await db
    .select({
      id: project.id,
      name: project.name,
    })
    .from(project)
    .where(and(eq(project.organizationId, org.id), isNull(project.deletedAt)))
    .orderBy(project.displayOrder);

  return (
    <TokensList
      organizationId={org.id}
      teams={teams}
      isAdmin={isAdmin || false}
    />
  );
}
