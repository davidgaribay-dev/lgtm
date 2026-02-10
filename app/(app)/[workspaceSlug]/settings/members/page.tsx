import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, member, invitation, user } from "@/db/schema";
import { MembersContent } from "./members-content";

export const metadata: Metadata = {
  title: "Members — LGTM",
};

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Look up the org by workspace slug and verify admin/owner role
  const adminOrg = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(organization.slug, workspaceSlug),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!adminOrg) {
    redirect(`/${workspaceSlug}/settings`);
  }

  // Fetch all members with user details
  const members = await db
    .select({
      memberId: member.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, adminOrg.id));

  // Fetch pending invitations
  const pendingInvitations = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, adminOrg.id),
        eq(invitation.status, "pending"),
      ),
    );

  return (
    <MembersContent
      org={adminOrg}
      members={members}
      pendingInvitations={pendingInvitations}
      currentUserId={session.user.id}
    />
  );
}
