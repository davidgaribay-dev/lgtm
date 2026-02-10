import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTestSteps } from "@/lib/queries/test-repo";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testCaseId = request.nextUrl.searchParams.get("testCaseId");

  if (!testCaseId) {
    return NextResponse.json(
      { error: "testCaseId is required" },
      { status: 400 },
    );
  }

  const steps = await getTestSteps(testCaseId);

  return NextResponse.json(steps);
}
