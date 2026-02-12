import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);

  // Clear Better Auth session cookies to prevent redirect loops
  response.cookies.delete("better-auth.session_token");
  response.cookies.delete("better-auth.session_data");

  return response;
}
