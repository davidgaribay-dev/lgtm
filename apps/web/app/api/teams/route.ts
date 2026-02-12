import { NextResponse } from "next/server";
import { eq, and, isNull, inArray, max } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project, member } from "@/db/schema";
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

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, key, description, organizationId } = body;

  if (!name?.trim() || !key?.trim() || !organizationId) {
    return NextResponse.json(
      { message: "Name, key, and organization ID are required" },
      { status: 400 },
    );
  }

  const upperKey = key.trim().toUpperCase();

  // Validate key format
  const validation = validateTeamKey(upperKey);
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  // Check if reserved
  if (RESERVED_TEAM_KEYS.includes(upperKey)) {
    return NextResponse.json(
      { message: "This key is reserved" },
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

  // Check key uniqueness within org
  const existing = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.organizationId, organizationId),
        eq(project.key, upperKey),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { message: "A team with this key already exists" },
      { status: 409 },
    );
  }

  // Get the next display order (append to end)
  const maxOrder = await db
    .select({ value: max(project.displayOrder) })
    .from(project)
    .where(
      and(
        eq(project.organizationId, organizationId),
        isNull(project.deletedAt),
      ),
    )
    .then((rows) => rows[0]?.value ?? -1);

  const [created] = await db
    .insert(project)
    .values({
      name: name.trim(),
      key: upperKey,
      description: description || null,
      organizationId,
      displayOrder: (maxOrder ?? -1) + 1,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
