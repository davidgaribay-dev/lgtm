import Table from "cli-table3";
import chalk from "chalk";

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputTable(table: Table.Table): void {
  console.log(table.toString());
}

function statusColor(status: string): string {
  switch (status) {
    case "passed":
    case "active":
    case "fixed":
    case "verified":
    case "closed":
    case "completed":
      return chalk.green(status);
    case "failed":
    case "open":
    case "reopened":
    case "blocker":
    case "critical":
      return chalk.red(status);
    case "blocked":
    case "in_progress":
    case "deferred":
      return chalk.yellow(status);
    case "skipped":
    case "draft":
    case "pending":
    case "planned":
      return chalk.gray(status);
    case "deprecated":
    case "rejected":
    case "duplicate":
      return chalk.dim(status);
    default:
      return status;
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return chalk.red(priority);
    case "high":
      return chalk.yellow(priority);
    case "medium":
      return chalk.cyan(priority);
    case "low":
      return chalk.gray(priority);
    default:
      return priority;
  }
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ── Table Formatters ──────────────────────────────────────────────────

export function formatProjectsTable(projects: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Key", "Name", "Status"],
    style: { head: ["cyan"] },
  });

  for (const p of projects) {
    table.push([
      String(p.key || ""),
      truncate(String(p.name || ""), 50),
      statusColor(String(p.status || "")),
    ]);
  }

  return table;
}

export function formatTestCasesTable(cases: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Key", "Title", "Status", "Priority", "Type"],
    style: { head: ["cyan"] },
  });

  for (const c of cases) {
    table.push([
      String(c.caseKey || ""),
      truncate(String(c.title || ""), 50),
      statusColor(String(c.status || "")),
      priorityColor(String(c.priority || "")),
      String(c.type || ""),
    ]);
  }

  return table;
}

export function formatTestRunsTable(runs: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Key", "Name", "Status", "Total", "Pass", "Fail"],
    style: { head: ["cyan"] },
  });

  for (const r of runs) {
    const metrics = (r.metrics || {}) as Record<string, unknown>;
    table.push([
      String(r.runKey || ""),
      truncate(String(r.name || ""), 40),
      statusColor(String(r.status || "")),
      String(r.totalCases ?? metrics.total ?? ""),
      String(metrics.passed ?? ""),
      String(metrics.failed ?? ""),
    ]);
  }

  return table;
}

export function formatDefectsTable(defects: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Key", "Title", "Status", "Severity", "Priority"],
    style: { head: ["cyan"] },
  });

  for (const d of defects) {
    table.push([
      String(d.defectKey || ""),
      truncate(String(d.title || ""), 40),
      statusColor(String(d.status || "")),
      statusColor(String(d.severity || "")),
      priorityColor(String(d.priority || "")),
    ]);
  }

  return table;
}

export function formatEnvironmentsTable(envs: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Name", "Type", "URL", "Default"],
    style: { head: ["cyan"] },
  });

  for (const e of envs) {
    table.push([
      String(e.name || ""),
      String(e.type || ""),
      truncate(String(e.url || ""), 50),
      e.isDefault ? chalk.green("yes") : "",
    ]);
  }

  return table;
}

export function formatCyclesTable(cycles: Array<Record<string, unknown>>): Table.Table {
  const table = new Table({
    head: ["Name", "Status", "Start", "End", "Current"],
    style: { head: ["cyan"] },
  });

  for (const c of cycles) {
    table.push([
      String(c.name || ""),
      statusColor(String(c.status || "")),
      c.startDate ? new Date(String(c.startDate)).toLocaleDateString() : "",
      c.endDate ? new Date(String(c.endDate)).toLocaleDateString() : "",
      c.isCurrent ? chalk.green("yes") : "",
    ]);
  }

  return table;
}

