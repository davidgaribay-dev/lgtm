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
  // ────────────────────────────────────────────────────────────────────────
  // Pre-generate IDs so replies can reference parentId in the second pass
  // ────────────────────────────────────────────────────────────────────────

  // Thread 1 — WEB defect[0]: "Login page freezes"
  const t1_sarah = uid();
  const t1_marcus = uid();
  const t1_sarahReply = uid();
  const t1_david = uid();

  // Thread 2 — WEB test case: flaky dashboard test
  const t2_alex = uid();
  const t2_marcus = uid();
  const t2_sarah = uid();

  // Thread 3 — API defect[1]: "Rate limiter burst"
  const t3_alex = uid();
  const t3_david = uid();
  const t3_ryan = uid();
  const t3_sarahReply = uid();

  // Thread 4 — MOB defect[1]: "App crashes during rotation"
  const t4_emily = uid();
  const t4_priya = uid();
  const t4_emilyReply = uid();

  // Thread 5 — Failed test result
  const t5_david = uid();
  const t5_alex = uid();
  const t5_sarah = uid();

  // Standalone comments
  const s_jessica = uid();
  const s_ryan = uid();
  const s_aisha = uid();
  const s_marcus = uid();
  const s_priya = uid();

  // ────────────────────────────────────────────────────────────────────────
  // PASS 1 — Top-level comments (parentId = null)
  // ────────────────────────────────────────────────────────────────────────

  const topLevel: (typeof schema.comment.$inferInsert)[] = [
    // ── Thread 1 — WEB defect[0] ──
    {
      id: t1_sarah,
      entityType: "defect",
      entityId: targets.webDefectIds[0],
      projectId: t.web,
      body: "I can reproduce this consistently on Chrome 120 with network throttling set to Slow 3G. The login button becomes unresponsive after the first click.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },

    // ── Thread 2 — WEB test case[0] ──
    {
      id: t2_alex,
      entityType: "test_case",
      entityId: targets.webTestCaseIds[0],
      projectId: t.web,
      body: "This test has been flaky in CI \u2014 passes locally but occasionally times out on the shared runner. We may need to increase the threshold or optimize the dashboard query.",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },

    // ── Thread 3 — API defect[1] ──
    {
      id: t3_alex,
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
      id: t3_ryan,
      entityType: "defect",
      entityId: targets.apiDefectIds[1],
      projectId: t.api,
      body: "Is this blocking the Release 2.1 deadline? Should we add it to the release blocker list?",
      createdBy: u.ryan,
      updatedBy: u.ryan,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },

    // ── Thread 4 — MOB defect[1] ──
    {
      id: t4_emily,
      entityType: "defect",
      entityId: targets.mobDefectIds[1],
      projectId: t.mob,
      body: "Reproduced on Pixel 7 and Samsung S23. The crash happens specifically when the video is buffering. Stack trace points to a null reference in the media controller.",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },

    // ── Thread 5 — Failed test result ──
    {
      id: t5_david,
      entityType: "test_result",
      entityId: targets.failedResultIds[0].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
      body: "This failure looks environment-specific. The staging SSL cert expired yesterday which caused all HTTPS assertions to fail.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },

    // ── Standalone comments ──
    {
      id: s_jessica,
      entityType: "test_case",
      entityId: targets.webTestCaseIds[1],
      projectId: t.web,
      body: "I updated the test steps to include the new validation message. The expected result in step 3 was outdated.",
      createdBy: u.jessica,
      updatedBy: u.jessica,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      id: s_ryan,
      entityType: "test_case",
      entityId: targets.apiTestCaseIds[0],
      projectId: t.api,
      body: "Can we add a test case for the new rate limit headers? Product wants to expose X-RateLimit-Remaining to clients.",
      createdBy: u.ryan,
      updatedBy: u.ryan,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9),
    },
    {
      id: s_aisha,
      entityType: "test_case",
      entityId: targets.mobTestCaseIds[0],
      projectId: t.mob,
      body: "Tested on Safari 17 and Chrome 120 \u2014 both pass. The gesture recognition works correctly on all tested devices.",
      createdBy: u.aisha,
      updatedBy: u.aisha,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      id: s_marcus,
      entityType: "defect",
      entityId: targets.apiDefectIds[0],
      projectId: t.api,
      body: "Added URL encoding to the filter parameter. PR is up for review.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: s_priya,
      entityType: "defect",
      entityId: targets.mobDefectIds[0],
      projectId: t.mob,
      body: "This might be related to the Android 14 notification channel changes. Need to check the target SDK version.",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
  ];

  await db.insert(schema.comment).values(topLevel);

  // ────────────────────────────────────────────────────────────────────────
  // PASS 2 — Replies (parentId references top-level comment IDs)
  // ────────────────────────────────────────────────────────────────────────

  const replies: (typeof schema.comment.$inferInsert)[] = [
    // ── Thread 1 replies ──
    {
      id: t1_marcus,
      entityType: "defect",
      entityId: targets.webDefectIds[0],
      projectId: t.web,
      parentId: t1_sarah,
      body: "Looks like the issue is a missing loading state. The form submits multiple times and the state management gets confused.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      id: t1_sarahReply,
      entityType: "defect",
      entityId: targets.webDefectIds[0],
      projectId: t.web,
      parentId: t1_sarah,
      body: "@David can you take a look at the form submission handler? I think we need to debounce the submit.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: t1_david,
      entityType: "defect",
      entityId: targets.webDefectIds[0],
      projectId: t.web,
      parentId: t1_sarah,
      body: "On it. I think we need to debounce the submit and add a loading spinner. Will have a fix by EOD.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },

    // ── Thread 2 replies ──
    {
      id: t2_marcus,
      entityType: "test_case",
      entityId: targets.webTestCaseIds[0],
      projectId: t.web,
      parentId: t2_alex,
      body: "I traced it to the chart component re-rendering. The API response is fast but the recharts render blocks the main thread.",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    },
    {
      id: t2_sarah,
      entityType: "test_case",
      entityId: targets.webTestCaseIds[0],
      projectId: t.web,
      parentId: t2_alex,
      body: "Good analysis. Let's add a performance budget test. Marking as resolved.",
      resolvedAt: daysAgo(10),
      resolvedBy: u.sarah,
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },

    // ── Thread 3 replies ──
    {
      id: t3_david,
      entityType: "defect",
      entityId: targets.apiDefectIds[1],
      projectId: t.api,
      parentId: t3_alex,
      body: "We should switch to Redis-based rate limiting. I'll file a follow-up ticket.",
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: t3_sarahReply,
      entityType: "defect",
      entityId: targets.apiDefectIds[1],
      projectId: t.api,
      parentId: t3_ryan,
      body: "Yes, I've flagged it. @Alex can you estimate the effort for the Redis migration?",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },

    // ── Thread 4 replies ──
    {
      id: t4_priya,
      entityType: "defect",
      entityId: targets.mobDefectIds[1],
      projectId: t.mob,
      parentId: t4_emily,
      body: "I saw this too on iOS but less frequently. Might be a race condition in the native bridge.",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: t4_emilyReply,
      entityType: "defect",
      entityId: targets.mobDefectIds[1],
      projectId: t.mob,
      parentId: t4_emily,
      body: "Good catch \u2014 adding iOS to the affected platforms. @Jessica can you verify on iPhone 15?",
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },

    // ── Thread 5 replies ──
    {
      id: t5_alex,
      entityType: "test_result",
      entityId: targets.failedResultIds[0].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
      parentId: t5_david,
      body: "Confirmed \u2014 renewed the cert. @Sarah should we re-run the suite?",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: t5_sarah,
      entityType: "test_result",
      entityId: targets.failedResultIds[0].id,
      projectId: projectIdForTeam(t, targets.failedResultIds[0].teamKey),
      parentId: t5_david,
      body: "Yes, please trigger a re-run on staging. Marking this as an environment issue, not a code defect.",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
  ];

  await db.insert(schema.comment).values(replies);

  // ────────────────────────────────────────────────────────────────────────
  // Reactions (~15 total)
  // ────────────────────────────────────────────────────────────────────────

  const now = new Date();

  await db.insert(schema.commentReaction).values([
    // Thread 2 — Alex's comment: jessica thinking, priya eyes
    { id: uid(), commentId: t2_alex, userId: u.jessica, emoji: "\ud83e\udd14", createdAt: daysAgo(12), updatedAt: now },
    { id: uid(), commentId: t2_alex, userId: u.priya, emoji: "\ud83d\udc40", createdAt: daysAgo(12), updatedAt: now },
    // Thread 2 — Marcus's reply: sarah thumbs-up, alex party
    { id: uid(), commentId: t2_marcus, userId: u.sarah, emoji: "\ud83d\udc4d", createdAt: daysAgo(11), updatedAt: now },
    { id: uid(), commentId: t2_marcus, userId: u.alex, emoji: "\ud83c\udf89", createdAt: daysAgo(11), updatedAt: now },

    // Thread 3 — Alex's comment: david thumbs-up, marcus eyes
    { id: uid(), commentId: t3_alex, userId: u.david, emoji: "\ud83d\udc4d", createdAt: daysAgo(4), updatedAt: now },
    { id: uid(), commentId: t3_alex, userId: u.marcus, emoji: "\ud83d\udc40", createdAt: daysAgo(4), updatedAt: now },
    // Thread 3 — Ryan's comment: sarah thumbs-up, emily thumbs-up
    { id: uid(), commentId: t3_ryan, userId: u.sarah, emoji: "\ud83d\udc4d", createdAt: daysAgo(3), updatedAt: now },
    { id: uid(), commentId: t3_ryan, userId: u.emily, emoji: "\ud83d\udc4d", createdAt: daysAgo(3), updatedAt: now },

    // Thread 4 — Emily's comment: priya thumbs-up
    { id: uid(), commentId: t4_emily, userId: u.priya, emoji: "\ud83d\udc4d", createdAt: daysAgo(5), updatedAt: now },

    // Standalone — Jessica's comment: sarah thumbs-up, emily heart
    { id: uid(), commentId: s_jessica, userId: u.sarah, emoji: "\ud83d\udc4d", createdAt: daysAgo(8), updatedAt: now },
    { id: uid(), commentId: s_jessica, userId: u.emily, emoji: "\u2764\ufe0f", createdAt: daysAgo(8), updatedAt: now },
    // Standalone — Ryan's comment: alex eyes, david thumbs-up
    { id: uid(), commentId: s_ryan, userId: u.alex, emoji: "\ud83d\udc40", createdAt: daysAgo(9), updatedAt: now },
    { id: uid(), commentId: s_ryan, userId: u.david, emoji: "\ud83d\udc4d", createdAt: daysAgo(9), updatedAt: now },

    // Extra reactions for natural feel
    { id: uid(), commentId: t1_david, userId: u.sarah, emoji: "\ud83d\udc4d", createdAt: daysAgo(5), updatedAt: now },
    { id: uid(), commentId: t5_sarah, userId: u.david, emoji: "\ud83d\udc4d", createdAt: daysAgo(3), updatedAt: now },
  ]);

  // ────────────────────────────────────────────────────────────────────────
  // Mentions (~7 total)
  // ────────────────────────────────────────────────────────────────────────

  await db.insert(schema.commentMention).values([
    // Thread 1 — Sarah mentions David
    { id: uid(), commentId: t1_sarahReply, userId: u.david, createdAt: daysAgo(5), updatedAt: now },
    // Thread 3 — Sarah mentions Alex
    { id: uid(), commentId: t3_sarahReply, userId: u.alex, createdAt: daysAgo(3), updatedAt: now },
    // Thread 4 — Emily mentions Jessica
    { id: uid(), commentId: t4_emilyReply, userId: u.jessica, createdAt: daysAgo(4), updatedAt: now },
    // Thread 5 — Alex mentions Sarah
    { id: uid(), commentId: t5_alex, userId: u.sarah, createdAt: daysAgo(4), updatedAt: now },
    // Additional mentions for realism
    { id: uid(), commentId: t2_sarah, userId: u.alex, createdAt: daysAgo(10), updatedAt: now },
    { id: uid(), commentId: t2_sarah, userId: u.marcus, createdAt: daysAgo(10), updatedAt: now },
    { id: uid(), commentId: t5_sarah, userId: u.alex, createdAt: daysAgo(3), updatedAt: now },
  ]);
}
