import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { TeamInfoForm } from "@/components/team-settings/team-info-form";

export const metadata: Metadata = {
  title: "Team Settings — looptn",
};

export default async function TeamSettingsPage() {
  return (
    <PageContainer>
      <TeamInfoForm />
    </PageContainer>
  );
}
