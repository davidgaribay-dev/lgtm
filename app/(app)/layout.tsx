import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

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
    <div className="min-h-svh bg-background">
      <AppHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
