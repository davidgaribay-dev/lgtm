import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig, saveConfig, getConfigPath } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError } from "../errors.js";
import { createInterface } from "node:readline/promises";
import { existsSync } from "node:fs";

export function registerAuthCommands(parent: Command): void {
  const auth = parent.command("auth").description("Manage authentication");

  auth
    .command("configure")
    .description("Configure API URL and token")
    .action(async () => {
      const logger = createLogger();

      try {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const apiUrl = await rl.question("LGTM API URL: ");
        const apiToken = await rl.question("API Token: ");
        const defaultProject = await rl.question(
          "Default project key (optional): ",
        );

        rl.close();

        if (!apiUrl.trim()) {
          logger.error("API URL is required");
          process.exitCode = 1;
          return;
        }

        if (!apiToken.trim()) {
          logger.error("API token is required");
          process.exitCode = 1;
          return;
        }

        const config: Record<string, string> = {
          apiUrl: apiUrl.trim(),
          apiToken: apiToken.trim(),
        };

        if (defaultProject.trim()) {
          config.defaultProject = defaultProject.trim().toUpperCase();
        }

        saveConfig(config);
        logger.info(`Configuration saved to ${getConfigPath()}`);

        // Test connection
        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });
        const teams = await client.getTeams();
        logger.info(
          `Connected successfully. ${teams.length} project(s) accessible.`,
        );
      } catch (err) {
        handleError(err, logger);
      }
    });

  auth
    .command("status")
    .description("Show current authentication status")
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
        });

        const sources: Record<string, string> = {};

        if (opts.apiUrl) sources.apiUrl = "CLI flag";
        else if (process.env.LGTM_API_URL) sources.apiUrl = "LGTM_API_URL env";
        else if (config.apiUrl) sources.apiUrl = "config file";

        if (opts.apiToken) sources.apiToken = "CLI flag";
        else if (process.env.LGTM_API_TOKEN)
          sources.apiToken = "LGTM_API_TOKEN env";
        else if (config.apiToken) sources.apiToken = "config file";

        const configPath = getConfigPath();
        const configExists = existsSync(configPath);

        if (opts.json) {
          const result: Record<string, unknown> = {
            apiUrl: config.apiUrl || null,
            apiTokenSet: !!config.apiToken,
            defaultProject: config.defaultProject || null,
            configFile: configPath,
            configFileExists: configExists,
            sources,
          };

          // Test connection if we have credentials
          if (config.apiUrl && config.apiToken) {
            try {
              const client = new LgtmApiClient({
                baseUrl: config.apiUrl,
                apiToken: config.apiToken,
              });
              const teams = await client.getTeams();
              result.connected = true;
              result.projectCount = teams.length;
            } catch {
              result.connected = false;
            }
          } else {
            result.connected = false;
          }

          console.log(JSON.stringify(result, null, 2));
          return;
        }

        logger.info(`Config file: ${configPath} (${configExists ? "exists" : "not found"})`);
        logger.info(
          `API URL: ${config.apiUrl || "(not set)"} (source: ${sources.apiUrl || "none"})`,
        );
        logger.info(
          `API Token: ${config.apiToken ? "****" + config.apiToken.slice(-4) : "(not set)"} (source: ${sources.apiToken || "none"})`,
        );
        logger.info(
          `Default project: ${config.defaultProject || "(not set)"}`,
        );

        if (config.apiUrl && config.apiToken) {
          try {
            const client = new LgtmApiClient({
              baseUrl: config.apiUrl,
              apiToken: config.apiToken,
            });
            const teams = await client.getTeams();
            logger.info(
              `Connection: OK (${teams.length} project(s) accessible)`,
            );
          } catch (err) {
            logger.error(
              `Connection: FAILED (${err instanceof Error ? err.message : String(err)})`,
            );
          }
        } else {
          logger.warn(
            "Cannot test connection: API URL and token are required",
          );
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
