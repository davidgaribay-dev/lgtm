import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = {
  title: "Create Workspace — looptn",
};

export default async function WorkspacePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const step = (session.user as any).onboardingStep as string | null;

  if (!step) redirect("/workspace-redirect");
  if (step === "invite") redirect("/onboarding/invite");
  if (step === "team") redirect("/onboarding/team");

  // Race condition recovery: if user already has an org, advance to invite
  const existingOrg = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1);

  if (existingOrg.length > 0) {
    redirect("/onboarding/invite");
  }

  return <WorkspaceForm />;
}
