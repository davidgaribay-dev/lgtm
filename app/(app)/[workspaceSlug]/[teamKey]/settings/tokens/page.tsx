import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { TeamTokensList } from "@/components/team-settings/team-tokens-list";

export const metadata: Metadata = {
  title: "Team API Tokens — LGTM",
};

export default async function TeamTokensPage() {
  return (
    <PageContainer>
      <TeamTokensList />
    </PageContainer>
  );
}
