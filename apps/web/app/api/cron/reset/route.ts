import { NextRequest, NextResponse } from "next/server";
import { resetAndSeed } from "@/lib/demo-seed";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetAndSeed();

    return NextResponse.json({
      success: true,
      message: "Database reset and demo user seeded",
      userId: result.userId,
      orgId: result.orgId,
    });
  } catch (error) {
    console.error("[CRON RESET] Failed:", error);
    return NextResponse.json(
      { error: "Reset failed", details: String(error) },
      { status: 500 },
    );
  }
}
