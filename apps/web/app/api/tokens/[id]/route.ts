import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { apiToken } from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, description, expiresAt } = body;

  // Verify ownership
  const token = await db
    .select({ userId: apiToken.userId })
    .from(apiToken)
    .where(and(eq(apiToken.id, id), isNull(apiToken.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (token.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update allowed fields
  const updates: any = {
    updatedBy: session.user.id,
    updatedAt: new Date(),
  };

  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined)
    updates.description = description?.trim() || null;
  if (expiresAt !== undefined) {
    if (expiresAt) {
      const date = new Date(expiresAt);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiration date" },
          { status: 400 },
        );
      }
      updates.expiresAt = date;
    } else {
      updates.expiresAt = null;
    }
  }

  const [updated] = await db
    .update(apiToken)
    .set(updates)
    .where(eq(apiToken.id, id))
    .returning();

  const response = NextResponse.json(updated);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const token = await db
    .select({ userId: apiToken.userId })
    .from(apiToken)
    .where(and(eq(apiToken.id, id), isNull(apiToken.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (token.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete (following codebase pattern)
  await db
    .update(apiToken)
    .set({
      status: "revoked",
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(apiToken.id, id));

  const response = NextResponse.json({ success: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}
