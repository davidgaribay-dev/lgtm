# @lgtm/playwright-reporter

Custom Playwright reporter that uploads test results to the LGTM test case management API. Modeled after [Qase Playwright reporter](https://github.com/qase-tms/qase-javascript/tree/main/qase-playwright).

Depends on `@lgtm/shared` for types, constants, and the API client. See also `@lgtm/cli` for a standalone CLI tool that uses the same API client and environment variables.

## Commands

```bash
pnpm build            # Build with tsup (ESM + CJS + DTS)
pnpm dev              # Watch mode
```

Or from repo root:

```bash
pnpm build:reporter   # Build this package only
pnpm build:packages   # Build all packages in dependency order
```

## Structure

```
src/
├── index.ts          # Exports: default=LgtmReporter, lgtm(), config types
├── reporter.ts       # LgtmReporter class (implements Playwright Reporter interface)
├── config.ts         # LgtmReporterConfig type + resolveConfig() with env var fallbacks
├── mapper.ts         # Playwright → LGTM status mapping, title building, error formatting, metadata extraction
├── lgtm.ts           # lgtm() test annotation helper (embeds metadata as attachment)
└── logger.ts         # Console logger with [lgtm] prefix and debug mode
```

## Usage

### Basic Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["@lgtm/playwright-reporter", {
      apiUrl: "https://lgtm.example.com",
      apiToken: process.env.LGTM_API_TOKEN,
      projectKey: "ENG",
    }],
  ],
});
```

### Configuration Options

| Option | Required | Default | Env Var | Description |
|--------|----------|---------|---------|-------------|
| `apiUrl` | Yes | — | `LGTM_API_URL` | LGTM API base URL |
| `apiToken` | Yes | — | `LGTM_API_TOKEN` | API token (`lgtm_v1_...`) |
| `projectKey` | Yes | — | `LGTM_PROJECT_KEY` | Team key (e.g., "ENG") |
| `environment` | No | — | — | Environment name to match |
| `cycle` | No | — | — | Cycle name to match |
| `runName` | No | `"Playwright Run <timestamp>"` | — | Custom test run name |
| `autoCreateTestCases` | No | `true` | — | Auto-create cases for unmatched tests |
| `autoCreateDefects` | No | `false` | — | Create defects for failures |
| `uploadLogs` | No | `true` | — | Upload stdout/stderr as run logs |
| `debug` | No | `false` | `LGTM_DEBUG` | Verbose debug logging |

### The `lgtm()` Helper

Explicitly link a Playwright test to an LGTM test case:

```typescript
import { test } from "@playwright/test";
import { lgtm } from "@lgtm/playwright-reporter";

// By case key:
test(lgtm("ENG-42", "Login with valid credentials"), async ({ page }) => {
  // ...
});

// By numeric ID:
test(lgtm(42, "Login test"), async ({ page }) => {
  // ...
});
```

The helper embeds metadata as a Playwright attachment with content type `application/lgtm.metadata+json`, which the reporter reads in `onTestEnd`.

## Reporter Lifecycle

```
Constructor(config)
  → validate config, create API client

onBegin(config, suite)
  → resolve project by key (GET /api/teams)
  → resolve environmentId by name (GET /api/environments)
  → resolve cycleId by name (GET /api/cycles)
  → map Playwright tests → LGTM test cases (3-tier matching)
  → create test run (POST /api/test-runs)
  → set run status to in_progress

onTestEnd(test, result)
  → check for lgtm() metadata attachment
  → map Playwright status → LGTM status
  → queue result for batch submission
  → buffer stdout/stderr for log upload

onStdOut/onStdErr(chunk, test)
  → buffer output per test

onEnd(result)
  → flush results in batches of 50 (POST /api/test-runs/:id/results)
  → upload logs (chunked to 60KB, POST /api/test-runs/:id/logs)
  → create defects for failures if enabled (POST /api/defects)
  → update run status (PATCH /api/test-runs/:id)
  → print summary
```

## Test Case Matching Strategy

Three-tier approach (highest to lowest priority):

1. **Tags**: Playwright tags matching `@LETTERS-DIGITS` (e.g., `@ENG-42`) are matched against LGTM case keys
2. **Title**: Test title path matched against existing LGTM test case titles (case-insensitive)
3. **Auto-create**: If `autoCreateTestCases` is `true`, creates a new case with type=functional, automationStatus=automated, layer=e2e, status=active

The `lgtm()` helper provides a runtime override in `onTestEnd` via metadata attachments.

## Status Mapping

### Test Result (Playwright → LGTM)

| Playwright | LGTM |
|------------|------|
| `passed` | `passed` |
| `failed` | `failed` |
| `timedOut` | `failed` |
| `skipped` | `skipped` |
| `interrupted` | `blocked` |

### Run Status (Playwright → LGTM)

| Playwright | LGTM |
|------------|------|
| `passed` | `passed` |
| `failed` | `failed` |
| `timedout` | `failed` |
| `interrupted` | `blocked` |

## Build

Built with tsup. Outputs ESM (`.js`), CJS (`.cjs`), and declaration files (`.d.ts`) to `dist/`. `@playwright/test` is externalized (peer dependency).
