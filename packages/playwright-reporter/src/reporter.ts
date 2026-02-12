import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
  TestError,
} from "@playwright/test/reporter";
import {
  LgtmApiClient,
  type Project,
  type TestCase as LgtmTestCase,
  type BulkResultEntry,
  type CreateTestRunResponse,
} from "@lgtm/shared";
import { resolveConfig, type ResolvedConfig } from "./config.js";
import { Logger } from "./logger.js";
import {
  mapPlaywrightStatus,
  mapPlaywrightRunStatus,
  buildTestTitle,
  formatErrorComment,
  extractLgtmMetadata,
  type LgtmMetadata,
} from "./mapper.js";

interface QueuedResult {
  testCaseId: string;
  entry: BulkResultEntry;
  testTitle: string;
  error?: TestError;
}

/**
 * LGTM Playwright Reporter
 *
 * Uploads Playwright test results to the LGTM test case management API.
 *
 * @example playwright.config.ts
 * ```ts
 * export default defineConfig({
 *   reporter: [
 *     ["list"],
 *     ["@lgtm/playwright-reporter", {
 *       apiUrl: "https://lgtm.example.com",
 *       apiToken: process.env.LGTM_API_TOKEN,
 *       projectKey: "ENG",
 *     }],
 *   ],
 * });
 * ```
 */
export class LgtmReporter implements Reporter {
  private config!: ResolvedConfig;
  private client!: LgtmApiClient;
  private logger!: Logger;

  private project: Project | null = null;
  private testRun: CreateTestRunResponse | null = null;
  private resultQueue: QueuedResult[] = [];
  private logBuffer: Map<string, string[]> = new Map(); // testId → stdout lines

  /** Map: Playwright test ID → LGTM test case ID */
  private testCaseMap = new Map<string, string>();
  /** Map: LGTM test case ID → LGTM test case key (for defect linking) */
  private testCaseKeyMap = new Map<string, string>();
  /** Map: Playwright test ID → title (for display) */
  private testTitleMap = new Map<string, string>();

  private initError: Error | null = null;

  constructor(options?: Record<string, unknown>) {
    try {
      this.config = resolveConfig(options);
      this.logger = new Logger(this.config.debug);
      this.client = new LgtmApiClient({
        baseUrl: this.config.apiUrl,
        apiToken: this.config.apiToken,
      });
    } catch (err) {
      // Store error to report in onBegin since constructor can't be async
      this.initError = err instanceof Error ? err : new Error(String(err));
      this.logger = new Logger(false);
    }
  }

  async onBegin(_config: FullConfig, suite: Suite): Promise<void> {
    if (this.initError) {
      this.logger.error(this.initError.message);
      return;
    }

    const allTests = suite.allTests();
    this.logger.info(
      `Starting LGTM reporter for project "${this.config.projectKey}" with ${allTests.length} tests`,
    );

    try {
      // 1. Resolve project by key
      this.project = await this.resolveProject();
      if (!this.project) {
        this.logger.error(
          `Project with key "${this.config.projectKey}" not found`,
        );
        return;
      }
      this.logger.debug(`Resolved project: ${this.project.name} (${this.project.id})`);

      // 2. Resolve environment ID
      let environmentId: string | undefined;
      if (this.config.environment) {
        environmentId = await this.resolveEnvironmentId();
      }

      // 3. Resolve cycle ID
      let cycleId: string | undefined;
      if (this.config.cycle) {
        cycleId = await this.resolveCycleId();
      }

      // 4. Map Playwright tests to LGTM test cases
      await this.mapTestCases(allTests);

      const testCaseIds = [...new Set(this.testCaseMap.values())];
      if (testCaseIds.length === 0) {
        this.logger.warn("No test cases mapped — skipping test run creation");
        return;
      }

      // 5. Create test run
      this.testRun = await this.client.createTestRun({
        name: this.config.runName,
        projectId: this.project.id,
        testCaseIds,
        environmentId,
        cycleId,
      });

      this.logger.success(
        `Created test run #${this.testRun.runNumber} with ${this.testRun.totalCases} cases`,
      );

      // 6. Update run to in_progress
      await this.client.updateTestRun(this.testRun.id, {
        status: "in_progress",
      });
    } catch (err) {
      this.logger.error("Failed to initialize LGTM reporter", err);
      this.initError =
        err instanceof Error ? err : new Error(String(err));
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.testRun || this.initError) return;

    // Check for lgtm() metadata attachment (runtime mapping override)
    const metadata = extractLgtmMetadata(
      result.attachments as Array<{ name: string; contentType: string; body?: Buffer }>,
    );
    if (metadata) {
      this.remapFromMetadata(test.id, metadata);
    }

    const testCaseId = this.testCaseMap.get(test.id);
    if (!testCaseId) {
      this.logger.debug(`Skipping unmapped test: ${test.title}`);
      return;
    }

    const status = mapPlaywrightStatus(result.status);
    const comment = formatErrorComment(result.error);

    this.resultQueue.push({
      testCaseId,
      entry: {
        testCaseId,
        status,
        duration: result.duration,
        comment,
      },
      testTitle: buildTestTitle(test.titlePath()),
      error: result.error,
    });

    // Buffer stdout/stderr for log upload
    if (this.config.uploadLogs) {
      const output: string[] = [];
      for (const chunk of result.stdout) {
        output.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      }
      for (const chunk of result.stderr) {
        output.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      }
      if (output.length > 0) {
        this.logBuffer.set(test.id, output);
      }
    }

    this.logger.debug(
      `Queued result: ${buildTestTitle(test.titlePath())} → ${status} (${result.duration}ms)`,
    );
  }

