import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per identifier (user ID or IP).
 *
 * For production multi-instance deployments, consider replacing with
 * Redis-backed rate limiting (e.g., @upstash/ratelimit).
 */
class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private _cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Periodically clean expired entries to prevent memory leaks
    this._cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(
    key: string,
    limit: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    entry.count++;

    if (entry.count > limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

const limiter = new RateLimiter();

/**
 * Get a rate limit key from the request (user ID preferred, falls back to IP).
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

/**
 * Check rate limit for a mutation endpoint.
 * Returns a 429 response if rate limit exceeded, or null if allowed.
 *
 * Default: 30 requests per 60 seconds per user/IP.
 */
export function checkRateLimit(
  request: NextRequest,
  userId?: string,
  { limit = 30, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): NextResponse | null {
  const key = getIdentifier(request, userId);
  const result = limiter.check(key, limit, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
