/**
 * Parse and validate pagination query parameters.
 * Returns safe limit/offset values with sensible defaults.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 100,
  maxLimit = 500,
): { limit: number; offset: number } {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");

  let limit = defaultLimit;
  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, maxLimit);
    }
  }

  let offset = 0;
  if (rawOffset) {
    const parsed = parseInt(rawOffset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}
