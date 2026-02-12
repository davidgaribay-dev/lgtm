# @lgtm/cli

Agent-friendly CLI for the LGTM test case management system. Designed for AI coding agents (Claude Code, Cursor, Cline, Aider) and developers to query test cases, manage test runs, submit results, and file defects from the command line.

Depends on `@lgtm/shared` for types, constants, and the `LgtmApiClient`.

## Commands

```bash
pnpm build            # Build with tsup (ESM, node18 target, shebang banner)
pnpm dev              # Watch mode
```

Or from repo root:

```bash
pnpm build:cli        # Build this package only
pnpm build:packages   # Build all packages in dependency order
```

## Structure

```
src/
├── index.ts              # Entry point: commander setup, global options, command registration
├── config.ts             # Config resolution (CLI flags > env vars > .lgtm.json > ~/.config/lgtm/config.json)
├── logger.ts             # Winston logger factory (TTY-aware: colored human format vs JSON)
├── output.ts             # Dual output: table formatters (human) + JSON (machine)
├── errors.ts             # CliError, AuthError, NotFoundError + handleError() with exit codes
├── helpers.ts            # resolveProjectId(), resolveEnvironmentId(), resolveCycleId(), flattenTestCases()
└── commands/
    ├── auth.ts           # lgtm auth configure | status
    ├── projects.ts       # lgtm projects list
    ├── test-cases.ts     # lgtm test-cases list | get <key>
    ├── test-runs.ts      # lgtm test-runs list | get <id> | create
    ├── test-results.ts   # lgtm test-results submit | bulk
    ├── defects.ts        # lgtm defects list | get <key> | create
    ├── environments.ts   # lgtm environments list
    ├── cycles.ts         # lgtm cycles list
    └── shared-steps.ts   # lgtm shared-steps list | get | create | update | delete
```

## CLI Usage

### Global Options

All commands accept these flags:

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (machine-readable) |
| `--verbose` | Enable verbose/debug logging |
| `--api-url <url>` | LGTM API URL (overrides config/env) |
| `--api-token <token>` | API token (overrides config/env) |
| `--project <key>` | Default project key (overrides config/env) |

### Command Reference

```bash
# Authentication
lgtm auth configure              # Interactive setup (saves to ~/.config/lgtm/config.json)
lgtm auth status                 # Show config sources and test connection

# Projects
lgtm projects list               # List all accessible projects

# Test Cases
lgtm test-cases list -p ENG      # List test cases (filters: --status, --priority, --type)
lgtm test-cases get ENG-42       # Get test case with steps by key

# Test Runs
lgtm test-runs list -p ENG       # List test runs (filter: --status)
lgtm test-runs get <id>          # Get run detail with results and metrics
lgtm test-runs create -p ENG -n "Run 1" --cases ENG-1,ENG-2,ENG-3

# Test Results
lgtm test-results submit --run <id> --case <id> -s passed
lgtm test-results bulk --run <id> -f results.json

# Defects
lgtm defects list -p ENG         # List defects (filters: --status, --severity)
lgtm defects get ENG-D-42        # Get defect by key
lgtm defects create -p ENG -t "Login broken" --severity critical

# Environments & Cycles
lgtm environments list -p ENG
lgtm cycles list -p ENG

# Shared Steps
lgtm shared-steps list -p ENG           # List shared steps (filter: --status)
lgtm shared-steps get <id>              # Get shared step with actions
lgtm shared-steps create -p ENG -t "Login flow"  # Create shared step
lgtm shared-steps update <id> -t "New title" -s archived  # Update fields
lgtm shared-steps delete <id>           # Delete shared step
```

## Configuration

Config resolution follows strict precedence:

1. CLI flags (`--api-url`, `--api-token`, `--project`)
2. Environment variables (`LGTM_API_URL`, `LGTM_API_TOKEN`, `LGTM_PROJECT_KEY`)
3. Project-local `.lgtm.json` in current working directory
4. User config `~/.config/lgtm/config.json` (or `$XDG_CONFIG_HOME/lgtm/config.json`)

Same environment variables as `@lgtm/playwright-reporter` for consistency.

### Config File Format

```json
{
  "apiUrl": "https://lgtm.example.com",
  "apiToken": "lgtm_v1_...",
  "defaultProject": "ENG"
}
```

## Output Modes

The CLI supports dual output:

- **Human-readable** (default when TTY): Colored tables via `cli-table3` + `chalk`, status messages via Winston logger
- **Machine-readable** (`--json`): Structured JSON to stdout, errors to stderr

Agents should use `--json` for reliable parsing.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Usage error (handled by commander) |
| 3 | Authentication error (missing/invalid token, permission denied) |
| 4 | Not found (project, test case, environment, cycle not found) |

## Error Handling

`handleError()` in `errors.ts` maps errors to exit codes:

- `CliError` subclasses (`AuthError`, `NotFoundError`) carry their own exit codes
- `LgtmApiError` from `@lgtm/shared` is mapped: 401/403 -> exit 3, 404 -> exit 4, other -> exit 1
- Connection failures (ECONNREFUSED, fetch failed) produce a helpful message suggesting `lgtm auth status`

## Key Resolution Helpers

`helpers.ts` resolves human-readable identifiers to UUIDs:

- `resolveProjectId(client, "ENG")` — finds project by key (case-insensitive), throws `NotFoundError` with available keys
- `resolveEnvironmentId(client, projectId, "staging")` — finds environment by name
- `resolveCycleId(client, projectId, "Sprint 1")` — finds cycle by name
- `flattenTestCases(data)` — extracts flat test case array from the tree-structured `/api/test-repo` response

## Dependencies

| Package | Purpose |
|---------|---------|
| `@lgtm/shared` | API client, types, constants |
| `commander` | CLI framework |
| `winston` | Logging (TTY-aware format selection) |
| `cli-table3` | Table rendering for human output |
| `chalk` | Colors for status/priority indicators |

## Build

Built with tsup. Outputs ESM to `dist/` with `#!/usr/bin/env node` shebang banner. Single entry point at `src/index.ts`. Target: `node18`. No declaration files (not a library).

## Adding New Commands

1. Create `src/commands/<resource>.ts` with a `registerXCommands(parent: Command)` function
2. Follow the existing pattern: resolve config, create client, call API, handle dual output
3. Register in `src/index.ts` via `registerXCommands(program)`
4. Use `resolveProjectId()` from `helpers.ts` for any project-scoped command
5. Throw `AuthError` for missing credentials, `NotFoundError` for missing resources
6. Use `as unknown as Array<Record<string, unknown>>` when passing typed API responses to table formatters
