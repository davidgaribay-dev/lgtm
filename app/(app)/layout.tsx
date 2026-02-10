import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  return (
    <div className="min-h-svh bg-muted dark:bg-background">
      <AppSidebar user={session.user} />
      <SidebarMainArea>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </SidebarMainArea>
    </div>
  );
}
