import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("better-auth.session_token");
  response.cookies.delete("better-auth.session_data");
  return response;
}
