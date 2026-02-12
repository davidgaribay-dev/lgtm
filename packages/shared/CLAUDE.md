# @lgtm/shared

Shared constants, TypeScript types, and API client for the LGTM ecosystem. Used by `@lgtm/web` (API route validation), `@lgtm/cli` (CLI tool), and `@lgtm/playwright-reporter` (Playwright integration).

## Commands

```bash
pnpm build            # Build with tsup (ESM + CJS + DTS)
pnpm dev              # Watch mode
```

Or from repo root:

```bash
pnpm build:shared     # Build this package only
pnpm build:packages   # Build all packages in dependency order
```

## Structure

```
src/
├── index.ts              # Root re-exports everything
├── constants/
│   ├── index.ts          # Re-exports all constants + union types
│   ├── test-case.ts      # priorities, types, severities, automationStatuses, statuses, behaviors, layers
│   ├── test-run.ts       # run statuses
│   ├── test-result.ts    # result statuses
│   ├── defect.ts         # defect statuses, resolutions, severities, priorities, types
│   ├── environment.ts    # environment types
│   ├── cycle.ts          # cycle statuses
│   ├── test-plan.ts      # test plan statuses
│   └── team.ts           # team roles, org roles
├── types/
│   ├── index.ts          # Re-exports all types
│   ├── common.ts         # AuditFields, ApiError, BulkSubmitResultsResponse
│   ├── project.ts        # Project
│   ├── test-case.ts      # TestCase, CreateTestCaseRequest, UpdateTestCaseRequest
│   ├── test-run.ts       # TestRun, TestRunDetail, CreateTestRunRequest, etc.
│   ├── test-result.ts    # TestResult, BulkResultEntry, BulkSubmitResultsRequest
│   ├── test-step.ts      # TestStep, TestStepResult, BulkUpsertStepResultsRequest
│   ├── defect.ts         # Defect, CreateDefectRequest
│   ├── environment.ts    # Environment, CreateEnvironmentRequest
│   ├── cycle.ts          # Cycle, WorkspaceCycle
│   └── log.ts            # TestRunLog, AppendLogRequest
└── api-client/
    ├── index.ts          # LgtmApiClient class
    └── errors.ts         # LgtmApiError class
```

## Constants Pattern

Each constant file exports an `as const` array and a derived union type:

```typescript
export const TEST_CASE_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TestCasePriority = (typeof TEST_CASE_PRIORITIES)[number];
```

This pattern gives both runtime arrays (for validation) and compile-time types. All constants are re-exported from the package root:

```typescript
import { TEST_CASE_PRIORITIES, type TestCasePriority } from "@lgtm/shared";
```

### Available Constants

| Export | Values |
|--------|--------|
| `TEST_CASE_PRIORITIES` | low, medium, high, critical |
| `TEST_CASE_TYPES` | functional, smoke, regression, security, usability, performance, acceptance, compatibility, integration, exploratory, other |
| `TEST_CASE_SEVERITIES` | blocker, critical, major, normal, minor, trivial |
| `TEST_CASE_AUTOMATION_STATUSES` | manual, automated, to_be_automated |
| `TEST_CASE_STATUSES` | active, draft, deprecated, review |
| `TEST_CASE_BEHAVIORS` | positive, negative, destructive |
| `TEST_CASE_LAYERS` | e2e, api, unit |
| `TEST_RUN_STATUSES` | pending, in_progress, passed, failed, blocked |
| `TEST_RESULT_STATUSES` | untested, passed, failed, blocked, skipped |
| `DEFECT_STATUSES` | open, in_progress, fixed, verified, closed, reopened, deferred, rejected, duplicate |
| `DEFECT_RESOLUTIONS` | fixed, wont_fix, duplicate, cannot_reproduce, by_design, deferred |
| `DEFECT_SEVERITIES` | blocker, critical, major, normal, minor, trivial |
| `DEFECT_PRIORITIES` | critical, high, medium, low |
| `DEFECT_TYPES` | functional, ui, performance, security, crash, data, other |
| `ENVIRONMENT_TYPES` | development, staging, qa, production, custom |
| `CYCLE_STATUSES` | planned, active, completed |
| `TEST_PLAN_STATUSES` | draft, active, completed, archived |
| `TEAM_ROLES` | team_owner, team_admin, team_member, team_viewer |
| `ORG_ROLES` | owner, admin, member, viewer |

## Types

Interface types match the LGTM API request/response shapes. Import from the package root:

```typescript
import type { TestRun, CreateTestRunRequest, TestCase } from "@lgtm/shared";
```

## API Client

`LgtmApiClient` is a typed HTTP client for the LGTM API, used by `@lgtm/cli` and `@lgtm/playwright-reporter`.

```typescript
import { LgtmApiClient } from "@lgtm/shared";

const client = new LgtmApiClient({
  baseUrl: "https://lgtm.example.com",
  apiToken: "lgtm_v1_...",
});

const teams = await client.getTeams();
const run = await client.createTestRun({ name: "Run 1", projectId: "...", testCaseIds: [...] });
await client.submitResults(run.id, { results: [...] });
```

### Available Methods

| Method | Description |
|--------|-------------|
| `getTeams()` | List all accessible projects/teams |
| `getTestCases(projectId)` | List test cases (tree data) for a project |
| `getTestCaseByKey(projectId, caseKey)` | Get a test case by human-readable key (e.g., "ENG-42") with steps |
| `createTestCase(data)` | Create a new test case |
| `updateTestCase(id, data)` | Update a test case |
| `getTestRuns(projectId)` | List test runs for a project |
| `createTestRun(data)` | Create a new test run |
| `getTestRun(id)` | Get test run details |
| `updateTestRun(id, data)` | Update test run status/metadata |
| `submitResults(runId, data)` | Bulk submit test results |
| `appendRunLog(runId, data)` | Append log chunk to a test run |
| `appendResultLog(resultId, data)` | Append log chunk to a test result |
| `getDefects(projectId)` | List defects for a project |
| `getDefectByKey(defectKey)` | Get a defect by human-readable key (e.g., "ENG-D-42") |
| `createDefect(data)` | Create a defect |
| `getEnvironments(projectId)` | List environments for a project |
| `getCycles(projectId)` | List cycles for a project |

All methods throw `LgtmApiError` on failure, which includes `statusCode` and `responseBody`.

## Build

Built with tsup. Outputs ESM (`.js`), CJS (`.cjs`), and declaration files (`.d.ts`) to `dist/`. Single entry point at `src/index.ts`.
