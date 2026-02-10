import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, member } from "@/db/schema";

interface ProjectAccess {
  session: { user: { id: string } };
  organizationId: string;
}

/**
 * Verify the current user has member-level access to a project.
 * Returns session + organizationId on success, or a NextResponse error.
 */
export async function verifyProjectAccess(
  projectId: string,
): Promise<ProjectAccess | NextResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const proj = await db
    .select({ organizationId: project.organizationId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, proj.organizationId),
        eq(member.userId, session.user.id),
        inArray(member.role, ["owner", "admin", "member"]),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { session, organizationId: proj.organizationId };
}
