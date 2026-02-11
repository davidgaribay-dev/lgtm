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

  // Generate correlation ID for request tracking
  const correlationId =
    request.headers.get('x-correlation-id') || crypto.randomUUID();

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

  // Normalize team keys to uppercase (e.g., /workspace/eng/... → /workspace/ENG/...)
  // Pattern: /workspaceSlug/teamKey/...
  // Only applies to workspace-scoped paths (not public, onboarding, or known app routes)
  if (!isPublic && !pathname.startsWith("/onboarding")) {
    const teamKeyPattern = /^\/([^\/]+)\/([a-z]{2,10})(?:\/|$)/;
    const teamKeyMatch = pathname.match(teamKeyPattern);

    if (teamKeyMatch) {
      const [, , segment] = teamKeyMatch;
      const knownAppRoutes = new Set(["dashboard", "settings", "teams"]);

      if (!knownAppRoutes.has(segment)) {
        const newPath = pathname.replace(
          `/${teamKeyMatch[1]}/${segment}`,
          `/${teamKeyMatch[1]}/${segment.toUpperCase()}`
        );
        return NextResponse.redirect(new URL(newPath, request.url));
      }
    }
  }

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
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
