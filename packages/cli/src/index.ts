import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProjectsCommands } from "./commands/projects.js";
import { registerTestCasesCommands } from "./commands/test-cases.js";
import { registerTestRunsCommands } from "./commands/test-runs.js";
import { registerTestResultsCommands } from "./commands/test-results.js";
import { registerDefectsCommands } from "./commands/defects.js";
import { registerEnvironmentsCommands } from "./commands/environments.js";
import { registerCyclesCommands } from "./commands/cycles.js";
import { registerSharedStepsCommands } from "./commands/shared-steps.js";
import { createLogger } from "./logger.js";
import { handleError } from "./errors.js";

const program = new Command();

program
  .name("lgtm")
  .description("LGTM test case management CLI — agent-friendly interface")
  .version("0.1.0")
  .option("--json", "Output as JSON (machine-readable)")
  .option("--verbose", "Enable verbose/debug logging")
  .option("--api-url <url>", "LGTM API URL (overrides config/env)")
  .option(
    "--api-token <token>",
    "LGTM API token (overrides config/env). WARNING: prefer LGTM_API_TOKEN env var to avoid shell history exposure",
  )
  .option("--token-stdin", "Read API token from stdin (avoids shell history exposure)")
  .option("--project <key>", "Default project key (overrides config/env)");

// Register command groups
registerAuthCommands(program);
registerProjectsCommands(program);
registerTestCasesCommands(program);
registerTestRunsCommands(program);
registerTestResultsCommands(program);
registerDefectsCommands(program);
registerEnvironmentsCommands(program);
registerCyclesCommands(program);
registerSharedStepsCommands(program);

// Handle --token-stdin and warn on --api-token usage
program.hook("preAction", async (thisCommand) => {
  const opts = thisCommand.opts();

  // Warn when --api-token is used directly (visible in shell history/process list)
  if (opts.apiToken && process.argv.includes("--api-token")) {
    console.error(
      "[lgtm] Warning: --api-token exposes your token in shell history and process listings. Prefer LGTM_API_TOKEN env var or --token-stdin.",
    );
  }

  // Read token from stdin if --token-stdin is set
  if (opts.tokenStdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const token = Buffer.concat(chunks).toString("utf-8").trim();
    if (token) {
      thisCommand.setOptionValue("apiToken", token);
    }
  }

  // Warn on HTTP URLs (not HTTPS)
  const apiUrl = opts.apiUrl || process.env.LGTM_API_URL || "";
  if (apiUrl && apiUrl.startsWith("http://")) {
    console.error(
      "[lgtm] Warning: API URL uses http:// (unencrypted). Your API token may be intercepted. Use https:// for production.",
    );
  }
});

// Graceful shutdown on signals
let shutdownRequested = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shutdownRequested) {
      process.exit(1);
    }
    shutdownRequested = true;
    console.error(`\n[lgtm] Received ${signal}, finishing current operation...`);
  });
}

program.parseAsync().catch((err) => {
  const logger = createLogger();
  handleError(err, logger);
});
