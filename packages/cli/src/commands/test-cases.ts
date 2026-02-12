import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError, NotFoundError } from "../errors.js";
import {
  outputJson,
  formatTestCasesTable,
  formatTestCaseDetail,
  outputTable,
} from "../output.js";
import { resolveProjectId, flattenTestCases } from "../helpers.js";

export function registerTestCasesCommands(parent: Command): void {
  const testCases = parent
    .command("test-cases")
    .description("Manage test cases");

  testCases
    .command("list")
    .description("List test cases for a project")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
    .option("-s, --status <status>", "Filter by status (draft, active, deprecated)")
    .option("--priority <priority>", "Filter by priority (low, medium, high, critical)")
    .option("--type <type>", "Filter by type (functional, smoke, regression, etc.)")
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

        const data = await client.getTestCases(projectId);
        let cases = flattenTestCases(data);

        // Client-side filtering
        if (cmdOpts.status) {
          cases = cases.filter((c) => c.status === cmdOpts.status);
        }
        if (cmdOpts.priority) {
          cases = cases.filter((c) => c.priority === cmdOpts.priority);
        }
        if (cmdOpts.type) {
          cases = cases.filter((c) => c.type === cmdOpts.type);
        }

        if (opts.json) {
          outputJson(cases);
        } else {
          if (cases.length === 0) {
            logger.info("No test cases found");
          } else {
            logger.info(`${cases.length} test case(s) found`);
            outputTable(formatTestCasesTable(cases));
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  testCases
    .command("get <key>")
    .description("Get a test case by key (e.g., ENG-42)")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
    .action(async (caseKey: string, cmdOpts) => {
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

        // Extract project key from case key if not provided
        const projectKey =
          config.defaultProject || caseKey.split("-")[0];

        if (!projectKey) {
          throw new NotFoundError(
            "Cannot determine project. Use --project <key> or set LGTM_PROJECT_KEY",
          );
        }

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const { projectId } = await resolveProjectId(client, projectKey);
        const tc = await client.getTestCaseByKey(projectId, caseKey.toUpperCase());

        if (opts.json) {
          outputJson(tc);
        } else {
          const tcObj = tc as unknown as Record<string, unknown>;
          const steps = (tcObj.steps || []) as Array<Record<string, unknown>>;
          formatTestCaseDetail(tcObj, steps);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
