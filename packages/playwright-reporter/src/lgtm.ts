import { test } from "@playwright/test";
import { LGTM_METADATA_CONTENT_TYPE, type LgtmMetadata } from "./mapper.js";

/**
 * Registry of test title → metadata mappings.
 * A single beforeEach hook is registered once and looks up metadata from this map,
 * avoiding O(n²) behavior from registering a hook per test.
 */
const metadataRegistry = new Map<string, LgtmMetadata>();
let hookRegistered = false;

function ensureHookRegistered(): void {
  if (hookRegistered) return;
  hookRegistered = true;

  test.beforeEach(async ({}, testInfo) => {
    const metadata = metadataRegistry.get(testInfo.title);
    if (metadata) {
      await testInfo.attach("lgtm-metadata", {
        body: Buffer.from(JSON.stringify(metadata)),
        contentType: LGTM_METADATA_CONTENT_TYPE,
      });
    }
  });
}

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

  metadataRegistry.set(title, metadata);
  ensureHookRegistered();

  return title;
}
