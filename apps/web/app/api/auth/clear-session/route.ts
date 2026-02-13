import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);

  // Clear ALL Better Auth session cookies to prevent redirect loops
  // Use consistent cookie options to ensure deletion works
  const cookieOptions = {
    path: "/",
    domain: undefined, // Use default domain
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Expire immediately
  };

  response.cookies.set("better-auth.session_token", "", cookieOptions);
  response.cookies.set("better-auth.session_data", "", cookieOptions);

  return response;
}
