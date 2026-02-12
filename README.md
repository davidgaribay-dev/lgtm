# LGTM

A test case management system designed for teams to organize, execute, and track test cases — with first-class support for AI coding agents and CI/CD automation.

## Monorepo Structure

This is a **pnpm workspace monorepo** with the following packages:

| Package | Path | Description |
|---------|------|-------------|
| `@lgtm/web` | `apps/web/` | Next.js 16 web application — test case management UI |
| `@lgtm/shared` | `packages/shared/` | Shared constants, TypeScript types, and API client |
| `@lgtm/cli` | `packages/cli/` | CLI tool for AI agents and developers |
| `@lgtm/playwright-reporter` | `packages/playwright-reporter/` | Playwright test reporter that uploads results to LGTM |

## Features

- **Test case management** — Create and organize test cases with steps, preconditions, priorities, and tags
- **Shared steps** — Reusable step sequences that can be inserted into multiple test cases; managed per-team in settings
- **Hierarchical organization** — Suites, sections (nested folders), and tags for flexible test structure
- **Test execution** — Plan test runs, record results (pass/fail/blocked/skip), track per-step outcomes
- **Defect tracking** — File and track bugs with severity, priority, and traceability to test cases/runs
- **Team collaboration** — Organizations with role-based access (owner, admin, member, viewer)
- **API tokens** — Fine-grained access tokens with resource-level permissions for programmatic access
- **CLI for agents** — `@lgtm/cli` lets AI coding agents query test cases, submit results, and file defects
- **Playwright integration** — `@lgtm/playwright-reporter` automatically uploads test results from Playwright runs
- **Share links** — Grant read-only access to external guests without requiring an account
- **File attachments** — Upload images, videos, and files to test cases, results, defects, and comments (pluggable storage: Vercel Blob or S3-compatible)
- **Structured logging** — Production-grade logging with Pino, client-to-server log aggregation, and sensitive data redaction

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** PostgreSQL via Drizzle ORM (NeonDB serverless in production, standard PostgreSQL for local dev)
- **Auth:** Better Auth (email/password + organization plugin for RBAC)
- **Storage:** Pluggable — Vercel Blob (production) or S3-compatible (SeaweedFS/MinIO for local dev)
- **Local dev:** Docker Compose with PostgreSQL 18 + SeaweedFS
- **Logging:** Pino logger with correlation IDs and automatic sensitive data redaction
- **Styling:** Tailwind CSS 4, shadcn/ui, Lucide icons
- **CLI:** Commander.js, Winston, cli-table3

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose (for local development)
- Or: a [Neon](https://neon.tech) PostgreSQL database + [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store (for cloud setup)

### Local Development (Docker)

The fastest way to get started — no cloud accounts needed.

1. Install dependencies:

```bash
pnpm install
```

2. Start PostgreSQL and SeaweedFS:

```bash
pnpm docker:up
```

3. Copy environment variables and configure for local dev:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Set these values in `.env.local`:

```bash
DEPLOYMENT_ENV=dev
DATABASE_URL=postgresql://lgtm:lgtm@localhost:5432/lgtm
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://localhost:8334
S3_REGION=us-east-1
S3_BUCKET=lgtm
S3_ACCESS_KEY_ID=lgtm_dev_access_key
S3_SECRET_ACCESS_KEY=lgtm_dev_secret_key
S3_PUBLIC_URL_BASE=http://localhost:3000/storage
```

4. Push the schema to your local database:

```bash
pnpm db:push
```

5. Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

### Cloud Setup (Vercel + NeonDB)

For production or if you prefer cloud services for development:

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables and fill in your values:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Required variables:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Random signing key (min 32 chars, generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — App base URL (e.g., `http://localhost:3000`)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token

Optional variables:
- `NEXT_PUBLIC_REGISTRATION_OPEN` — Set to `"false"` to disable public signup (only invited users can join)
- `RESEND_API_KEY` — Resend API key for invitation emails (falls back to console.log if not set)
- `EMAIL_FROM` — Sender address for emails (e.g., `"LGTM <noreply@yourdomain.com>"`)

3. Push the schema to your database:

```bash
pnpm db:push
```

4. Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Scripts

All commands run from the repo root via pnpm workspace proxying.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build all packages then the web app |
| `pnpm build:packages` | Build all packages in dependency order |
| `pnpm build:shared` | Build `@lgtm/shared` only |
| `pnpm build:cli` | Build `@lgtm/cli` only |
| `pnpm build:reporter` | Build `@lgtm/playwright-reporter` only |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate migration SQL from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly to DB (prototyping) |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |
| `pnpm docker:up` | Start local PostgreSQL + SeaweedFS |
| `pnpm docker:down` | Stop Docker services (data preserved) |
| `pnpm docker:reset` | Stop Docker services and delete all data |
| `pnpm docker:logs` | Tail logs from Docker services |

## CLI (`@lgtm/cli`)

The CLI provides a universal agent interface for AI coding agents and developers to interact with LGTM from the terminal.

### Quick Start

```bash
# Configure authentication
lgtm auth configure

# List projects
lgtm projects list

# List test cases for a project
lgtm test-cases list --project ENG --json

# Get a specific test case with steps
lgtm test-cases get ENG-42 --json

# Create a test run
lgtm test-runs create --project ENG --name "Sprint 5" --cases ENG-1,ENG-2,ENG-3

# Submit a test result
lgtm test-results submit --run <id> --case <id> --status passed

# File a defect
lgtm defects create --project ENG --title "Login page broken" --severity critical

# Manage shared steps
lgtm shared-steps list --project ENG
lgtm shared-steps get <id> --json
lgtm shared-steps create --project ENG --title "Login flow"
```

### Configuration

The CLI resolves configuration in this order:
1. CLI flags (`--api-url`, `--api-token`, `--project`)
2. Environment variables (`LGTM_API_URL`, `LGTM_API_TOKEN`, `LGTM_PROJECT_KEY`)
3. Project-local `.lgtm.json`
4. User config `~/.config/lgtm/config.json`

Use `--json` for machine-readable output (recommended for agents).

See [`packages/cli/CLAUDE.md`](packages/cli/CLAUDE.md) for full command reference.

## Playwright Reporter (`@lgtm/playwright-reporter`)

Automatically uploads Playwright test results to LGTM.

```typescript
// playwright.config.ts
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

See [`packages/playwright-reporter/CLAUDE.md`](packages/playwright-reporter/CLAUDE.md) for full configuration options.

## Logging

LGTM uses [Pino](https://getpino.io) for production-grade structured logging with automatic sensitive data redaction.

### Features

- **Server-side logging** — Structured JSON logs with correlation IDs for distributed tracing
- **Client-side logging** — Browser logs automatically batched and sent to server
- **Sensitive data protection** — Passwords, tokens, emails, and PII automatically redacted
- **Error boundaries** — React errors automatically captured and logged
- **Environment-aware** — Pretty-printed in development, structured JSON in production

### Server-Side Usage

```typescript
import { logger, logInfo, logError } from '@/lib/logger';

// Simple logging
logInfo('User action completed', { userId: '123', action: 'create_team' });
logError('Database operation failed', error, { query: 'INSERT...' });

// API route with correlation ID
const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
const apiLogger = logger.child({ correlationId });
apiLogger.info({ userId: session.user.id }, 'Processing request');
```

### Client-Side Usage

```typescript
import { logClientInfo, logClientError } from '@/lib/client-logger';

logClientInfo('User interaction', { feature: 'test-case-export' });
logClientError('API call failed', error, { endpoint: '/api/teams' });
```

### Viewing Logs

- **Development:** Pretty-printed to console with colors
- **Production (Vercel):** `vercel logs <project>` or Vercel dashboard
- **Production (VPS):** `tail -f /var/log/lgtm/app.log` (if `LOG_TO_FILE=true`)

### Log Levels

Set via `LOG_LEVEL` environment variable:
- `debug` — Detailed debugging information (default in development)
- `info` — General informational messages (default in production)
- `warn` — Warning messages for potentially harmful situations
- `error` — Error events that might still allow the application to continue

For more details, see [CLAUDE.md](./CLAUDE.md#logging).
