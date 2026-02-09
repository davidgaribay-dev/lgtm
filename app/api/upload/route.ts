import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (!session) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            context: clientPayload ? JSON.parse(clientPayload).context : null,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;

        const { userId, context } = JSON.parse(tokenPayload);

        if (context === "profile-image") {
          await db
            .update(user)
            .set({ image: blob.url })
            .where(eq(user.id, userId));
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
