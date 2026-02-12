import type { Metadata } from "next";
import { TestPlansList } from "@/components/team-settings/test-plans-list";

export const metadata: Metadata = {
  title: "Test Plans — LGTM",
};

export default async function TestPlansSettingsPage() {
  return <TestPlansList />;
}
