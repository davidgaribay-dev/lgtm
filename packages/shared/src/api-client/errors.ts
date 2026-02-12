export class LgtmApiError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message);
    this.name = "LgtmApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
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
