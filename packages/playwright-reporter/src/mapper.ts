import type { TestResultStatus } from "@lgtm/shared";

/**
 * Patterns that commonly appear in test output and may contain secrets.
 * Applied before uploading logs and error comments to the LGTM API.
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // LGTM tokens
  { pattern: /lgtm_v1_[a-zA-Z0-9_-]+/g, replacement: "lgtm_v1_[REDACTED]" },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9._\-/+=]+/g, replacement: "Bearer [REDACTED]" },
  // GitHub tokens
  { pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, replacement: "[REDACTED_GH_TOKEN]" },
  // OpenAI / Anthropic tokens
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: "[REDACTED_API_KEY]" },
  // AWS access keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: "[REDACTED_AWS_KEY]" },
  // Generic key=value secret patterns (password, secret, token, api_key in env-like assignments)
  { pattern: /(?<=(?:password|secret|token|api_key|apikey|api_secret|access_token|auth_token)\s*[=:]\s*["']?)[^\s"']{8,}/gi, replacement: "[REDACTED]" },
  // Connection strings with embedded passwords
  { pattern: /(?<=:\/\/[^:]+:)[^@\s]+(?=@)/g, replacement: "[REDACTED]" },
];

/**
 * Strip common secret patterns from text before uploading to the LGTM API.
 * This prevents accidental exposure of credentials in test logs and error messages.
 */
export function sanitizeSecrets(text: string): string {
  let result = text;
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Map Playwright result status to LGTM test result status.
 *
 * Playwright statuses: "passed" | "failed" | "timedOut" | "skipped" | "interrupted"
 * LGTM statuses:       "untested" | "passed" | "failed" | "blocked" | "skipped"
 */
export function mapPlaywrightStatus(
  playwrightStatus: string,
): TestResultStatus {
  switch (playwrightStatus) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "timedOut":
      return "failed";
    case "skipped":
      return "skipped";
    case "interrupted":
      return "blocked";
    default:
      return "failed";
  }
}

/**
 * Map Playwright overall run status to LGTM test run status.
 *
 * Playwright FullResult statuses: "passed" | "failed" | "timedout" | "interrupted"
 * LGTM run statuses:              "pending" | "in_progress" | "passed" | "failed" | "blocked"
 */
export function mapPlaywrightRunStatus(
  playwrightStatus: string,
): "passed" | "failed" | "blocked" {
  switch (playwrightStatus) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "timedout":
      return "failed";
    case "interrupted":
      return "blocked";
    default:
      return "failed";
  }
}

/**
 * Build a human-readable title from Playwright's titlePath.
 * Skips the root suite (empty string) and project name.
 */
export function buildTestTitle(titlePath: string[]): string {
  // titlePath is: ["", "project-name", "file.spec.ts", "describe", "test name"]
  // Skip the root (index 0) and project (index 1)
  return titlePath.slice(2).join(" > ");
}

/**
 * Format a Playwright error into a comment string for LGTM results.
 */
export function formatErrorComment(error?: {
  message?: string;
  stack?: string;
  snippet?: string;
}): string | undefined {
  if (!error) return undefined;

  const parts: string[] = [];

  if (error.message) {
    parts.push(error.message);
  }

  if (error.snippet) {
    parts.push(`\n--- Source ---\n${error.snippet}`);
  }

  if (error.stack) {
    parts.push(`\n--- Stack ---\n${error.stack}`);
  }

  if (parts.length === 0) return undefined;
  return sanitizeSecrets(parts.join("\n"));
}

/** Metadata content type used for lgtm() annotations. */
export const LGTM_METADATA_CONTENT_TYPE = "application/lgtm.metadata+json";

/** Shape of the metadata attachment body. */
export interface LgtmMetadata {
  caseId?: number;
  caseKey?: string;
}

/**
 * Extract LGTM metadata from a Playwright test result's attachments.
 */
export function extractLgtmMetadata(
  attachments: ReadonlyArray<{
    name: string;
    contentType: string;
    body?: Buffer;
  }>,
): LgtmMetadata | null {
  const attachment = attachments.find(
    (a) => a.contentType === LGTM_METADATA_CONTENT_TYPE,
  );
  if (!attachment?.body) return null;

  try {
    return JSON.parse(attachment.body.toString("utf-8")) as LgtmMetadata;
  } catch {
    return null;
  }
}
