/** Max size for stored response body to prevent unbounded memory usage. */
const MAX_RESPONSE_BODY_LENGTH = 1024;

/**
 * Truncate a response body to a safe size for storage in error objects.
 * Prevents unbounded memory usage and limits exposure of potentially sensitive data.
 */
function truncateBody(body: unknown): unknown {
  if (body == null) return body;
  if (typeof body === "string") {
    return body.length > MAX_RESPONSE_BODY_LENGTH
      ? body.slice(0, MAX_RESPONSE_BODY_LENGTH) + "... [truncated]"
      : body;
  }
  if (typeof body === "object") {
    const serialized = JSON.stringify(body);
    if (serialized.length > MAX_RESPONSE_BODY_LENGTH) {
      return serialized.slice(0, MAX_RESPONSE_BODY_LENGTH) + "... [truncated]";
    }
  }
  return body;
}

export class LgtmApiError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message);
    this.name = "LgtmApiError";
    this.statusCode = statusCode;
    this.responseBody = truncateBody(responseBody);
  }

  static async fromResponse(response: Response): Promise<LgtmApiError> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }

    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: string }).error)
        : `API request failed with status ${response.status}`;

    return new LgtmApiError(message, response.status, body);
  }
}
