import type { Metadata } from "next";
import { TestPlansList } from "@/components/team-settings/test-plans-list";

export const metadata: Metadata = {
  title: "Test Plans — looptn",
};

export default async function TestPlansSettingsPage() {
  return <TestPlansList />;
}
