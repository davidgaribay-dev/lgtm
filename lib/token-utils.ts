import crypto from "crypto";
import bcrypt from "bcrypt";

const TOKEN_VERSION = "v1";
const TOKEN_PREFIX = "lgtm";
const TOKEN_LENGTH = 48;
const SALT_ROUNDS = 10;

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
 * Hash a token using bcrypt.
 * Never store tokens in plaintext - always hash them first.
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, SALT_ROUNDS);
}

/**
 * Verify a token against its hash using bcrypt.
 * Used during authentication to check if the provided token matches the stored hash.
 */
export async function verifyToken(
  token: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
