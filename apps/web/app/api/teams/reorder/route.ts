import { NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, member } from "@/db/schema";
import { headers } from "next/headers";

export async function PUT(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { organizationId, teamIds } = body;

  if (!organizationId || !Array.isArray(teamIds) || teamIds.length === 0) {
    return NextResponse.json(
      { message: "organizationId and teamIds[] are required" },
      { status: 400 },
    );
  }

  // Verify user has permission (owner or admin in this org)
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
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Update display_order for each team by its position in the array
  for (let i = 0; i < teamIds.length; i++) {
    await db
      .update(project)
      .set({
        displayOrder: i,
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(project.id, teamIds[i]),
          eq(project.organizationId, organizationId),
          isNull(project.deletedAt),
        ),
      );
  }

  return NextResponse.json({ success: true });
}
