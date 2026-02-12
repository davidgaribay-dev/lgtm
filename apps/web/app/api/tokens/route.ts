import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  apiToken,
  apiTokenPermission,
  apiTokenProjectScope,
  member,
  project,
} from "@/db/schema";
import { generateToken, hashToken } from "@/lib/token-utils";
import { validateTokenPermissions } from "@/lib/token-permissions";

interface CreateTokenRequest {
  name: string;
  description?: string;
  organizationId: string;
  permissions: Array<{ resource: string; action: string }>;
  scopeType: "personal" | "team" | "organization";
  projectIds?: string[]; // Required for team scope, optional for personal
  expiresAt?: string; // ISO date string
}

export async function POST(request: NextRequest) {
  // Only session-based auth for token management (not tokens managing tokens)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateTokenRequest = await request.json();
  const { name, description, organizationId, permissions, scopeType, projectIds, expiresAt } =
    body;

  // Validation
  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Token name is required" },
      { status: 400 },
    );
  }

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 },
    );
  }

  if (!permissions || permissions.length === 0) {
    return NextResponse.json(
      { error: "At least one permission is required" },
      { status: 400 },
    );
  }

  if (!scopeType || !["personal", "team", "organization"].includes(scopeType)) {
    return NextResponse.json(
      { error: "Invalid scope type" },
      { status: 400 },
    );
  }

  if (scopeType === "team" && (!projectIds || projectIds.length === 0)) {
    return NextResponse.json(
      { error: "Team-scoped tokens require at least one team" },
      { status: 400 },
    );
  }

  // Verify user is member of org
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

  // Validate permissions (can't grant more than user has)
  const validation = await validateTokenPermissions(
    session.user.id,
    organizationId,
    permissions,
  );

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: "Cannot grant permissions you don't have",
        invalidPermissions: validation.invalidPerms,
      },
      { status: 400 },
    );
  }

  // Determine scope status based on scope type and user role
  let scopeStatus: "pending" | "approved" | "rejected" = "approved";
  let approvedBy: string | null = null;
  let approvedAt: Date | null = null;

  if (scopeType === "organization") {
    // Organization tokens require admin approval
    const isAdmin = ["owner", "admin"].includes(membership.role);
    if (isAdmin) {
      // Auto-approve for admins
      scopeStatus = "approved";
      approvedBy = session.user.id;
      approvedAt = new Date();
    } else {
      // Pending approval for non-admins
      scopeStatus = "pending";
    }
  } else {
    // Personal and team tokens are auto-approved
    scopeStatus = "approved";
    approvedBy = session.user.id;
    approvedAt = new Date();
  }

  // Validate project scopes BEFORE creating token to prevent orphaned records
  let validatedProjectIds: string[] = [];
  if (scopeType !== "organization" && projectIds && projectIds.length > 0) {
    const validProjects = await db
      .select({ id: project.id })
      .from(project)
      .where(
        and(
          eq(project.organizationId, organizationId),
          inArray(project.id, projectIds),
          isNull(project.deletedAt),
        ),
      );

    if (validProjects.length !== projectIds.length) {
      const validIds = validProjects.map((p) => p.id);
      const invalidIds = projectIds.filter((id) => !validIds.includes(id));
      return NextResponse.json(
        {
          error: "Invalid project IDs",
          invalidProjects: invalidIds,
        },
        { status: 400 },
      );
    }
    validatedProjectIds = projectIds;
  }

  // Generate and hash token
  const { token, prefix } = generateToken();
  const tokenHash = hashToken(token);

  // Parse and validate expiration
  let expirationDate: Date | null = null;
  if (expiresAt) {
    expirationDate = new Date(expiresAt);
    if (isNaN(expirationDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiration date" },
        { status: 400 },
      );
    }
  }

  // Create token record (all validation has passed)
  const [createdToken] = await db
    .insert(apiToken)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      userId: session.user.id,
      organizationId,
      tokenHash,
      tokenPrefix: prefix,
      expiresAt: expirationDate,
      status: "active",
      scopeType,
      scopeStatus,
      approvedBy,
      approvedAt,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  // Insert permissions
  await db.insert(apiTokenPermission).values(
    permissions.map(({ resource, action }) => ({
      tokenId: createdToken.id,
      resource,
      action,
    })),
  );

  // Insert validated project scopes
  if (validatedProjectIds.length > 0) {
    await db.insert(apiTokenProjectScope).values(
      validatedProjectIds.map((projectId) => ({
        tokenId: createdToken.id,
        projectId,
      })),
    );
  }

  // Return token (ONLY time it's shown in plaintext for approved tokens)
  const responseData: any = {
    id: createdToken.id,
    name: createdToken.name,
    prefix: createdToken.tokenPrefix,
    scopeType: createdToken.scopeType,
    scopeStatus: createdToken.scopeStatus,
    createdAt: createdToken.createdAt,
    expiresAt: createdToken.expiresAt,
  };

  // Only include token for approved tokens
  if (scopeStatus === "approved") {
    responseData.token = token; // Only shown once
  } else {
    responseData.requiresApproval = true;
  }

  const response = NextResponse.json(responseData, { status: 201 });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
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

  // Verify membership
  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // List user's tokens in this org (active and non-deleted)
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
      scopeType: apiToken.scopeType,
      scopeStatus: apiToken.scopeStatus,
      approvedBy: apiToken.approvedBy,
      approvedAt: apiToken.approvedAt,
    })
    .from(apiToken)
    .where(
      and(
        eq(apiToken.userId, session.user.id),
        eq(apiToken.organizationId, organizationId),
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

      const scopes = await db
        .select({ projectId: apiTokenProjectScope.projectId })
        .from(apiTokenProjectScope)
        .where(eq(apiTokenProjectScope.tokenId, token.id));

      return {
        ...token,
        permissions: perms,
        projectScopes: scopes.map((s) => s.projectId),
      };
    }),
  );

  return NextResponse.json(tokensWithPermissions);
}
