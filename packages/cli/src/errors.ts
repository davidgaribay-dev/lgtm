import { LgtmApiError } from "@lgtm/shared";
import type winston from "winston";

export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_AUTH = 3;
export const EXIT_NOT_FOUND = 4;

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = EXIT_ERROR,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export class AuthError extends CliError {
  constructor(message: string) {
    super(message, EXIT_AUTH);
    this.name = "AuthError";
  }
}

export class NotFoundError extends CliError {
  constructor(message: string) {
    super(message, EXIT_NOT_FOUND);
    this.name = "NotFoundError";
  }
}

export function handleError(err: unknown, logger: winston.Logger): void {
  if (err instanceof CliError) {
    logger.error(err.message);
    process.exitCode = err.exitCode;
    return;
  }

  if (err instanceof LgtmApiError) {
    if (err.statusCode === 401) {
      logger.error(
        "Authentication failed. Check your API token with: lgtm auth status",
      );
      process.exitCode = EXIT_AUTH;
    } else if (err.statusCode === 403) {
      logger.error(`Permission denied: ${err.message}`);
      process.exitCode = EXIT_AUTH;
    } else if (err.statusCode === 404) {
      logger.error(`Not found: ${err.message}`);
      process.exitCode = EXIT_NOT_FOUND;
    } else {
      logger.error(`API error (${err.statusCode}): ${err.message}`);
      process.exitCode = EXIT_ERROR;
    }
    return;
  }

  if (err instanceof Error) {
    if (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED")) {
      logger.error(
        `Cannot connect to LGTM API. Is the server running? Check your API URL with: lgtm auth status`,
      );
    } else {
      logger.error(err.message);
    }
  } else {
    logger.error(String(err));
  }

  process.exitCode = EXIT_ERROR;
}
