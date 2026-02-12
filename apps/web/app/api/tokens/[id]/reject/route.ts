import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apiToken, member } from "@/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Only session-based auth for token management
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the token
  const token = await db
    .select({
      id: apiToken.id,
      organizationId: apiToken.organizationId,
      scopeType: apiToken.scopeType,
      scopeStatus: apiToken.scopeStatus,
    })
    .from(apiToken)
    .where(eq(apiToken.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  // Verify user is admin or owner of the token's org
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, token.organizationId),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify token is pending
  if (token.scopeStatus !== "pending") {
    return NextResponse.json(
      { error: "Token is not pending approval" },
      { status: 400 },
    );
  }

  // Reject the token
  const [updatedToken] = await db
    .update(apiToken)
    .set({
      scopeStatus: "rejected",
      approvedBy: session.user.id,
      approvedAt: new Date(),
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(apiToken.id, id))
    .returning({
      id: apiToken.id,
      name: apiToken.name,
      scopeType: apiToken.scopeType,
      scopeStatus: apiToken.scopeStatus,
      approvedBy: apiToken.approvedBy,
      approvedAt: apiToken.approvedAt,
    });

  return NextResponse.json({ token: updatedToken });
}
