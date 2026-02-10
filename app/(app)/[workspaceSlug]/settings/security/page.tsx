import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageContainer } from "@/components/page-container";
import { SecurityContent } from "./security-content";

export const metadata: Metadata = {
  title: "Security — LGTM",
};

export default async function SecurityPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <SecurityContent />
    </PageContainer>
  );
}
