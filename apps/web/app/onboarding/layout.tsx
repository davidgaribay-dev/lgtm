import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onboardingStep = (session.user as any).onboardingStep as
    | string
    | null;

  if (!onboardingStep) {
    redirect("/workspace-redirect");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4 dark:bg-background">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-card px-8 py-10 shadow-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
