import { Command } from "commander";
import { LgtmApiClient } from "@lgtm/shared";
import { resolveConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { handleError, AuthError } from "../errors.js";
import { outputJson, formatDefectsTable, outputTable } from "../output.js";
import { resolveProjectId } from "../helpers.js";

export function registerDefectsCommands(parent: Command): void {
  const defects = parent.command("defects").description("Manage defects/bugs");

  defects
    .command("list")
    .description("List defects for a project")
    .option("-p, --project <key>", "Project key (e.g., ENG)")
    .option(
      "-s, --status <status>",
      "Filter by status (open, in_progress, fixed, etc.)",
    )
    .option(
      "--severity <severity>",
      "Filter by severity (blocker, critical, major, etc.)",
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

        let defectList = (await client.getDefects(projectId)) as unknown as Array<
          Record<string, unknown>
        >;

        if (cmdOpts.status) {
          defectList = defectList.filter((d) => d.status === cmdOpts.status);
        }
        if (cmdOpts.severity) {
          defectList = defectList.filter(
            (d) => d.severity === cmdOpts.severity,
          );
        }

        if (opts.json) {
          outputJson(defectList);
        } else {
          if (defectList.length === 0) {
            logger.info("No defects found");
          } else {
            logger.info(`${defectList.length} defect(s) found`);
            outputTable(formatDefectsTable(defectList));
          }
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  defects
    .command("get <key>")
    .description("Get a defect by key (e.g., ENG-D-42)")
    .action(async (defectKey: string) => {
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

        const defect = await client.getDefectByKey(defectKey.toUpperCase());

        if (opts.json) {
          outputJson(defect);
        } else {
          const d = defect as unknown as Record<string, unknown>;
          console.log(`\nDefect: ${d.defectKey}`);
          console.log(`Title: ${d.title}`);
          console.log(`Status: ${d.status}  Severity: ${d.severity}  Priority: ${d.priority}`);
          if (d.description) console.log(`\nDescription:\n${d.description}`);
          if (d.stepsToReproduce)
            console.log(`\nSteps to Reproduce:\n${d.stepsToReproduce}`);
          if (d.expectedResult)
            console.log(`\nExpected Result:\n${d.expectedResult}`);
          if (d.actualResult)
            console.log(`\nActual Result:\n${d.actualResult}`);
          if (d.testCaseKey)
            console.log(`\nLinked Test Case: ${d.testCaseKey}`);
          if (d.testRunKey) console.log(`Linked Test Run: ${d.testRunKey}`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });

  defects
    .command("create")
    .description("Create a new defect")
    .requiredOption("-p, --project <key>", "Project key (e.g., ENG)")
    .requiredOption("-t, --title <title>", "Defect title")
    .option("-d, --description <text>", "Description")
    .option(
      "--severity <severity>",
      "Severity (normal, blocker, critical, major, minor, trivial)",
      "normal",
    )
    .option(
      "--priority <priority>",
      "Priority (low, medium, high, critical)",
      "medium",
    )
    .option(
      "--type <type>",
      "Defect type (functional, ui, performance, security, crash, data, other)",
      "functional",
    )
    .option("--steps-to-reproduce <text>", "Steps to reproduce")
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

        const defect = await client.createDefect({
          title: cmdOpts.title,
          projectId,
          description: cmdOpts.description,
          severity: cmdOpts.severity,
          priority: cmdOpts.priority,
          defectType: cmdOpts.type,
          stepsToReproduce: cmdOpts.stepsToReproduce,
        });

        if (opts.json) {
          outputJson(defect);
        } else {
          logger.info(
            `Created defect "${defect.title}" (${defect.defectKey})`,
          );
          logger.info(`Defect ID: ${defect.id}`);
        }
      } catch (err) {
        handleError(err, logger);
      }
    });
}
