import type { TestResultStatus } from "@lgtm/shared";

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

  return parts.length > 0 ? parts.join("\n") : undefined;
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
