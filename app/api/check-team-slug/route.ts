import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { project } from "@/db/schema";
import { headers } from "next/headers";

const RESERVED_SLUGS = ["dashboard", "teams", "settings"];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ available: false }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const orgId = request.nextUrl.searchParams.get("orgId");

  if (!slug || slug.length < 2 || !orgId) {
    return NextResponse.json({ available: false });
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({ available: false });
  }

  const existing = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.organizationId, orgId),
        eq(project.slug, slug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return NextResponse.json({ available: existing.length === 0 });
}
