import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "bin";
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const context = formData.get("context") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: JPEG, PNG, WebP, GIF" },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4 MB" },
        { status: 400 },
      );
    }

    const ext = getExtension(file.type);
    const key = `uploads/${context || "general"}/${session.user.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const storage = getStorage();
    const result = await storage.put(key, buffer, file.type);

    // Auto-update user profile image
    if (context === "profile-image") {
      await db
        .update(user)
        .set({ image: result.url })
        .where(eq(user.id, session.user.id));
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    logger.error({ error }, "Upload failed");
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
