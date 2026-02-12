import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProjectsCommands } from "./commands/projects.js";
import { registerTestCasesCommands } from "./commands/test-cases.js";
import { registerTestRunsCommands } from "./commands/test-runs.js";
import { registerTestResultsCommands } from "./commands/test-results.js";
import { registerDefectsCommands } from "./commands/defects.js";
import { registerEnvironmentsCommands } from "./commands/environments.js";
import { registerCyclesCommands } from "./commands/cycles.js";
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
  .option("--api-token <token>", "LGTM API token (overrides config/env)")
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

program.parseAsync().catch((err) => {
  const logger = createLogger();
  handleError(err, logger);
});
