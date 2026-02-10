import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/workspace-redirect");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">LGTM</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Test case management for modern teams
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        {process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== "false" && (
          <Button variant="outline" asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
