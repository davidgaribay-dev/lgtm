import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageContainer } from "@/components/page-container";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = {
  title: "Settings — LGTM",
};

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <SettingsContent user={session.user} />
    </PageContainer>
  );
}
