import crypto from "crypto";

const TOKEN_VERSION = "v1";
const TOKEN_PREFIX = "lgtm";
const TOKEN_LENGTH = 48;

/**
 * Generate a new API token with format: lgtm_v1_<random-48-chars>
 * Returns both the token and a prefix (last 4 chars) for UI display.
 */
export function generateToken(): { token: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const randomPart = randomBytes.toString("base64url").slice(0, TOKEN_LENGTH);
  const token = `${TOKEN_PREFIX}_${TOKEN_VERSION}_${randomPart}`;
  const prefix = token.slice(-4); // Last 4 chars for identification
  return { token, prefix };
}

/**
 * Parse and validate token format.
 * Returns whether the token is valid and its version.
 */
export function parseToken(
  token: string,
): { valid: boolean; version?: string } {
  const parts = token.split("_");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return { valid: false };
  }
  return { valid: true, version: parts[1] };
}

/**
 * Hash a token using SHA-256.
 * API tokens have 256+ bits of entropy, so a fast cryptographic hash is secure.
 * Unlike bcrypt, SHA-256 produces deterministic output enabling O(1) indexed DB lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against its stored SHA-256 hash using timing-safe comparison.
 */
export function verifyToken(token: string, storedHash: string): boolean {
  const computedHash = hashToken(token);
  const a = Buffer.from(computedHash, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
