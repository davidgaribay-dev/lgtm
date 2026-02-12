import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError } from "../errors.js";
import {
  outputJson,
  formatSharedStepsTable,
  formatSharedStepDetail,
  outputTable,
} from "../output.js";
import { resolveProjectId } from "../helpers.js";

export function registerSharedStepsCommands(parent: Command): void {
  const sharedSteps = parent
    .command("shared-steps")
    .description("Manage shared steps");

  // ── list ──────────────────────────────────────────────────────────

  sharedSteps
    .command("list")
    .description("List shared steps for a project")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
    .option(
      "-s, --status <status>",
      "Filter by status (active, draft, archived)",
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

        let steps = (await client.getSharedSteps(
          projectId,
        )) as unknown as Array<Record<string, unknown>>;

        if (cmdOpts.status) {
          steps = steps.filter((s) => s.status === cmdOpts.status);
        }

        if (opts.json) {
          outputJson(steps);
        } else {
          if (steps.length === 0) {
            logger.info("No shared steps found");
          } else {
            logger.info(`${steps.length} shared step(s) found`);
            outputTable(formatSharedStepsTable(steps));
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  // ── get ───────────────────────────────────────────────────────────

  sharedSteps
    .command("get <id>")
    .description("Get a shared step with its actions")
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

        const step = await client.getSharedStep(id);

        if (opts.json) {
          outputJson(step);
        } else {
          const stepObj = step as unknown as Record<string, unknown>;
          const actions = (stepObj.actions || []) as Array<
            Record<string, unknown>
          >;
          formatSharedStepDetail(stepObj, actions);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  // ── create ────────────────────────────────────────────────────────

  sharedSteps
    .command("create")
    .description("Create a new shared step")
    .requiredOption("-p, --project <key>", "Project key (e.g., ENG)")
    .requiredOption("-t, --title <title>", "Shared step title")
    .option("-d, --description <text>", "Description")
    .option(
      "-s, --status <status>",
      "Status (active, draft, archived)",
      "active",
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

        const client = new LgtmApiClient({
          baseUrl: config.apiUrl,
          apiToken: config.apiToken,
        });

        const { projectId } = await resolveProjectId(
          client,
          cmdOpts.project,
        );

        const step = await client.createSharedStep({
          title: cmdOpts.title,
          projectId,
          description: cmdOpts.description,
          status: cmdOpts.status,
        });

        if (opts.json) {
          outputJson(step);
        } else {
          logger.info(`Created shared step "${step.title}" (${step.id})`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  // ── update ────────────────────────────────────────────────────────

  sharedSteps
    .command("update <id>")
    .description("Update a shared step")
    .option("-t, --title <title>", "New title")
    .option("-d, --description <text>", "New description")
    .option(
      "-s, --status <status>",
      "New status (active, draft, archived)",
    )
    .action(async (id: string, cmdOpts) => {
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

        const data: Record<string, string> = {};
        if (cmdOpts.title) data.title = cmdOpts.title;
        if (cmdOpts.description !== undefined)
          data.description = cmdOpts.description;
        if (cmdOpts.status) data.status = cmdOpts.status;

        if (Object.keys(data).length === 0) {
          logger.warn(
            "No fields to update. Use --title, --description, or --status",
          );
          return;
        }

        const step = await client.updateSharedStep(id, data);

        if (opts.json) {
          outputJson(step);
        } else {
          logger.info(`Updated shared step "${step.title}"`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  // ── delete ────────────────────────────────────────────────────────

  sharedSteps
    .command("delete <id>")
    .description("Delete a shared step")
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

        await client.deleteSharedStep(id);

        if (opts.json) {
          outputJson({ success: true, id });
        } else {
          logger.info(`Deleted shared step ${id}`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
