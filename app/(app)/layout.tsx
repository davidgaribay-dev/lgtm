import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organization, member } from "@/db/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarMainArea } from "@/components/sidebar-main-area";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to route handler that clears the stale session cookie
    // (cookies can't be modified in Server Components, only in Route Handlers)
    redirect("/api/auth/clear-session");
  }

  // Guard: redirect to onboarding if not complete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onboardingStep = (session.user as any).onboardingStep as
    | string
    | null;
  if (onboardingStep === "workspace") {
    redirect("/onboarding/workspace");
  }
  if (onboardingStep === "invite") {
    redirect("/onboarding/invite");
  }

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
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return (
    <div className="min-h-svh bg-muted dark:bg-background">
      <AppSidebar user={session.user} adminOrg={adminOrg} />
      <SidebarMainArea>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </SidebarMainArea>
    </div>
  );
}
