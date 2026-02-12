import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Reserved team keys (prevent routing conflicts)
const RESERVED_TEAM_KEYS = [
  "TEST",
  "TEMP",
  "ADMIN",
  "ROOT",
  "API",
  "APP",
  "WEB",
  "DASHBOARD",
  "TEAMS",
  "SETTINGS",
];

/**
 * Generate a team key from a name
 * Examples: "Engineering Team" → "ENG", "QA Automation" → "QA"
 */
export function generateTeamKey(name: string, existingKeys: string[] = []): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z]/g, "");

  // Strategy 1: First 2-5 letters
  for (let len = 2; len <= Math.min(5, cleaned.length); len++) {
    const candidate = cleaned.substring(0, len);
    if (
      !existingKeys.includes(candidate) &&
      !RESERVED_TEAM_KEYS.includes(candidate) &&
      /^[A-Z]{2,10}$/.test(candidate)
    ) {
      return candidate;
    }
  }

  // Strategy 2: Acronym from words (e.g., "Backend Team" → "BT")
  const words = name.toUpperCase().split(/\s+/);
  if (words.length >= 2) {
    const acronym = words
      .map((w) => w[0])
      .join("")
      .substring(0, 5);
    if (
      !existingKeys.includes(acronym) &&
      !RESERVED_TEAM_KEYS.includes(acronym) &&
      /^[A-Z]{2,10}$/.test(acronym)
    ) {
      return acronym;
    }
  }

  // Strategy 3: First 3 letters + number (ENG1, ENG2)
  const base = cleaned.substring(0, Math.min(3, cleaned.length));
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (
      !existingKeys.includes(candidate) &&
      !RESERVED_TEAM_KEYS.includes(candidate) &&
      /^[A-Z]{2,10}$/.test(candidate)
    ) {
      return candidate;
    }
  }

  throw new Error("Failed to generate unique team key");
}

/**
 * Validate a team key format
 */
export function validateTeamKey(key: string): { valid: boolean; error?: string } {
  if (!/^[A-Z]{2,10}$/.test(key)) {
    return { valid: false, error: "Key must be 2-10 uppercase letters" };
  }
  if (RESERVED_TEAM_KEYS.includes(key)) {
    return { valid: false, error: "This key is reserved" };
  }
  return { valid: true };
}
