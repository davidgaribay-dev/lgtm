import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const registrationOpen =
  process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== "false";

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
const protectedRoutes = ["/dashboard"];

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Block signup page and API when registration is closed
  if (!registrationOpen) {
    if (pathname === "/signup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname === "/api/auth/sign-up/email") {
      return NextResponse.json(
        { message: "Public registration is disabled" },
        { status: 403 },
      );
    }
  }

  if (
    sessionCookie &&
    authRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    !sessionCookie &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/dashboard/:path*",
    "/api/auth/sign-up/email",
  ],
};
