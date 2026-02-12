export interface CommentData {
  id: string;
  entityType: string;
  entityId: string;
  projectId: string;
  parentId: string | null;
  body: string;
  editedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface ReactionData {
  id: string;
  commentId: string;
  userId: string;
  emoji: string;
}

export interface MentionData {
  id: string;
  commentId: string;
  userId: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface MentionableUser {
  userId: string;
  name: string;
  email: string;
  image: string | null;
}

/** Legacy emoji shortcode → native character map for backwards compatibility. */
export const LEGACY_EMOJI_MAP: Record<string, string> = {
  thumbsup: "\uD83D\uDC4D",
  thumbsdown: "\uD83D\uDC4E",
  heart: "\u2764\uFE0F",
  eyes: "\uD83D\uDC40",
  rocket: "\uD83D\uDE80",
  party: "\uD83C\uDF89",
};

/** Normalize an emoji for display — converts legacy shortcodes to native. */
export function normalizeEmoji(emoji: string): string {
  return LEGACY_EMOJI_MAP[emoji] || emoji;
}
