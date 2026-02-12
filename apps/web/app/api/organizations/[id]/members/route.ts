import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { member } from "@/db/schema";
import { getAvailableOrgMembers } from "@/lib/queries/team-members";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: organizationId } = await params;

  // Verify user is a member of this organization
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const excludeTeam = searchParams.get("excludeTeam");

  if (excludeTeam) {
    // Get org members not in the specified team
    const availableMembers = await getAvailableOrgMembers(
      organizationId,
      excludeTeam,
    );
    return NextResponse.json(availableMembers);
  }

  // Return empty array if no excludeTeam specified
  return NextResponse.json([]);
}
