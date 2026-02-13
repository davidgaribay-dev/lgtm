import type { Metadata } from "next";
import { CyclesList } from "@/components/team-settings/cycles-list";

export const metadata: Metadata = {
  title: "Cycles — looptn",
};

export default async function CyclesSettingsPage() {
  return <CyclesList />;
}
