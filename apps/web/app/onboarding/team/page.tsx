import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, member, project } from "@/db/schema";
import { TeamForm } from "./team-form";

export const metadata: Metadata = {
  title: "Create Team — looptn",
};

export default async function TeamPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const step = (session.user as any).onboardingStep as string | null;

  if (!step) redirect("/workspace-redirect");
  if (step === "workspace") redirect("/onboarding/workspace");
  if (step === "invite") redirect("/onboarding/invite");

  // Get the user's owned org
  const userOrg = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, session.user.id), eq(member.role, "owner")))
    .limit(1)
    .then((rows) => rows[0]);

  if (!userOrg) {
    redirect("/onboarding/workspace");
  }

  // Race condition recovery: if user already has a team in this org, complete onboarding
  const existingTeam = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.organizationId, userOrg.id),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  if (existingTeam.length > 0) {
    redirect(`/${userOrg.slug}/dashboard`);
  }

  return (
    <TeamForm
      orgId={userOrg.id}
      orgName={userOrg.name}
      orgSlug={userOrg.slug}
    />
  );
}
