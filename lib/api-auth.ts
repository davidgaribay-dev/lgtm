import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, member } from "@/db/schema";
import {
  validateApiToken,
  type AuthContext,
  type TokenContext,
} from "@/lib/api-token-auth";

interface ProjectAccess {
  authContext: AuthContext;
  organizationId: string;
  userRole?: string; // Only for sessions
}

/**
 * Get authentication context from either session cookie or API token.
 * Checks Authorization header first, falls back to session.
 */
export async function getAuthContext(
  request?: NextRequest,
): Promise<AuthContext> {
  // Try API token first (if request provided)
  if (request) {
    const tokenContext = await validateApiToken(request);
    if (tokenContext) {
      return tokenContext;
    }
  }

  // Fall back to session-based auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return {
    type: "session",
    userId: session.user.id,
    organizationId: session.session.activeOrganizationId || null,
    session,
  };
}

/**
 * Verify the current user/token has access to a project.
 * For tokens: checks permissions and project scope.
 * For sessions: checks org membership.
 */
export async function verifyProjectAccess(
  projectId: string,
  request?: NextRequest,
): Promise<ProjectAccess | NextResponse> {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get project details
  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // API Token authentication
  if (authContext.type === "api_token") {
    // Check organization match
    if (authContext.organizationId !== proj.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check project scope (if token has project restrictions)
    if (
      authContext.projectScopes &&
      !authContext.projectScopes.includes(projectId)
    ) {
      return NextResponse.json(
        { error: "Forbidden - project scope" },
        { status: 403 },
      );
    }

    return { authContext, organizationId: proj.organizationId };
  }

  // Session-based authentication (existing logic)
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, proj.organizationId),
        eq(member.userId, authContext.userId),
        inArray(member.role, ["owner", "admin", "member"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    authContext,
    organizationId: proj.organizationId,
    userRole: membership.role,
  };
}
