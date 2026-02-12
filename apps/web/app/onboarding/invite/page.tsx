import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, member } from "@/db/schema";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = {
  title: "Invite Team — LGTM",
};

export default async function InvitePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const step = (session.user as any).onboardingStep as string | null;

  if (!step) redirect("/workspace-redirect");
  if (step === "workspace") redirect("/onboarding/workspace");
  if (step === "team") redirect("/onboarding/team");

  // Get the user's owned org (just created in the previous step)
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

  return (
    <InviteForm
      orgId={userOrg.id}
      orgName={userOrg.name}
      orgSlug={userOrg.slug}
    />
  );
}
