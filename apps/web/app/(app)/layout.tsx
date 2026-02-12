import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
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
  if (onboardingStep === "team") {
    redirect("/onboarding/team");
  }

  return <>{children}</>;
}
