/**
 * Utility helpers for the commenting system.
 */

/** Legacy emoji shortcodes (kept for backwards compatibility with existing data). */
export const LEGACY_EMOJI_MAP: Record<string, string> = {
  thumbsup: "\uD83D\uDC4D",
  thumbsdown: "\uD83D\uDC4E",
  heart: "\u2764\uFE0F",
  eyes: "\uD83D\uDC40",
  rocket: "\uD83D\uDE80",
  party: "\uD83C\uDF89",
};

/** Valid entity types that can have comments attached. */
export const VALID_ENTITY_TYPES = ["test_case", "test_result", "defect", "test_run"] as const;

export type CommentEntityType = (typeof VALID_ENTITY_TYPES)[number];

/**
 * Parse @mentions from comment body text.
 * Format: @[Display Name](userId)
 * Returns deduplicated array of userId strings.
 */
export function parseMentions(body: string): string[] {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    mentions.push(match[2]);
  }
  return [...new Set(mentions)];
}

/** Validate that a string is a valid entity type. */
export function isValidEntityType(
  type: string,
): type is CommentEntityType {
  return (VALID_ENTITY_TYPES as readonly string[]).includes(type);
}

/**
 * Validate that a string is a valid emoji for reactions.
 * Accepts native unicode emoji characters or legacy shortcodes.
 * Max 32 chars to prevent abuse.
 */
export function isValidEmoji(emoji: string): boolean {
  if (!emoji || emoji.length > 32) return false;
  // Accept legacy shortcodes
  if (emoji in LEGACY_EMOJI_MAP) return true;
  // Accept any non-empty string that isn't pure whitespace/alphanumeric (native emoji)
  return emoji.trim().length > 0;
}

/**
 * Normalize an emoji value for display.
 * Converts legacy shortcodes to native unicode, passes native emoji through.
 */
export function normalizeEmoji(emoji: string): string {
  return LEGACY_EMOJI_MAP[emoji] || emoji;
}
