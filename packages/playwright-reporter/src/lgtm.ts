import { test } from "@playwright/test";
import { LGTM_METADATA_CONTENT_TYPE, type LgtmMetadata } from "./mapper.js";

/**
 * Annotate a Playwright test with an LGTM test case ID or case key.
 *
 * This embeds metadata as a Playwright attachment that the LGTM reporter
 * reads during result collection.
 *
 * @example
 * ```ts
 * import { lgtm } from "@lgtm/playwright-reporter";
 *
 * // With a case key (e.g., "ENG-42"):
 * test(lgtm("ENG-42", "Login with valid credentials"), async ({ page }) => {
 *   // ...
 * });
 *
 * // With a numeric case ID:
 * test(lgtm(42, "Login with valid credentials"), async ({ page }) => {
 *   // ...
 * });
 * ```
 */
export function lgtm(
  caseIdOrKey: number | string,
  title: string,
): string {
  const metadata: LgtmMetadata = {};

  if (typeof caseIdOrKey === "number") {
    metadata.caseId = caseIdOrKey;
  } else if (caseIdOrKey.includes("-")) {
    metadata.caseKey = caseIdOrKey;
  } else {
    // Treat pure numeric strings as IDs
    const parsed = parseInt(caseIdOrKey, 10);
    if (!isNaN(parsed)) {
      metadata.caseId = parsed;
    } else {
      metadata.caseKey = caseIdOrKey;
    }
  }

  // Register a beforeEach hook that attaches metadata to the test
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title === title) {
      await testInfo.attach("lgtm-metadata", {
        body: Buffer.from(JSON.stringify(metadata)),
        contentType: LGTM_METADATA_CONTENT_TYPE,
      });
    }
  });

  return title;
}