  onStdOut(chunk: string | Buffer, test?: TestCase): void {
    if (!this.config?.uploadLogs || !test) return;
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
    const existing = this.logBuffer.get(test.id) || [];
    existing.push(text);
    this.logBuffer.set(test.id, existing);
  }

  onStdErr(chunk: string | Buffer, test?: TestCase): void {
    if (!this.config?.uploadLogs || !test) return;
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
    const existing = this.logBuffer.get(test.id) || [];
    existing.push(`[stderr] ${text}`);
    this.logBuffer.set(test.id, existing);
  }

  onError(error: TestError): void {
    this.logger.error(
      `Global error: ${error.message || error.value || "Unknown error"}`,
    );
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.testRun || this.initError) {
      if (this.initError) {
        this.logger.error(
          "Skipping result upload due to initialization error",
        );
      }
      return;
    }

    try {
      // 1. Flush queued results
      await this.flushResults();

      // 2. Upload logs
      if (this.config.uploadLogs) {
        await this.uploadLogs();
      }

      // 3. Create defects for failures
      if (this.config.autoCreateDefects) {
        await this.createDefectsForFailures();
      }

      // 4. Update run status
      const runStatus = mapPlaywrightRunStatus(result.status);
      await this.client.updateTestRun(this.testRun.id, {
        status: runStatus,
      });

      // 5. Print summary
      this.printSummary(result);
    } catch (err) {
      this.logger.error("Failed to finalize LGTM results", err);
    }
  }

  async onExit(): Promise<void> {
    // All work is done in onEnd
  }

  printsToStdio(): boolean {
    return false;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private async resolveProject(): Promise<Project | null> {
    const teams = await this.client.getTeams();
    return (
      teams.find(
        (t) =>
          t.key.toUpperCase() === this.config.projectKey.toUpperCase(),
      ) ?? null
    );
  }

  private async resolveEnvironmentId(): Promise<string | undefined> {
    if (!this.project || !this.config.environment) return undefined;

    try {
      const environments = await this.client.getEnvironments(this.project.id);
      const env = environments.find(
        (e) =>
          e.name.toLowerCase() === this.config.environment!.toLowerCase(),
      );
      if (env) {
        this.logger.debug(`Resolved environment: ${env.name} (${env.id})`);
        return env.id;
      }
      this.logger.warn(
        `Environment "${this.config.environment}" not found in project`,
      );
    } catch (err) {
      this.logger.warn(`Failed to resolve environment: ${err}`);
    }
    return undefined;
  }

  private async resolveCycleId(): Promise<string | undefined> {
    if (!this.project || !this.config.cycle) return undefined;

    try {
      const cycles = await this.client.getCycles(this.project.id);
      const cycle = cycles.find(
        (c) =>
          c.name.toLowerCase() === this.config.cycle!.toLowerCase(),
      );
      if (cycle) {
        this.logger.debug(`Resolved cycle: ${cycle.name} (${cycle.id})`);
        return cycle.id;
      }
      this.logger.warn(
        `Cycle "${this.config.cycle}" not found in project`,
      );
    } catch (err) {
      this.logger.warn(`Failed to resolve cycle: ${err}`);
    }
    return undefined;
  }

  private async mapTestCases(allTests: TestCase[]): Promise<void> {
    if (!this.project) return;

    // Fetch existing test cases from the project
    let existingCases: LgtmTestCase[] = [];
    try {
      const treeData = await this.client.getTestCases(this.project.id);
      existingCases = this.flattenTreeData(treeData);
      this.logger.debug(
        `Found ${existingCases.length} existing test cases in project`,
      );
    } catch (err) {
      this.logger.debug(`Could not fetch existing test cases: ${err}`);
    }

    // Build lookup maps
    const byTitle = new Map<string, LgtmTestCase>();
    const byKey = new Map<string, LgtmTestCase>();
    const byNumber = new Map<number, LgtmTestCase>();
    for (const tc of existingCases) {
      byTitle.set(tc.title.toLowerCase(), tc);
      if (tc.caseKey) byKey.set(tc.caseKey.toUpperCase(), tc);
      if (tc.caseNumber) byNumber.set(tc.caseNumber, tc);
    }

    for (const test of allTests) {
      const title = buildTestTitle(test.titlePath());
      this.testTitleMap.set(test.id, title);

      // Strategy 1: Check for lgtm() metadata annotation
      // We can't read attachments in onBegin (they don't exist yet),
      // so we check test annotations/tags for case keys like @ENG-42
      const caseKeyFromTag = this.extractCaseKeyFromTags(test);
      if (caseKeyFromTag) {
        const existing = byKey.get(caseKeyFromTag.toUpperCase());
        if (existing) {
          this.testCaseMap.set(test.id, existing.id);
          this.testCaseKeyMap.set(existing.id, existing.caseKey);
          this.logger.debug(`Mapped "${title}" → ${existing.caseKey} (via tag)`);
          continue;
        }
      }

      // Strategy 2: Match by title
      const byTitleMatch = byTitle.get(title.toLowerCase());
      if (byTitleMatch) {
        this.testCaseMap.set(test.id, byTitleMatch.id);
        this.testCaseKeyMap.set(byTitleMatch.id, byTitleMatch.caseKey);
        this.logger.debug(`Mapped "${title}" → ${byTitleMatch.caseKey} (via title)`);
        continue;
      }

      // Strategy 3: Auto-create
      if (this.config.autoCreateTestCases) {
        try {
          const created = await this.client.createTestCase({
            title,
            projectId: this.project.id,
            type: "functional",
            automationStatus: "automated",
            layer: "e2e",
            status: "active",
          });
          this.testCaseMap.set(test.id, created.id);
          this.testCaseKeyMap.set(created.id, created.caseKey);
          // Add to lookup maps for dedup
          byTitle.set(title.toLowerCase(), created);
          byKey.set(created.caseKey.toUpperCase(), created);
          this.logger.debug(`Created test case "${title}" → ${created.caseKey}`);
        } catch (err) {
          this.logger.warn(`Failed to create test case "${title}": ${err}`);
        }
      } else {
        this.logger.debug(`No match for "${title}" and autoCreateTestCases is disabled`);
      }
    }

    this.logger.info(
      `Mapped ${this.testCaseMap.size}/${allTests.length} tests to LGTM cases`,
    );
  }

  /**
   * Remap a test's LGTM case based on lgtm() metadata attachment.
   * This overrides whatever mapping was set during onBegin.
   */
  private remapFromMetadata(testId: string, metadata: LgtmMetadata): void {
    if (metadata.caseKey) {
      // Find by key in our existing keyMap
      for (const [caseId, key] of this.testCaseKeyMap) {
        if (key.toUpperCase() === metadata.caseKey.toUpperCase()) {
          this.testCaseMap.set(testId, caseId);
          this.logger.debug(
            `Remapped test via lgtm() metadata → ${key}`,
          );
          return;
        }
      }
      this.logger.debug(
        `lgtm() metadata references ${metadata.caseKey} but it's not in the current run`,
      );
    }
  }

  /**
   * Extract a case key from test tags (e.g., @ENG-42).
   * Playwright tags are strings like "@ENG-42".
   */
  private extractCaseKeyFromTags(test: TestCase): string | null {
    for (const tag of test.tags) {
      // Tags are "@tag" format, strip the @
      const cleaned = tag.startsWith("@") ? tag.slice(1) : tag;
      // Check if it matches a case key pattern: LETTERS-DIGITS
      if (/^[A-Z]+-\d+$/i.test(cleaned)) {
        return cleaned.toUpperCase();
      }
    }
    return null;
  }

  /**
   * Flatten tree data from /api/test-repo into a flat array of test cases.
   * The tree structure has suites/sections with children.
   */
  private flattenTreeData(data: unknown): LgtmTestCase[] {
    const results: LgtmTestCase[] = [];

    function walk(items: unknown): void {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          // Test cases have a caseKey field
          if (obj.caseKey && obj.id && obj.title) {
            results.push(obj as unknown as LgtmTestCase);
          }
          // Recurse into children
          if (obj.children) walk(obj.children);
          if (obj.tests) walk(obj.tests);
          if (obj.testCases) walk(obj.testCases);
        }
      }
    }

    walk(data);
    return results;
  }

  private async flushResults(): Promise<void> {
    if (this.resultQueue.length === 0 || !this.testRun) return;

    // Also check for lgtm() metadata attachments that were added during test execution
    // and remap any tests that used the lgtm() helper
    // (metadata was embedded in onTestEnd via result.attachments)

    const entries: BulkResultEntry[] = [];
    const seen = new Set<string>();

    for (const queued of this.resultQueue) {
      // Dedup: only submit the last result per test case (handles retries)
      if (seen.has(queued.testCaseId)) {
        // Replace previous entry
        const idx = entries.findIndex(
          (e) => e.testCaseId === queued.testCaseId,
        );
        if (idx >= 0) entries[idx] = queued.entry;
      } else {
        seen.add(queued.testCaseId);
        entries.push(queued.entry);
      }
    }

    this.logger.info(`Submitting ${entries.length} results...`);

    // Submit in batches of 50
    const batchSize = 50;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      try {
        const response = await this.client.submitResults(
          this.testRun.id,
          batch,
        );
        this.logger.debug(
          `Batch ${Math.floor(i / batchSize) + 1}: ${response.updated} results updated`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to submit results batch ${Math.floor(i / batchSize) + 1}`,
          err,
        );
      }
    }
  }

  private async uploadLogs(): Promise<void> {
    if (!this.testRun || this.logBuffer.size === 0) return;

    const maxChunkSize = 60000; // Stay under 64KB limit

    for (const [testId, lines] of this.logBuffer) {
      const content = lines.join("");
      if (!content.trim()) continue;

      const title = this.testTitleMap.get(testId) || testId;

      // Chunk the content if needed
      for (let offset = 0; offset < content.length; offset += maxChunkSize) {
        const chunk = content.slice(offset, offset + maxChunkSize);
        try {
          await this.client.appendRunLog(this.testRun.id, {
            content: chunk,
            step: title,
          });
        } catch (err) {
          this.logger.debug(`Failed to upload log for "${title}": ${err}`);
        }
      }
    }

    this.logger.debug(`Uploaded logs for ${this.logBuffer.size} tests`);
  }

  private async createDefectsForFailures(): Promise<void> {
    if (!this.testRun || !this.project) return;

    const failures = this.resultQueue.filter(
      (q) => q.entry.status === "failed",
    );

    if (failures.length === 0) return;

    this.logger.info(`Creating ${failures.length} defect(s) for failures...`);

    for (const failure of failures) {
      try {
        const defect = await this.client.createDefect({
          title: `[Playwright] ${failure.testTitle}`,
          projectId: this.project.id,
          description: formatErrorComment(failure.error) || "Test failed during Playwright execution",
          severity: "normal",
          priority: "medium",
          defectType: "functional",
          testCaseId: failure.testCaseId,
          testRunId: this.testRun.id,
        });
        this.logger.debug(
          `Created defect ${defect.defectKey} for "${failure.testTitle}"`,
        );
      } catch (err) {
        this.logger.debug(
          `Failed to create defect for "${failure.testTitle}": ${err}`,
        );
      }
    }
  }

  private printSummary(result: FullResult): void {
    const passed = this.resultQueue.filter(
      (r) => r.entry.status === "passed",
    ).length;
    const failed = this.resultQueue.filter(
      (r) => r.entry.status === "failed",
    ).length;
    const skipped = this.resultQueue.filter(
      (r) => r.entry.status === "skipped",
    ).length;
    const blocked = this.resultQueue.filter(
      (r) => r.entry.status === "blocked",
    ).length;

    const parts = [
      `${passed} passed`,
      `${failed} failed`,
      `${skipped} skipped`,
      `${blocked} blocked`,
    ];

    this.logger.info("");
    this.logger.success(
      `Test run #${this.testRun?.runNumber} completed: ${parts.join(", ")}`,
    );
    this.logger.info(
      `Duration: ${(result.duration / 1000).toFixed(1)}s`,
    );
    this.logger.info(
      `View results: ${this.config.apiUrl}`,
    );
  }
}
