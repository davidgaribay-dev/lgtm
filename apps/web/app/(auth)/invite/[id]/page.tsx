import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invitation, organization } from "@/db/schema";
import { InviteAcceptContent } from "./invite-accept-content";

export const metadata: Metadata = {
  title: "Accept Invitation — looptn",
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch invitation with org details
  const inv = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      orgName: organization.name,
      orgLogo: organization.logo,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!inv) notFound();

  const isExpired = inv.expiresAt ? new Date(inv.expiresAt) < new Date() : false;
  const isAccepted = inv.status !== "pending";

  // Check if user is authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <InviteAcceptContent
      invitation={{
        id: inv.id,
        email: inv.email,
        role: inv.role,
        orgName: inv.orgName,
        orgLogo: inv.orgLogo,
      }}
      isExpired={isExpired}
      isAccepted={isAccepted}
      isAuthenticated={!!session}
    />
  );
}
