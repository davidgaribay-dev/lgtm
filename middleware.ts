import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const registrationOpen =
  process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== "false";

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

const publicPrefixes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite/",
  "/api/",
  "/_next/",
];

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

  // Authenticated users on auth pages → workspace redirect
  if (
    sessionCookie &&
    authRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(
      new URL("/workspace-redirect", request.url),
    );
  }

  // Legacy /dashboard redirect
  if (pathname === "/dashboard" && sessionCookie) {
    return NextResponse.redirect(
      new URL("/workspace-redirect", request.url),
    );
  }

  // Protect onboarding
  if (!sessionCookie && pathname.startsWith("/onboarding")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect workspace routes: anything that isn't public
  const isPublic =
    pathname === "/" ||
    publicPrefixes.some((p) => pathname.startsWith(p));

  if (!sessionCookie && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
