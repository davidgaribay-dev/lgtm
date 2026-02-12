import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError } from "../errors.js";
import { outputJson, formatEnvironmentsTable, outputTable } from "../output.js";
import { resolveProjectId } from "../helpers.js";

export function registerEnvironmentsCommands(parent: Command): void {
  const environments = parent
    .command("environments")
    .description("Manage environments");

  environments
    .command("list")
    .description("List environments for a project")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
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

        const envs = await client.getEnvironments(projectId);

        if (opts.json) {
          outputJson(envs);
        } else {
          if (envs.length === 0) {
            logger.info("No environments found");
          } else {
            outputTable(
              formatEnvironmentsTable(
                envs as unknown as Array<Record<string, unknown>>,
              ),
            );
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
