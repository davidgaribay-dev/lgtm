import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { TeamMembersContent } from "./team-members-content";

export const metadata: Metadata = {
  title: "Team Members — LGTM",
};

export default async function TeamMembersPage() {
  return (
    <PageContainer>
      <TeamMembersContent />
    </PageContainer>
  );
}
