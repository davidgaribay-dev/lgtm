import type { Metadata } from "next";
import { SharedStepDetail } from "@/components/team-settings/shared-step-detail";

export const metadata: Metadata = {
  title: "Shared Step — looptn",
};

export default async function SharedStepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SharedStepDetail sharedStepId={id} />;
}