export function formatTestRunDetailTable(
  run: Record<string, unknown>,
  results: Array<Record<string, unknown>>,
  metrics: Record<string, unknown>,
): void {
  console.log(chalk.bold(`\nTest Run: ${run.name}`));
  console.log(`Key: ${run.runKey}  Status: ${statusColor(String(run.status || ""))}`);
  console.log(
    `Passed: ${chalk.green(String(metrics.passed ?? 0))}  ` +
      `Failed: ${chalk.red(String(metrics.failed ?? 0))}  ` +
      `Blocked: ${chalk.yellow(String(metrics.blocked ?? 0))}  ` +
      `Skipped: ${chalk.gray(String(metrics.skipped ?? 0))}  ` +
      `Untested: ${String(metrics.untested ?? 0)}  ` +
      `Total: ${String(metrics.total ?? 0)}`,
  );

  if (results.length > 0) {
    const table = new Table({
      head: ["Case", "Title", "Status", "Duration"],
      style: { head: ["cyan"] },
    });

    for (const r of results) {
      table.push([
        String(r.testCaseKey || ""),
        truncate(String(r.testCaseTitle || ""), 40),
        statusColor(String(r.status || "")),
        r.duration ? `${r.duration}ms` : "",
      ]);
    }

    console.log(table.toString());
  }
}

export function formatTestCaseDetail(
  tc: Record<string, unknown>,
  steps: Array<Record<string, unknown>>,
): void {
  console.log(chalk.bold(`\nTest Case: ${tc.caseKey}`));
  console.log(`Title: ${tc.title}`);
  console.log(
    `Status: ${statusColor(String(tc.status || ""))}  ` +
      `Priority: ${priorityColor(String(tc.priority || ""))}  ` +
      `Type: ${tc.type}`,
  );

  if (tc.description) {
    console.log(`\nDescription:\n${tc.description}`);
  }
  if (tc.preconditions) {
    console.log(`\nPreconditions:\n${tc.preconditions}`);
  }

  if (steps.length > 0) {
    console.log(chalk.bold("\nSteps:"));
    const table = new Table({
      head: ["#", "Action", "Expected Result"],
      style: { head: ["cyan"] },
    });

    for (const s of steps) {
      table.push([
        String(s.stepOrder || ""),
        truncate(String(s.action || ""), 50),
        truncate(String(s.expectedResult || ""), 50),
      ]);
    }

    console.log(table.toString());
  }
}

export function formatSharedStepsTable(
  steps: Array<Record<string, unknown>>,
): Table.Table {
  const table = new Table({
    head: ["ID", "Title", "Status", "Description", "Updated"],
    style: { head: ["cyan"] },
  });

  for (const s of steps) {
    table.push([
      truncate(String(s.id || ""), 8),
      truncate(String(s.title || ""), 40),
      statusColor(String(s.status || "")),
      truncate(String(s.description || ""), 30),
      s.updatedAt
        ? new Date(String(s.updatedAt)).toLocaleDateString()
        : "",
    ]);
  }

  return table;
}

export function formatSharedStepDetail(
  step: Record<string, unknown>,
  actions: Array<Record<string, unknown>>,
): void {
  console.log(chalk.bold(`\nShared Step: ${step.title}`));
  console.log(
    `ID: ${truncate(String(step.id || ""), 8)}  Status: ${statusColor(String(step.status || ""))}`,
  );

  if (step.description) {
    console.log(`\nDescription:\n${step.description}`);
  }

  if (actions.length > 0) {
    console.log(chalk.bold("\nActions:"));
    const table = new Table({
      head: ["#", "Action", "Data", "Expected Result"],
      style: { head: ["cyan"] },
    });

    for (const a of actions) {
      table.push([
        String(a.stepOrder ?? ""),
        truncate(String(a.action || ""), 40),
        truncate(String(a.data || ""), 25),
        truncate(String(a.expectedResult || ""), 30),
      ]);
    }

    console.log(table.toString());
  } else {
    console.log("\nNo actions defined.");
  }
}
