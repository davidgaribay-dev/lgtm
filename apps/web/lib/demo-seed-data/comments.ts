import * as schema from "@/db/schema";
import { type SeedDb, uid, daysAgo } from "./helpers";
import type { UserIds } from "./users";
import type { TeamIds } from "./teams";

// ---------------------------------------------------------------------------
// Public interface — callers pass entity IDs to attach comments to
// ---------------------------------------------------------------------------

export interface CommentTargets {
  webDefectIds: string[];
  mobDefectIds: string[];
  apiDefectIds: string[];
  webTestCaseIds: string[];
  mobTestCaseIds: string[];
  apiTestCaseIds: string[];
  failedResultIds: { id: string; teamKey: string }[];
  testRunIds: { id: string; teamKey: string }[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolve projectId from teamKey string → TeamIds lookup. */
function projectIdForTeam(t: TeamIds, teamKey: string): string {
  switch (teamKey) {
    case "WEB":
      return t.web;
    case "MOB":
      return t.mob;
    case "API":
      return t.api;
    default:
      throw new Error(`Unknown teamKey: ${teamKey}`);
  }
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedComments(
  db: SeedDb,
  u: UserIds,
  t: TeamIds,
  targets: CommentTargets,
): Promise<void> {
  const now = new Date();

  // ══════════════════════════════════════════════════════════════════════════
  // PART 1: Defect Comments
  // ══════════════════════════════════════════════════════════════════════════

  const defectComments: (typeof schema.comment.$inferInsert)[] = [];
  const defectReplies: (typeof schema.comment.$inferInsert)[] = [];

  // ── WEB Defect[0] — Threaded discussion
  const webDef0_sarah = uid();
  const webDef0_marcus = uid();
  const webDef0_sarahReply = uid();
  const webDef0_david = uid();

  if (targets.webDefectIds[0]) {
    defectComments.push({
      id: webDef0_sarah,
      entityType: "defect",
      entityId: targets.webDefectIds[0],
      projectId: t.web,
      body: "I can reproduce this consistently on Chrome 120 with network throttling set to Slow 3G. The login button becomes unresponsive after the first click.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    });

    defectReplies.push(
      {
        id: webDef0_marcus,
        entityType: "defect",
        entityId: targets.webDefectIds[0],
        projectId: t.web,
        parentId: webDef0_sarah,
        body: "Looks like the issue is a missing loading state. The form submits multiple times and the state management gets confused.",
        createdBy: u.marcus,
        updatedBy: u.marcus,
        createdAt: daysAgo(6),
        updatedAt: daysAgo(6),
      },
      {
        id: webDef0_sarahReply,
        entityType: "defect",
        entityId: targets.webDefectIds[0],
        projectId: t.web,
        parentId: webDef0_sarah,
        body: "@David can you take a look at the form submission handler? I think we need to debounce the submit.",
        createdBy: u.sarah,
        updatedBy: u.sarah,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
      {
        id: webDef0_david,
        entityType: "defect",
        entityId: targets.webDefectIds[0],
        projectId: t.web,
        parentId: webDef0_sarah,
        body: "On it. I think we need to debounce the submit and add a loading spinner. Will have a fix by EOD.",
        createdBy: u.david,
        updatedBy: u.david,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      }
    );
  }

  // ── API Defect[0] — Standalone comment
  if (targets.apiDefectIds[0]) {
    defectComments.push({
      id: uid(),
      entityType: "defect",
      entityId: targets.apiDefectIds[0],
      projectId: t.api,
      body: "Added URL encoding to the filter parameter. PR #324 is up for review.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    });
  }

  // ── API Defect[1] — Threaded discussion
  const apiDef1_alex = uid();
  const apiDef1_david = uid();
  const apiDef1_ryan = uid();
  const apiDef1_sarahReply = uid();

  if (targets.apiDefectIds[1]) {
    defectComments.push(
      {
        id: apiDef1_alex,
        entityType: "defect",
        entityId: targets.apiDefectIds[1],
        projectId: t.api,
        body: "This only happens under distributed load when requests hit different pods. The in-memory rate limiter doesn't share state across instances.",
        createdBy: u.alex,
        updatedBy: u.alex,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: apiDef1_ryan,
        entityType: "defect",
        entityId: targets.apiDefectIds[1],
        projectId: t.api,
        body: "Is this blocking the Release 2.1 deadline? Should we add it to the release blocker list?",
        createdBy: u.ryan,
        updatedBy: u.ryan,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      }
    );

    defectReplies.push(
      {
        id: apiDef1_david,
        entityType: "defect",
        entityId: targets.apiDefectIds[1],
        projectId: t.api,
        parentId: apiDef1_alex,
        body: "We should switch to Redis-based rate limiting. I'll file a follow-up ticket.",
        createdBy: u.david,
        updatedBy: u.david,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: apiDef1_sarahReply,
        entityType: "defect",
        entityId: targets.apiDefectIds[1],
        projectId: t.api,
        parentId: apiDef1_ryan,
        body: "Yes, I've flagged it. @Alex can you estimate the effort for the Redis migration?",
        createdBy: u.sarah,
        updatedBy: u.sarah,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      }
    );
  }

  // ── MOB Defect[0] — Standalone comment
  if (targets.mobDefectIds[0]) {
    defectComments.push({
      id: uid(),
      entityType: "defect",
      entityId: targets.mobDefectIds[0],
      projectId: t.mob,
      body: "This might be related to the Android 14 notification channel changes. Need to check the target SDK version.",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  // ── MOB Defect[1] — Threaded discussion
  const mobDef1_emily = uid();
  const mobDef1_priya = uid();
  const mobDef1_emilyReply = uid();

  if (targets.mobDefectIds[1]) {
    defectComments.push({
      id: mobDef1_emily,
      entityType: "defect",
      entityId: targets.mobDefectIds[1],
      projectId: t.mob,
      body: "Reproduced on Pixel 7 and Samsung S23. The crash happens specifically when the video is buffering. Stack trace points to a null reference in the media controller.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });

    defectReplies.push(
      {
        id: mobDef1_priya,
        entityType: "defect",
        entityId: targets.mobDefectIds[1],
        projectId: t.mob,
        parentId: mobDef1_emily,
        body: "I saw this too on iOS but less frequently. Might be a race condition in the native bridge.",
        createdBy: u.priya,
        updatedBy: u.priya,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
      {
        id: mobDef1_emilyReply,
        entityType: "defect",
        entityId: targets.mobDefectIds[1],
        projectId: t.mob,
        parentId: mobDef1_emily,
        body: "Good catch — adding iOS to the affected platforms. @Jessica can you verify on iPhone 15?",
        createdBy: u.emily,
        updatedBy: u.emily,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      }
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART 2: Test Case Comments (many more!)
  // ══════════════════════════════════════════════════════════════════════════

  const testCaseComments: (typeof schema.comment.$inferInsert)[] = [];
  const testCaseReplies: (typeof schema.comment.$inferInsert)[] = [];

  // ── WEB Test Cases ──
  const webTC0_alex = uid();
  const webTC0_marcus = uid();
  const webTC0_sarah = uid();

  // WEB TC[0] — Flaky test discussion (threaded)
  if (targets.webTestCaseIds[0]) {
    testCaseComments.push({
      id: webTC0_alex,
      entityType: "test_case",
      entityId: targets.webTestCaseIds[0],
      projectId: t.web,
      body: "This test has been flaky in CI — passes locally but occasionally times out on the shared runner. We may need to increase the threshold or optimize the dashboard query.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    });

    testCaseReplies.push(
      {
        id: webTC0_marcus,
        entityType: "test_case",
        entityId: targets.webTestCaseIds[0],
        projectId: t.web,
        parentId: webTC0_alex,
        body: "I traced it to the chart component re-rendering. The API response is fast but the recharts render blocks the main thread.",
        createdBy: u.marcus,
        updatedBy: u.marcus,
        createdAt: daysAgo(11),
        updatedAt: daysAgo(11),
      },
      {
        id: webTC0_sarah,
        entityType: "test_case",
        entityId: targets.webTestCaseIds[0],
        projectId: t.web,
        parentId: webTC0_alex,
        body: "Good analysis. Let's add a performance budget test. Marking as resolved.",
        resolvedAt: daysAgo(10),
        resolvedBy: u.sarah,
        createdBy: u.sarah,
        updatedBy: u.sarah,
        createdAt: daysAgo(10),
        updatedAt: daysAgo(10),
      }
    );
  }

  // WEB TC[1] — Test steps update
  if (targets.webTestCaseIds[1]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[1],
      projectId: t.web,
      body: "I updated the test steps to include the new validation message. The expected result in step 3 was outdated.",
      createdBy: u.jessica,
      updatedBy: u.jessica,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    });
  }

  // WEB TC[2] — Question about preconditions
  if (targets.webTestCaseIds[2]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[2],
      projectId: t.web,
      body: "Should we add a precondition about clearing browser cache? I've seen this fail when cookies from previous runs persist.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    });
  }

  // WEB TC[3] — Browser compatibility note
  if (targets.webTestCaseIds[3]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[3],
      projectId: t.web,
      body: "Verified on Firefox 121, Safari 17.2, and Edge 120. All browsers pass with the updated selectors.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    });
  }

  // WEB TC[4] — Accessibility concern
  if (targets.webTestCaseIds[4]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[4],
      projectId: t.web,
      body: "We should add a step to verify ARIA labels are present. This is required for WCAG 2.1 compliance.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    });
  }

  // WEB TC[5] — Performance observation
  if (targets.webTestCaseIds[5]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[5],
      projectId: t.web,
      body: "This test takes ~45s to complete. Can we optimize the data setup? Most of the time is spent waiting for the database seeding.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  // WEB TC[6] — Test data question
  if (targets.webTestCaseIds[6]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[6],
      projectId: t.web,
      body: "Do we have a shared test user account for this, or should each tester create their own? The preconditions aren't clear.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    });
  }

  // WEB TC[7] — Security consideration
  if (targets.webTestCaseIds[7]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[7],
      projectId: t.web,
      body: "Reminder: don't use real API keys in test data. Use the test environment keys from the vault.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    });
  }

  // WEB TC[8] — Edge case discovered
  if (targets.webTestCaseIds[8]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[8],
      projectId: t.web,
      body: "Found an edge case: if the user has exactly 100 items, the pagination breaks. Should we add a separate test case for boundary conditions?",
      createdBy: u.jessica,
      updatedBy: u.jessica,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    });
  }

  // WEB TC[9] — Localization note
  if (targets.webTestCaseIds[9]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.webTestCaseIds[9],
      projectId: t.web,
      body: "Tested with German locale (de-DE) and the date formatting looks correct. Should we add other locales to the test matrix?",
      createdBy: u.aisha,
      updatedBy: u.aisha,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    });
  }

  // ── MOB Test Cases ──

  // MOB TC[0] — Gesture testing
  if (targets.mobTestCaseIds[0]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[0],
      projectId: t.mob,
      body: "Tested on Safari 17 and Chrome 120 — both pass. The gesture recognition works correctly on all tested devices.",
      createdBy: u.aisha,
      updatedBy: u.aisha,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    });
  }

  // MOB TC[1] — Device fragmentation
  if (targets.mobTestCaseIds[1]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[1],
      projectId: t.mob,
      body: "This fails on older Android devices (API 28 and below) due to missing WebP support. Should we add a fallback?",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    });
  }

  // MOB TC[2] — iOS-specific issue
  if (targets.mobTestCaseIds[2]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[2],
      projectId: t.mob,
      body: "On iOS, the keyboard doesn't dismiss when tapping outside the input field. This is by design but might confuse users. Worth documenting in the test case.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    });
  }

  // MOB TC[3] — Tablet testing
  if (targets.mobTestCaseIds[3]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[3],
      projectId: t.mob,
      body: "Tested on iPad Air and Samsung Tab S8. The layout adapts correctly to tablet screen sizes.",
      createdBy: u.jessica,
      updatedBy: u.jessica,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  // MOB TC[4] — Offline mode
  if (targets.mobTestCaseIds[4]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[4],
      projectId: t.mob,
      body: "When testing offline mode, make sure to wait for the sync indicator to appear. Sometimes it takes 2-3 seconds.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    });
  }

  // MOB TC[5] — Push notification timing
  if (targets.mobTestCaseIds[5]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[5],
      projectId: t.mob,
      body: "Push notifications can be delayed by up to 30 seconds on some devices. Adjusted the timeout in step 4 to account for this.",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    });
  }

  // MOB TC[6] — Battery optimization
  if (targets.mobTestCaseIds[6]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[6],
      projectId: t.mob,
      body: "This test requires disabling battery optimization for the app. Added a note in the preconditions.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    });
  }

  // ── API Test Cases ──

  // API TC[0] — New header requirement
  if (targets.apiTestCaseIds[0]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[0],
      projectId: t.api,
      body: "Can we add a test case for the new rate limit headers? Product wants to expose X-RateLimit-Remaining to clients.",
      createdBy: u.ryan,
      updatedBy: u.ryan,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    });
  }

  // API TC[1] — Schema validation
  if (targets.apiTestCaseIds[1]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[1],
      projectId: t.api,
      body: "The schema validation is failing for optional fields. We need to update the OpenAPI spec before this test can pass.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    });
  }

  // API TC[2] — Authentication token
  if (targets.apiTestCaseIds[2]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[2],
      projectId: t.api,
      body: "Use the service account token from 1Password, not your personal token. Personal tokens expire every 7 days.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    });
  }

  // API TC[3] — Response time
  if (targets.apiTestCaseIds[3]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[3],
      projectId: t.api,
      body: "This endpoint is consistently slower than our 200ms SLA. Should we add performance requirements to the test case?",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  // API TC[4] — Error handling
  if (targets.apiTestCaseIds[4]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[4],
      projectId: t.api,
      body: "Found that the API returns 500 instead of 400 for invalid JSON payloads. Filed defect API-D-8 to track this.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    });
  }

  // API TC[5] — Pagination edge case
  if (targets.apiTestCaseIds[5]) {
    testCaseComments.push({
      id: uid(),
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[5],
      projectId: t.api,
      body: "Pagination breaks when requesting page 1000+ (offset calculation overflow). Added as a known limitation.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART 3: Test Result Comments
  // ══════════════════════════════════════════════════════════════════════════

  const resultComments: (typeof schema.comment.$inferInsert)[] = [];
  const resultReplies: (typeof schema.comment.$inferInsert)[] = [];

  // Failed result thread
  const result0_david = uid();
  const result0_alex = uid();
  const result0_sarah = uid();

  if (targets.failedResultIds[0]) {
    resultComments.push({
      id: result0_david,
      entityType: "test_result",
      entityId: targets.failedResultIds[0].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
      body: "This failure looks environment-specific. The staging SSL cert expired yesterday which caused all HTTPS assertions to fail.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    });

    resultReplies.push(
      {
        id: result0_alex,
        entityType: "test_result",
        entityId: targets.failedResultIds[0].id,
        projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
        parentId: result0_david,
        body: "Confirmed — renewed the cert. @Sarah should we re-run the suite?",
        createdBy: u.alex,
        updatedBy: u.alex,
        createdAt: daysAgo(4),
        updatedAt: daysAgo(4),
      },
      {
        id: result0_sarah,
        entityType: "test_result",
        entityId: targets.failedResultIds[0].id,
        projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
        parentId: result0_david,
        body: "Yes, please trigger a re-run on staging. Marking this as an environment issue, not a code defect.",
        createdBy: u.sarah,
        updatedBy: u.sarah,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      }
    );
  }

  // Additional failed result comments
  if (targets.failedResultIds[1]) {
    resultComments.push({
      id: uid(),
      entityType: "test_result",
      entityId: targets.failedResultIds[1].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[1].teamKey),
      body: "Screenshot shows the button is rendered but the click handler isn't firing. Looks like a race condition with React hydration.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  if (targets.failedResultIds[2]) {
    resultComments.push({
      id: uid(),
      entityType: "test_result",
      entityId: targets.failedResultIds[2].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[2].teamKey),
      body: "Database timeout after 30s. The test data cleanup from the previous run didn't complete, leaving 50k orphaned records.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART 4: Test Run Comments
  // ══════════════════════════════════════════════════════════════════════════

  const runComments: (typeof schema.comment.$inferInsert)[] = [];

  // Comments on various test runs
  if (targets.testRunIds[0]) {
    runComments.push({
      id: uid(),
      entityType: "test_run",
      entityId: targets.testRunIds[0].id,
      projectId: projectIdForTeam(t, targets.testRunIds[0].teamKey),
      body: "Great run! All critical path tests passed. Ready to promote to production.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    });
  }

  if (targets.testRunIds[1]) {
    runComments.push({
      id: uid(),
      entityType: "test_run",
      entityId: targets.testRunIds[1].id,
      projectId: projectIdForTeam(t, targets.testRunIds[1].teamKey),
      body: "Several tests failed due to the deployment delay. The API wasn't fully up when we started the run. Should we add a health check step?",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    });
  }

  if (targets.testRunIds[2]) {
    runComments.push({
      id: uid(),
      entityType: "test_run",
      entityId: targets.testRunIds[2].id,
      projectId: projectIdForTeam(t, targets.testRunIds[2].teamKey),
      body: "This is taking longer than expected. About 60% complete after 3 hours. Might need to parallelize the test execution.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    });
  }

  if (targets.testRunIds[3]) {
    runComments.push({
      id: uid(),
      entityType: "test_run",
      entityId: targets.testRunIds[3].id,
      projectId: projectIdForTeam(t, targets.testRunIds[3].teamKey),
      body: "Executed on the new test infrastructure. Run time improved by 40% compared to the last sprint!",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    });
  }

  if (targets.testRunIds[4]) {
    runComments.push({
      id: uid(),
      entityType: "test_run",
      entityId: targets.testRunIds[4].id,
      projectId: projectIdForTeam(t, targets.testRunIds[4].teamKey),
      body: "Note: skipped the payment gateway tests because the test account is locked. DevOps is working on unlocking it.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Insert all comments
  // ══════════════════════════════════════════════════════════════════════════

  const allTopLevel = [
    ...defectComments,
    ...testCaseComments,
    ...resultComments,
    ...runComments,
  ];

  const allReplies = [
    ...defectReplies,
    ...testCaseReplies,
    ...resultReplies,
  ];

  if (allTopLevel.length > 0) {
    await db.insert(schema.comment).values(allTopLevel);
  }

  if (allReplies.length > 0) {
    await db.insert(schema.comment).values(allReplies);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Reactions
  // ══════════════════════════════════════════════════════════════════════════

  const reactions: (typeof schema.commentReaction.$inferInsert)[] = [
    // WEB Defect thread reactions
    { id: uid(), commentId: webDef0_marcus, userId: u.sarah, emoji: "👍", createdAt: daysAgo(6), updatedAt: now },
    { id: uid(), commentId: webDef0_david, userId: u.sarah, emoji: "👍", createdAt: daysAgo(5), updatedAt: now },
    { id: uid(), commentId: webDef0_david, userId: u.marcus, emoji: "🎉", createdAt: daysAgo(5), updatedAt: now },

    // WEB test case thread reactions
    { id: uid(), commentId: webTC0_alex, userId: u.jessica, emoji: "🤔", createdAt: daysAgo(12), updatedAt: now },
    { id: uid(), commentId: webTC0_alex, userId: u.priya, emoji: "👀", createdAt: daysAgo(12), updatedAt: now },
    { id: uid(), commentId: webTC0_marcus, userId: u.sarah, emoji: "👍", createdAt: daysAgo(11), updatedAt: now },
    { id: uid(), commentId: webTC0_marcus, userId: u.alex, emoji: "🎉", createdAt: daysAgo(11), updatedAt: now },

    // API defect thread reactions
    { id: uid(), commentId: apiDef1_alex, userId: u.david, emoji: "👍", createdAt: daysAgo(4), updatedAt: now },
    { id: uid(), commentId: apiDef1_alex, userId: u.marcus, emoji: "👀", createdAt: daysAgo(4), updatedAt: now },
    { id: uid(), commentId: apiDef1_ryan, userId: u.sarah, emoji: "👍", createdAt: daysAgo(3), updatedAt: now },
    { id: uid(), commentId: apiDef1_ryan, userId: u.emily, emoji: "👍", createdAt: daysAgo(3), updatedAt: now },

    // MOB defect thread reactions
    { id: uid(), commentId: mobDef1_emily, userId: u.priya, emoji: "👍", createdAt: daysAgo(5), updatedAt: now },
    { id: uid(), commentId: mobDef1_priya, userId: u.emily, emoji: "💡", createdAt: daysAgo(5), updatedAt: now },

    // Test result thread reactions
    { id: uid(), commentId: result0_sarah, userId: u.david, emoji: "👍", createdAt: daysAgo(3), updatedAt: now },
    { id: uid(), commentId: result0_sarah, userId: u.alex, emoji: "✅", createdAt: daysAgo(3), updatedAt: now },

    // Random reactions on other comments
    { id: uid(), commentId: result0_david, userId: u.marcus, emoji: "👀", createdAt: daysAgo(4), updatedAt: now },
  ];

  if (reactions.length > 0) {
    await db.insert(schema.commentReaction).values(reactions);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Mentions
  // ══════════════════════════════════════════════════════════════════════════

  const mentions: (typeof schema.commentMention.$inferInsert)[] = [
    // WEB defect thread mentions
    { id: uid(), commentId: webDef0_sarahReply, userId: u.david, createdAt: daysAgo(5), updatedAt: now },

    // API defect thread mentions
    { id: uid(), commentId: apiDef1_sarahReply, userId: u.alex, createdAt: daysAgo(3), updatedAt: now },

    // MOB defect thread mentions
    { id: uid(), commentId: mobDef1_emilyReply, userId: u.jessica, createdAt: daysAgo(4), updatedAt: now },

    // Test result thread mentions
    { id: uid(), commentId: result0_alex, userId: u.sarah, createdAt: daysAgo(4), updatedAt: now },
    { id: uid(), commentId: result0_sarah, userId: u.alex, createdAt: daysAgo(3), updatedAt: now },

    // WEB test case thread mentions
    { id: uid(), commentId: webTC0_sarah, userId: u.alex, createdAt: daysAgo(10), updatedAt: now },
    { id: uid(), commentId: webTC0_sarah, userId: u.marcus, createdAt: daysAgo(10), updatedAt: now },
  ];

  if (mentions.length > 0) {
    await db.insert(schema.commentMention).values(mentions);
  }
}
