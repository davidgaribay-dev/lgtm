import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const step: string | null = body.step;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStep = (session.user as any).onboardingStep as
    | string
    | null;

  // Validate transitions: "workspace" → "invite", "invite" → null
  if (currentStep === "workspace" && step !== "invite") {
    return NextResponse.json(
      { error: "Invalid step transition" },
      { status: 400 },
    );
  }
  if (currentStep === "invite" && step !== null) {
    return NextResponse.json(
      { error: "Invalid step transition" },
      { status: 400 },
    );
  }
  if (currentStep === null || currentStep === undefined) {
    return NextResponse.json(
      { error: "Onboarding already complete" },
      { status: 400 },
    );
  }

  await db
    .update(user)
    .set({ onboardingStep: step })
    .where(eq(user.id, session.user.id));

  // Clear session cache cookie so the next request fetches fresh data
  const response = NextResponse.json({ success: true });
  response.cookies.delete("better-auth.session_data");

  return response;
}
