import type { Metadata } from "next";
import { SharedStepsList } from "@/components/team-settings/shared-steps-list";

export const metadata: Metadata = {
  title: "Shared Steps — LGTM",
};

export default async function SharedStepsSettingsPage() {
  return <SharedStepsList />;
}
