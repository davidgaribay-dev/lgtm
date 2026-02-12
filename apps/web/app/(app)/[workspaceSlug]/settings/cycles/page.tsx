import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, member } from "@/db/schema";
import { WorkspaceCyclesContent } from "./workspace-cycles-content";

export const metadata: Metadata = {
  title: "Workspace Cycles — LGTM",
};

export default async function WorkspaceCyclesPage({
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
    // Non-admins redirected to profile settings
    redirect(`/${workspaceSlug}/settings`);
  }

  return (
    <WorkspaceCyclesContent org={adminOrg} />
  );
}
