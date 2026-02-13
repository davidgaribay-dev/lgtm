import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard — looptn",
};

export default function DashboardPage() {
  return (
    <PageContainer>
      <DashboardContent />
    </PageContainer>
  );
}
