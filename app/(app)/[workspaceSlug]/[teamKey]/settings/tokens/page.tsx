import type { Metadata } from "next";
import { TeamTokensList } from "@/components/team-settings/team-tokens-list";

export const metadata: Metadata = {
  title: "Team API Tokens — LGTM",
};

export default async function TeamTokensPage() {
  return <TeamTokensList />;
}
