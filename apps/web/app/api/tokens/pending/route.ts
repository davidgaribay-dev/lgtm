import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  apiToken,
  apiTokenPermission,
  member,
  user,
} from "@/db/schema";

export async function GET(request: NextRequest) {
  // Only session-based auth for token management
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 },
    );
  }

  // Verify user is admin or owner of org
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // List pending organization-scoped tokens
  const pendingTokens = await db
    .select({
      id: apiToken.id,
      name: apiToken.name,
      description: apiToken.description,
      scopeType: apiToken.scopeType,
      scopeStatus: apiToken.scopeStatus,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
      createdBy: apiToken.createdBy,
      userName: user.name,
      userEmail: user.email,
    })
    .from(apiToken)
    .innerJoin(user, eq(apiToken.userId, user.id))
    .where(
      and(
        eq(apiToken.organizationId, organizationId),
        eq(apiToken.scopeType, "organization"),
        eq(apiToken.scopeStatus, "pending"),
        isNull(apiToken.deletedAt),
      ),
    )
    .orderBy(desc(apiToken.createdAt));

  // Load permissions for each token
  const tokensWithPermissions = await Promise.all(
    pendingTokens.map(async (token) => {
      const perms = await db
        .select({
          resource: apiTokenPermission.resource,
          action: apiTokenPermission.action,
        })
        .from(apiTokenPermission)
        .where(eq(apiTokenPermission.tokenId, token.id));

      return {
        id: token.id,
        name: token.name,
        description: token.description,
        scopeType: token.scopeType,
        scopeStatus: token.scopeStatus,
        permissions: perms,
        createdBy: {
          id: token.createdBy,
          name: token.userName,
          email: token.userEmail,
        },
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
      };
    }),
  );

  return NextResponse.json({ tokens: tokensWithPermissions });
}
