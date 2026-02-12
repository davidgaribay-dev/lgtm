import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError } from "../errors.js";
import {
  outputJson,
  formatTestRunsTable,
  formatTestRunDetailTable,
  outputTable,
} from "../output.js";
import {
  resolveProjectId,
  resolveEnvironmentId,
  resolveCycleId,
  flattenTestCases,
} from "../helpers.js";

export function registerTestRunsCommands(parent: Command): void {
  const testRuns = parent
    .command("test-runs")
    .description("Manage test runs");

  testRuns
    .command("list")
    .description("List test runs for a project")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
    .option("-s, --status <status>", "Filter by status (pending, in_progress, passed, failed, blocked)")
    .action(async (cmdOpts) => {
      const opts = parent.opts();
      const logger = createLogger({
        verbose: opts.verbose,
        jsonOutput: opts.json,
      });

      try {
        const config = resolveConfig({
          apiUrl: opts.apiUrl,
          apiToken: opts.apiToken,
          project: cmdOpts.project || opts.project,
        });

        if (!config.apiUrl || !config.apiToken) {
          throw new AuthError(
            "API URL and token required. Run: lgtm auth configure",
          );
        }

        if (!config.defaultProject) {
          throw new AuthError(
            "Project key required. Use --project <key> or set LGTM_PROJECT_KEY",
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const { projectId } = await resolveProjectId(
          client,
          config.defaultProject,
        );

        let runs = (await client.getTestRuns(projectId)) as unknown as Array<Record<string, unknown>>;

        if (cmdOpts.status) {
          runs = runs.filter((r) => r.status === cmdOpts.status);
        }

        if (opts.json) {
          outputJson(runs);
        } else {
          if (runs.length === 0) {
            logger.info("No test runs found");
          } else {
            logger.info(`${runs.length} test run(s) found`);
            outputTable(formatTestRunsTable(runs));
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  testRuns
    .command("get <id>")
    .description("Get test run details by ID")
    .action(async (id: string) => {
      const opts = parent.opts();
      const logger = createLogger({
        verbose: opts.verbose,
        jsonOutput: opts.json,
      });

      try {
        const config = resolveConfig({
          apiUrl: opts.apiUrl,
          apiToken: opts.apiToken,
        });

        if (!config.apiUrl || !config.apiToken) {
          throw new AuthError(
            "API URL and token required. Run: lgtm auth configure",
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const run = await client.getTestRun(id);

        if (opts.json) {
          outputJson(run);
        } else {
          const runObj = run as unknown as Record<string, unknown>;
          const results = (runObj.results || []) as Array<Record<string, unknown>>;
          const metrics = (runObj.metrics || {}) as Record<string, unknown>;
          formatTestRunDetailTable(runObj, results, metrics);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  testRuns
    .command("create")
    .description("Create a new test run")
    .requiredOption("-p, --project <key>", "Project key (e.g., ENG)")
    .requiredOption("-n, --name <name>", "Test run name")
    .requiredOption(
      "--cases <keys>",
      "Comma-separated test case keys (e.g., ENG-1,ENG-2,ENG-3)",
    )
    .option("-e, --environment <name>", "Environment name")
    .option("-c, --cycle <name>", "Cycle name")
    .action(async (cmdOpts) => {
      const opts = parent.opts();
      const logger = createLogger({
        verbose: opts.verbose,
        jsonOutput: opts.json,
      });

      try {
        const config = resolveConfig({
          apiUrl: opts.apiUrl,
          apiToken: opts.apiToken,
        });

        if (!config.apiUrl || !config.apiToken) {
          throw new AuthError(
            "API URL and token required. Run: lgtm auth configure",
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const { projectId } = await resolveProjectId(
          client,
          cmdOpts.project,
        );

        // Resolve case keys to IDs
        const caseKeys = (cmdOpts.cases as string)
          .split(",")
          .map((k: string) => k.trim().toUpperCase());

        const data = await client.getTestCases(projectId);
        const allCases = flattenTestCases(data);

        const caseIds: string[] = [];
        for (const key of caseKeys) {
          const match = allCases.find(
            (c) => String(c.caseKey).toUpperCase() === key,
          );
          if (!match) {
            logger.warn(`Test case "${key}" not found, skipping`);
          } else {
            caseIds.push(String(match.id));
          }
        }

        if (caseIds.length === 0) {
          throw new AuthError("No valid test cases found for the given keys");
        }

        // Resolve optional environment and cycle
        let environmentId: string | undefined;
        let cycleId: string | undefined;

        if (cmdOpts.environment) {
          environmentId = await resolveEnvironmentId(
            client,
            projectId,
            cmdOpts.environment,
          );
        }

        if (cmdOpts.cycle) {
          cycleId = await resolveCycleId(
            client,
            projectId,
            cmdOpts.cycle,
          );
        }

        const run = await client.createTestRun({
          name: cmdOpts.name,
          projectId,
          testCaseIds: caseIds,
          environmentId,
          cycleId,
        });

        if (opts.json) {
          outputJson(run);
        } else {
          logger.info(
            `Created test run "${run.name}" (${run.runKey}) with ${run.totalCases} case(s)`,
          );
          logger.info(`Run ID: ${run.id}`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
