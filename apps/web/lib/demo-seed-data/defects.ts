import * as schema from "@/db/schema";
import { type SeedDb, uid, daysAgo } from "./helpers";
import type { UserIds } from "./users";
import type { TeamIds, CycleIds, EnvironmentIds } from "./teams";
import type { TestRunIds, TestResultRef } from "./test-runs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the first test result with status "failed" for a given test run. */
function findFailedResult(
  testResults: TestResultRef[],
  testRunId: string,
): TestResultRef | undefined {
  return testResults.find(
    (r) => r.testRunId === testRunId && r.status === "failed",
  );
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export interface DefectIdsByTeam {
  web: string[];
  mob: string[];
  api: string[];
}

export async function seedDefects(
  db: SeedDb,
  u: UserIds,
  t: TeamIds,
  c: CycleIds,
  env: EnvironmentIds,
  testRunIds: TestRunIds,
  testResults: TestResultRef[],
): Promise<DefectIdsByTeam> {
  // ── Locate failed results for linked defects ──

  const webFailedResult = findFailedResult(testResults, testRunIds.webTr2);
  const mobFailedResult = findFailedResult(testResults, testRunIds.mobTr2);
  const apiFailedResult = findFailedResult(testResults, testRunIds.apiTr2);

  // ── Pre-generate defect IDs ──
  const webD1 = uid(), webD2 = uid(), webD3 = uid(), webD4 = uid();
  const mobD1 = uid(), mobD2 = uid(), mobD3 = uid(), mobD4 = uid();
  const apiD1 = uid(), apiD2 = uid(), apiD3 = uid(), apiD4 = uid();

  // ── Defect data ──

  const defects: (typeof schema.defect.$inferInsert)[] = [
    // ================================================================
    // WEB team (4 defects)
    // ================================================================

    // WEB-D-1
    {
      id: webD1,
      title: "Login page freezes on slow network connections",
      description:
        "When network conditions are degraded (e.g. Slow 3G), the login page becomes completely unresponsive after clicking the Sign In button. The UI thread appears blocked, and the user cannot interact with any elements for 30+ seconds.",
      defectNumber: 1,
      defectKey: "WEB-D-1",
      severity: "major",
      priority: "high",
      defectType: "functional",
      status: "open",
      resolution: null,
      assigneeId: u.marcus,
      stepsToReproduce:
        "1. Open Chrome DevTools\n2. Set network throttling to Slow 3G\n3. Navigate to /login\n4. Enter valid credentials\n5. Click Sign In",
      expectedResult:
        "User should be redirected to dashboard within 10 seconds",
      actualResult:
        "Login button becomes unresponsive after first click. Page freezes for 30+ seconds.",
      testResultId: webFailedResult?.id ?? null,
      testRunId: webFailedResult ? testRunIds.webTr2 : null,
      testCaseId: webFailedResult?.testCaseId ?? null,
      externalUrl: null,
      projectId: t.web,
      environmentId: env.webStaging,
      cycleId: c.webSprint24,
      workspaceCycleId: null,
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },

    // WEB-D-2
    {
      id: webD2,
      title: "Dashboard chart tooltips overflow viewport on mobile",
      description:
        "On mobile viewports (375px width), tapping any chart bar causes the tooltip to render beyond the right edge of the screen. The content is clipped and unreadable.",
      defectNumber: 2,
      defectKey: "WEB-D-2",
      severity: "minor",
      priority: "medium",
      defectType: "ui",
      status: "in_progress",
      resolution: null,
      assigneeId: u.aisha,
      stepsToReproduce:
        "1. Open dashboard on mobile viewport (375px)\n2. Tap on any chart bar\n3. Observe tooltip position",
      expectedResult:
        "Tooltip should reposition to stay within viewport",
      actualResult:
        "Tooltip extends beyond right edge of screen, content is cut off",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.web,
      environmentId: env.webQa,
      cycleId: c.webSprint24,
      workspaceCycleId: null,
      createdBy: u.aisha,
      updatedBy: u.aisha,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(5),
    },

    // WEB-D-3
    {
      id: webD3,
      title: "CSV export truncates data beyond 10,000 rows",
      description:
        "The CSV export feature silently drops all rows beyond the 10,000 mark. Users with large datasets receive incomplete exports with no warning or error message.",
      defectNumber: 3,
      defectKey: "WEB-D-3",
      severity: "major",
      priority: "high",
      defectType: "data",
      status: "fixed",
      resolution: "fixed",
      assigneeId: u.david,
      stepsToReproduce:
        "1. Navigate to Reports > Export\n2. Select a dataset with >10,000 rows\n3. Click Export CSV\n4. Open downloaded file",
      expectedResult: "All rows should be present in the CSV",
      actualResult:
        "CSV file contains exactly 10,000 rows. Remaining data is silently dropped.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.web,
      environmentId: env.webQa,
      cycleId: c.webSprint23,
      workspaceCycleId: null,
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(52),
      updatedAt: daysAgo(45),
    },

    // WEB-D-4
    {
      id: webD4,
      title: "XSS vulnerability in search input field",
      description:
        "The test case search input does not sanitize user input before rendering it in the DOM. Injecting a script tag causes arbitrary JavaScript execution in the browser context.",
      defectNumber: 4,
      defectKey: "WEB-D-4",
      severity: "blocker",
      priority: "critical",
      defectType: "security",
      status: "verified",
      resolution: "fixed",
      assigneeId: u.marcus,
      stepsToReproduce:
        "1. Navigate to test case search\n2. Enter: <script>alert('xss')</script>\n3. Press Enter",
      expectedResult:
        "Input should be sanitized, no script execution",
      actualResult:
        "Alert dialog appears, confirming script execution in browser context",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: "https://github.com/acme/web-platform/issues/142",
      projectId: t.web,
      environmentId: env.webStaging,
      cycleId: c.webSprint23,
      workspaceCycleId: null,
      createdBy: u.sarah,
      updatedBy: u.marcus,
      createdAt: daysAgo(48),
      updatedAt: daysAgo(40),
    },

    // ================================================================
    // MOB team (4 defects)
    // ================================================================

    // MOB-D-1
    {
      id: mobD1,
      title: "Push notification tap opens wrong screen on Android 14",
      description:
        "Tapping a push notification on Android 14 devices routes the user to the home screen instead of the relevant detail screen referenced in the notification payload. This does not reproduce on Android 13 or iOS.",
      defectNumber: 1,
      defectKey: "MOB-D-1",
      severity: "major",
      priority: "high",
      defectType: "functional",
      status: "open",
      resolution: null,
      assigneeId: u.priya,
      stepsToReproduce:
        "1. Send a push notification targeting a specific detail screen (e.g. order #12345)\n2. Receive notification on Android 14 device (Pixel 8 or Samsung S24)\n3. Tap the notification from the notification shade\n4. Observe which screen opens",
      expectedResult:
        "App should open and navigate to the detail screen referenced in the notification (e.g. Order #12345 detail)",
      actualResult:
        "App opens to the home screen. The notification payload is received but the deep link routing is ignored on Android 14.",
      testResultId: mobFailedResult?.id ?? null,
      testRunId: mobFailedResult ? testRunIds.mobTr2 : null,
      testCaseId: mobFailedResult?.testCaseId ?? null,
      externalUrl: null,
      projectId: t.mob,
      environmentId: env.mobDev,
      cycleId: c.mobSprint24,
      workspaceCycleId: null,
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },

    // MOB-D-2
    {
      id: mobD2,
      title: "App crashes when rotating screen during video playback",
      description:
        "Rotating the device from portrait to landscape while a video is playing causes an immediate crash. The crash log shows a NullPointerException in the media player lifecycle handler during the activity recreation.",
      defectNumber: 2,
      defectKey: "MOB-D-2",
      severity: "critical",
      priority: "critical",
      defectType: "crash",
      status: "in_progress",
      resolution: null,
      assigneeId: u.emily,
      stepsToReproduce:
        "1. Open any content page with an embedded video\n2. Start video playback\n3. Wait at least 3 seconds for the player to initialize\n4. Rotate the device from portrait to landscape\n5. Observe app behavior",
      expectedResult:
        "Video playback should continue seamlessly during rotation, with the player resizing to fill the landscape viewport",
      actualResult:
        "App crashes with a NullPointerException. The crash occurs in MediaPlayerService.onConfigurationChanged(). A restart is required to use the app again.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.mob,
      environmentId: env.mobStaging,
      cycleId: c.mobSprint24,
      workspaceCycleId: null,
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(4),
    },

    // MOB-D-3
    {
      id: mobD3,
      title: "Biometric login fails after OS update on Pixel 8",
      description:
        "After updating to Android 14 QPR2 on Pixel 8 devices, biometric authentication consistently fails with a 'Biometric hardware not available' error, even though the fingerprint sensor works in other apps.",
      defectNumber: 3,
      defectKey: "MOB-D-3",
      severity: "major",
      priority: "medium",
      defectType: "functional",
      status: "deferred",
      resolution: "deferred",
      assigneeId: u.priya,
      stepsToReproduce:
        "1. Update Pixel 8 to Android 14 QPR2 (build AP2A.240605.024)\n2. Open the app and navigate to login\n3. Tap 'Sign in with fingerprint'\n4. Observe error message",
      expectedResult:
        "Biometric prompt should appear and authenticate the user upon valid fingerprint",
      actualResult:
        "Error dialog displays: 'Biometric hardware not available.' Fallback to password works. Issue is specific to this OS build.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.mob,
      environmentId: env.mobDev,
      cycleId: c.mobSprint23,
      workspaceCycleId: null,
      createdBy: u.priya,
      updatedBy: u.sarah,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(42),
    },

    // MOB-D-4
    {
      id: mobD4,
      title: "Memory leak in image gallery when scrolling rapidly",
      description:
        "Rapidly scrolling through the image gallery causes steadily increasing memory consumption. After ~200 images, the app consumes over 1GB of RAM and begins dropping frames. On lower-end devices, this leads to an OOM kill.",
      defectNumber: 4,
      defectKey: "MOB-D-4",
      severity: "major",
      priority: "high",
      defectType: "performance",
      status: "open",
      resolution: null,
      assigneeId: u.alex,
      stepsToReproduce:
        "1. Open the image gallery with 500+ images\n2. Scroll rapidly from top to bottom and back\n3. Repeat 3-4 times\n4. Monitor memory usage via Android Profiler or Xcode Instruments",
      expectedResult:
        "Memory usage should remain stable (<300MB) as images are recycled and off-screen bitmaps are released",
      actualResult:
        "Memory grows linearly with scroll distance, reaching 1GB+ after ~200 images. GC pauses become frequent and UI stutters.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.mob,
      environmentId: env.mobQa,
      cycleId: c.mobSprint24,
      workspaceCycleId: null,
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },

    // ================================================================
    // API team (4 defects)
    // ================================================================

    // API-D-1
    {
      id: apiD1,
      title: "GET /users returns 500 when filter contains special characters",
      description:
        "Passing special characters (e.g. &, <, %, or Unicode) in the `filter` query parameter causes an unhandled exception in the query builder, resulting in a 500 Internal Server Error instead of a proper validation error.",
      defectNumber: 1,
      defectKey: "API-D-1",
      severity: "major",
      priority: "high",
      defectType: "functional",
      status: "open",
      resolution: null,
      assigneeId: u.david,
      stepsToReproduce:
        "1. Send GET /api/v2/users?filter=name%26age%3E30\n2. Alternatively, send GET /api/v2/users?filter=%3Cscript%3E\n3. Observe the response status and body",
      expectedResult:
        "API should return 400 Bad Request with a descriptive validation error explaining which characters are not allowed",
      actualResult:
        "API returns 500 Internal Server Error with a stack trace leak: 'QueryBuilderError: Unexpected token in filter expression'",
      testResultId: apiFailedResult?.id ?? null,
      testRunId: apiFailedResult ? testRunIds.apiTr2 : null,
      testCaseId: apiFailedResult?.testCaseId ?? null,
      externalUrl: null,
      projectId: t.api,
      environmentId: env.apiQa,
      cycleId: c.apiSprint24,
      workspaceCycleId: null,
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },

    // API-D-2
    {
      id: apiD2,
      title: "Rate limiter allows burst above threshold in distributed setup",
      description:
        "In a multi-node deployment, the Redis-backed rate limiter does not correctly synchronize counters across instances. During concurrent requests, the effective limit can be exceeded by 2-3x before throttling kicks in.",
      defectNumber: 2,
      defectKey: "API-D-2",
      severity: "critical",
      priority: "critical",
      defectType: "performance",
      status: "in_progress",
      resolution: null,
      assigneeId: u.alex,
      stepsToReproduce:
        "1. Deploy API behind a load balancer with 3 instances\n2. Configure rate limit to 100 requests/minute per API key\n3. Send 300 concurrent requests from a single API key using k6 or wrk\n4. Count the number of successful (200) responses",
      expectedResult:
        "Exactly 100 requests should succeed; the remaining 200 should receive 429 Too Many Requests",
      actualResult:
        "Approximately 250-280 requests succeed before throttling begins. The sliding window counter is not atomically shared across Redis cluster nodes.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.api,
      environmentId: env.apiStaging,
      cycleId: c.apiSprint24,
      workspaceCycleId: null,
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(3),
    },

    // API-D-3
    {
      id: apiD3,
      title: "Webhook retry does not respect exponential backoff",
      description:
        "Failed webhook deliveries are retried at a fixed 5-second interval instead of using the documented exponential backoff schedule (5s, 30s, 2m, 15m, 1h). This causes excessive load on downstream services during outages.",
      defectNumber: 3,
      defectKey: "API-D-3",
      severity: "normal",
      priority: "medium",
      defectType: "functional",
      status: "fixed",
      resolution: "fixed",
      assigneeId: u.marcus,
      stepsToReproduce:
        "1. Register a webhook endpoint that returns 503\n2. Trigger a webhook event (e.g. user.created)\n3. Monitor the timing of retry attempts in the webhook delivery log\n4. Compare intervals against the documented backoff schedule",
      expectedResult:
        "Retries should follow exponential backoff: 5s, 30s, 2m, 15m, 1h, then stop after 5 attempts",
      actualResult:
        "All retries fire at exactly 5-second intervals. The backoff multiplier is applied but then overridden by the default interval constant.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.api,
      environmentId: env.apiQa,
      cycleId: c.apiSprint23,
      workspaceCycleId: null,
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(51),
      updatedAt: daysAgo(43),
    },

    // API-D-4
    {
      id: apiD4,
      title: "CORS headers missing on 4xx error responses",
      description:
        "When the API returns a 4xx error (400, 401, 403, 404, 422), the CORS headers (Access-Control-Allow-Origin, etc.) are missing from the response. This prevents frontend applications from reading the error body, showing a generic network error instead of the descriptive API error message.",
      defectNumber: 4,
      defectKey: "API-D-4",
      severity: "normal",
      priority: "medium",
      defectType: "security",
      status: "closed",
      resolution: "fixed",
      assigneeId: u.david,
      stepsToReproduce:
        "1. Make a cross-origin request from a browser-based client to any API endpoint\n2. Trigger a 4xx error (e.g. send an invalid payload to get 422)\n3. Inspect the response headers in Chrome DevTools Network tab\n4. Compare headers with a successful 200 response",
      expectedResult:
        "Both success and error responses should include identical CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods)",
      actualResult:
        "CORS headers are present on 2xx responses but absent on 4xx responses. The browser blocks the response body, and the client receives a generic TypeError: Failed to fetch.",
      testResultId: null,
      testRunId: null,
      testCaseId: null,
      externalUrl: null,
      projectId: t.api,
      environmentId: env.apiProd,
      cycleId: c.apiSprint23,
      workspaceCycleId: null,
      createdBy: u.sarah,
      updatedBy: u.david,
      createdAt: daysAgo(49),
      updatedAt: daysAgo(38),
    },
  ];

  await db.insert(schema.defect).values(defects);

  return {
    web: [webD1, webD2, webD3, webD4],
    mob: [mobD1, mobD2, mobD3, mobD4],
    api: [apiD1, apiD2, apiD3, apiD4],
  };
}
