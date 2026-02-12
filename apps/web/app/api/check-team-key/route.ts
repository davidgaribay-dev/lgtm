import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project } from "@/db/schema";
import { headers } from "next/headers";
import { validateTeamKey } from "@/lib/utils";

const RESERVED_TEAM_KEYS = [
  "TEST",
  "TEMP",
  "ADMIN",
  "ROOT",
  "API",
  "APP",
  "WEB",
  "DASHBOARD",
  "TEAMS",
  "SETTINGS",
];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ available: false }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  const orgId = request.nextUrl.searchParams.get("orgId");

  if (!key || key.length < 2 || !orgId) {
    return NextResponse.json({ available: false });
  }

  // Validate key format
  const validation = validateTeamKey(key);
  if (!validation.valid) {
    return NextResponse.json({ available: false });
  }

  // Check if reserved
  if (RESERVED_TEAM_KEYS.includes(key.toUpperCase())) {
    return NextResponse.json({ available: false });
  }

  // Check database uniqueness (per organization)
  const existing = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.organizationId, orgId),
        eq(project.key, key.toUpperCase()),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return NextResponse.json({ available: existing.length === 0 });
}
