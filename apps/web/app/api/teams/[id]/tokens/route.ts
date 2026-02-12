import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  project,
  apiToken,
  apiTokenProjectScope,
  apiTokenPermission,
} from "@/db/schema";
import { getTeamPermission } from "@/lib/queries/team-permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify team exists and get org ID
  const team = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check permission (must have team access)
  const permission = await getTeamPermission(
    session.user.id,
    id,
    team.organizationId,
  );

  if (permission === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch tokens scoped to this project
  const tokens = await db
    .select({
      id: apiToken.id,
      name: apiToken.name,
      description: apiToken.description,
      tokenPrefix: apiToken.tokenPrefix,
      status: apiToken.status,
      expiresAt: apiToken.expiresAt,
      lastUsedAt: apiToken.lastUsedAt,
      createdAt: apiToken.createdAt,
    })
    .from(apiToken)
    .innerJoin(
      apiTokenProjectScope,
      eq(apiTokenProjectScope.tokenId, apiToken.id),
    )
    .where(
      and(
        eq(apiTokenProjectScope.projectId, id),
        eq(apiToken.userId, session.user.id),
        isNull(apiToken.deletedAt),
      ),
    )
    .orderBy(desc(apiToken.createdAt));

  // Load permissions for each token
  const tokensWithPermissions = await Promise.all(
    tokens.map(async (token) => {
      const perms = await db
        .select({
          resource: apiTokenPermission.resource,
          action: apiTokenPermission.action,
        })
        .from(apiTokenPermission)
        .where(eq(apiTokenPermission.tokenId, token.id));

      return { ...token, permissions: perms };
    }),
  );

  return NextResponse.json(tokensWithPermissions);
}
