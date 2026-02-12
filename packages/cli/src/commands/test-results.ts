import { Command } from "commander";
import { LgtmApiClient, TEST_RESULT_STATUSES } from "@lgtm/shared";
import type { BulkResultEntry, TestResultStatus } from "@lgtm/shared";
import { readFileSync } from "node:fs";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError, CliError } from "../errors.js";
import { outputJson } from "../output.js";

export function registerTestResultsCommands(parent: Command): void {
  const testResults = parent
    .command("test-results")
    .description("Submit test results");

  testResults
    .command("submit")
    .description("Submit a single test result")
    .requiredOption("--run <id>", "Test run ID")
    .requiredOption("--case <id>", "Test case ID")
    .requiredOption(
      "-s, --status <status>",
      `Result status (${TEST_RESULT_STATUSES.join(", ")})`,
    )
    .option("--comment <text>", "Result comment")
    .option("--duration <ms>", "Duration in milliseconds", parseInt)
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

        if (
          !TEST_RESULT_STATUSES.includes(
            cmdOpts.status as TestResultStatus,
          )
        ) {
          throw new CliError(
            `Invalid status "${cmdOpts.status}". Must be one of: ${TEST_RESULT_STATUSES.join(", ")}`,
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const entry: BulkResultEntry = {
          testCaseId: cmdOpts.case,
          status: cmdOpts.status as TestResultStatus,
        };

        if (cmdOpts.comment) entry.comment = cmdOpts.comment;
        if (cmdOpts.duration) entry.duration = cmdOpts.duration;

        const result = await client.submitResults(cmdOpts.run, [entry]);

        if (opts.json) {
          outputJson(result);
        } else {
          logger.info(
            `Submitted result: ${cmdOpts.status} (${result.updated} updated)`,
          );
          if (result.suggestedRunStatus) {
            logger.info(
              `Suggested run status: ${result.suggestedRunStatus}`,
            );
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  testResults
    .command("bulk")
    .description("Bulk submit results from a JSON file")
    .requiredOption("--run <id>", "Test run ID")
    .requiredOption(
      "-f, --file <path>",
      "Path to JSON file with results array",
    )
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

        let results: BulkResultEntry[];
        try {
          const content = readFileSync(cmdOpts.file, "utf-8");
          const parsed = JSON.parse(content);
          results = Array.isArray(parsed) ? parsed : parsed.results;
        } catch (err) {
          throw new CliError(
            `Failed to read results file: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        if (!Array.isArray(results) || results.length === 0) {
          throw new CliError(
            "Results file must contain a JSON array of result entries",
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        // Submit in batches of 50
        const batchSize = 50;
        let totalUpdated = 0;
        let suggestedStatus: string | undefined;

        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          const res = await client.submitResults(cmdOpts.run, batch);
          totalUpdated += res.updated;
          if (res.suggestedRunStatus) {
            suggestedStatus = res.suggestedRunStatus;
          }
          logger.debug(
            `Submitted batch ${Math.floor(i / batchSize) + 1} (${batch.length} results)`,
          );
        }

        if (opts.json) {
          outputJson({
            updated: totalUpdated,
            suggestedRunStatus: suggestedStatus,
          });
        } else {
          logger.info(
            `Submitted ${results.length} result(s) (${totalUpdated} updated)`,
          );
          if (suggestedStatus) {
            logger.info(`Suggested run status: ${suggestedStatus}`);
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
