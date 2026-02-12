import type { Metadata } from "next";
import { TeamMembersList } from "@/components/team-settings/team-members-list";

export const metadata: Metadata = {
  title: "Team Members — LGTM",
};

export default async function TeamMembersPage() {
  return <TeamMembersList />;
}
