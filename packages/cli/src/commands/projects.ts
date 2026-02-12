import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError } from "../errors.js";
import { outputJson, formatProjectsTable, outputTable } from "../output.js";

export function registerProjectsCommands(parent: Command): void {
  const projects = parent
    .command("projects")
    .description("Manage projects/teams");

  projects
    .command("list")
    .description("List all accessible projects")
    .action(async () => {
      const opts = parent.opts();
      const logger = createLogger({
        verbose: opts.verbose,
        jsonOutput: opts.json,
      });

      try {
        const config = resolveConfig({
          apiUrl: opts.apiUrl,
          apiToken: opts.apiToken,
          project: opts.project,
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

        const teams = await client.getTeams();

        if (opts.json) {
          outputJson(teams);
        } else {
          if (teams.length === 0) {
            logger.info("No projects found");
          } else {
            outputTable(formatProjectsTable(teams as unknown as Array<Record<string, unknown>>));
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
