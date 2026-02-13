# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a **pnpm workspace monorepo**. Package manager is pnpm (v9).

```
.
├── apps/
│   └── web/                    # Next.js web application (@lgtm/web)
├── packages/
│   ├── shared/                 # Shared types, constants, API client (@lgtm/shared)
│   ├── cli/                    # CLI tool for agents and developers (@lgtm/cli)
│   └── playwright-reporter/    # Playwright test reporter (@lgtm/playwright-reporter)
├── docker/                     # Docker config files (SeaweedFS S3 identity)
├── docker-compose.yml          # Local dev: PostgreSQL 18 + SeaweedFS
├── pnpm-workspace.yaml
├── .npmrc
└── package.json                # Root workspace config
```

## Commands

All commands can be run from the **repo root** — they proxy into the appropriate workspace package.

```bash
pnpm dev              # Next.js dev server at localhost:3000
pnpm build            # Build all packages then the web app
pnpm build:packages   # Build all packages in packages/ (dependency order)
pnpm build:shared     # Build @lgtm/shared only
pnpm build:reporter   # Build @lgtm/playwright-reporter only
pnpm build:cli        # Build @lgtm/cli only
pnpm lint             # ESLint (v9 flat config)
pnpm db:generate      # Generate Drizzle migration SQL from schema changes
pnpm db:migrate       # Apply pending migrations to the database
pnpm db:push          # Push schema directly to DB (prototyping only)
pnpm db:studio        # Browser UI for browsing/editing DB data
pnpm db:seed          # Seed DB with demo data (requires NEXT_PUBLIC_IS_DEMO=true)
pnpm docker:up        # Start local PostgreSQL + SeaweedFS (Docker Compose)
pnpm docker:down      # Stop Docker services (data preserved)
pnpm docker:reset     # Stop Docker services and delete all data (volumes)
pnpm docker:logs      # Tail logs from Docker services
```

To target a specific workspace directly:

```bash
pnpm --filter @lgtm/web dev
pnpm --filter @lgtm/web build
```

To install a dependency into a specific workspace:

```bash
pnpm --filter @lgtm/web add <package>
pnpm --filter @lgtm/web add -D <package>
```

To install a root-level dev dependency (workspace tooling):

```bash
pnpm add -w -D <package>
```

## Workspace Packages

| Package | Path | Description |
|---------|------|-------------|
| `@lgtm/web` | `apps/web/` | Next.js 16 web application — test case management system |
| `@lgtm/shared` | `packages/shared/` | Shared constants, TypeScript types, and API client |
| `@lgtm/cli` | `packages/cli/` | CLI tool for AI agents and developers (`npx @lgtm/cli` or `lgtm`) |
| `@lgtm/playwright-reporter` | `packages/playwright-reporter/` | Custom Playwright reporter that uploads results to LGTM API |

## Key Paths

- **Web app source**: `apps/web/` (has its own `CLAUDE.md` with detailed architecture docs)
- **Shared package**: `packages/shared/` (has its own `CLAUDE.md`)
- **CLI tool**: `packages/cli/` (has its own `CLAUDE.md`)
- **Playwright reporter**: `packages/playwright-reporter/` (has its own `CLAUDE.md`)
- **DB schema**: `apps/web/db/schema.ts`
- **DB migrations**: `apps/web/drizzle/`
- **API routes**: `apps/web/app/api/`
- **UI components**: `apps/web/components/`
- **Shared lib**: `apps/web/lib/`
- **Storage abstraction**: `apps/web/lib/storage/` (pluggable backend: Vercel Blob or S3-compatible)
- **Demo seed data**: `apps/web/lib/demo-seed-data/` (modular seed data for demo mode)
- **Demo seed script**: `apps/web/scripts/seed.ts` (standalone `pnpm db:seed` entry point)
- **Cron reset endpoint**: `apps/web/app/api/cron/reset/route.ts` (Vercel Cron wipes + re-seeds every 30 min)
- **Cron config**: `vercel.json` (repo root — schedules `/api/cron/reset` every 30 min)
- **Environment variables**: `apps/web/.env.local` (copy from `apps/web/.env.local.example`)

## Package Dependencies

```
@lgtm/web ──depends──▶ @lgtm/shared
@lgtm/cli ──depends──▶ @lgtm/shared
@lgtm/playwright-reporter ──depends──▶ @lgtm/shared
                                       @playwright/test (peer)
```

Packages must be built before the web app: `pnpm build:packages` then `pnpm --filter @lgtm/web build`, or just `pnpm build` (which does both in order).

## Adding New Packages

1. Create directory under `packages/` (e.g., `packages/shared`)
2. Add a `package.json` with name `@lgtm/<name>`
3. The `pnpm-workspace.yaml` already includes `packages/*`
4. Reference from other packages: `"@lgtm/<name>": "workspace:*"` in dependencies

## Adding New Apps

1. Create directory under `apps/` (e.g., `apps/api`)
2. Add a `package.json` with name `@lgtm/<name>`
3. The `pnpm-workspace.yaml` already includes `apps/*`
4. Add proxy scripts to root `package.json` if needed

## Deployment Environments

The `DEPLOYMENT_ENV` variable controls which infrastructure adapters the app uses:

| `DEPLOYMENT_ENV` | Database | Storage | Use case |
|---|---|---|---|
| `dev` | PostgreSQL via `node-postgres` (standard TCP) | S3-compatible (SeaweedFS) | Local development with Docker |
| unset / `prod` | NeonDB via `drizzle-orm/neon-http` (serverless HTTP) | Vercel Blob | Production on Vercel |

The conditional driver logic lives in `apps/web/db/index.ts`. Both drivers return a compatible `PgDatabase` instance — all query code works unchanged.

### Local Development (Docker Compose)

The repo includes a `docker-compose.yml` with **PostgreSQL 18** and **SeaweedFS** (S3-compatible storage):

```bash
# 1. Start infrastructure
pnpm docker:up

# 2. Set env vars in apps/web/.env.local:
#    DEPLOYMENT_ENV=dev
#    DATABASE_URL=postgresql://lgtm:lgtm@localhost:5432/lgtm
#    STORAGE_PROVIDER=s3
#    S3_ENDPOINT=http://localhost:8334
#    S3_REGION=us-east-1
#    S3_BUCKET=lgtm
#    S3_ACCESS_KEY_ID=lgtm_dev_access_key
#    S3_SECRET_ACCESS_KEY=lgtm_dev_secret_key
#    S3_PUBLIC_URL_BASE=http://localhost:3000/storage

# 3. Push schema to local DB
pnpm db:push

# 4. Start dev server
pnpm dev
```

**Docker services:**
- `postgres` — PostgreSQL 18 on port 5432 (user/pass/db: `lgtm`)
- `seaweedfs` — S3 API on host port 8334 (container 8333), master on host port 9334 (container 9333)
- `seaweedfs-init` — one-shot container that creates the `lgtm` bucket on startup

**SeaweedFS S3 config** (`docker/seaweedfs/s3.json`):
- `lgtm_admin` identity with full access (access key: `lgtm_dev_access_key`)
- `anonymous` identity with read-only access (allows browsers to load uploaded images)

**Storage proxy:** In dev mode, `next.config.ts` adds a rewrite that proxies `/storage/*` to SeaweedFS. This means `S3_PUBLIC_URL_BASE` should be set to `http://localhost:3000/storage` so uploaded files are served through Next.js (same-origin), avoiding CORS and port-forwarding issues for remote dev environments.

**Reset everything:** `pnpm docker:reset` stops containers and destroys all volumes (DB data + uploaded files).

## Demo Mode

LGTM supports a demo mode for hosting a public demo instance. Controlled by environment variables:

- `NEXT_PUBLIC_IS_DEMO=true` — Shows an amber banner with credentials on every page, auto-fills the login form with `demo@lgtm.dev` / `demodemo1234`, makes credential fields read-only
- `CRON_SECRET` — Protects the `GET /api/cron/reset` endpoint (Vercel Cron sends `Authorization: Bearer <secret>`)

### Demo Seed Data

`pnpm db:seed` resets the database and populates it with realistic demo data. Only runs when `NEXT_PUBLIC_IS_DEMO=true`. Creates:

- 10 users (all share password `demodemo1234`) with varied org/team roles
- 3 teams: Web Platform (WEB), Mobile App (MOB), API Services (API)
- 60 test cases with steps, nested suites/sections, tags, shared steps
- 8 test runs with results and per-step verdicts
- 12 defects with traceability
- Threaded comments with reactions and @mentions
- Environments, cycles, workspace cycles, test plans

### Seed Architecture

The seed data lives in `apps/web/lib/demo-seed-data/` as a modular directory:

| File | Contents |
|------|----------|
| `helpers.ts` | Shared types (`SeedDb`), helpers (`uid()`, `daysAgo()`) |
| `users.ts` | 10 users, accounts, organization, org members |
| `teams.ts` | 3 projects, project members, environments, cycles |
| `test-cases.ts` | Suites, sections, test cases, steps, tags, shared steps |
| `test-runs.ts` | Test plans, runs, results, step results |
| `defects.ts` | Defect records linked to test results |
| `comments.ts` | Threaded comments, reactions, @mentions |
| `index.ts` | `seedAllData(db)` orchestrator — inserts in FK-safe order |

Two entry points use this shared module:
- `apps/web/scripts/seed.ts` — standalone script (`pnpm db:seed`), creates own DB connection
- `apps/web/lib/demo-seed.ts` — `resetAndSeed()` used by the cron endpoint, uses the app's DB instance

### Cron Reset

`vercel.json` at the repo root configures a Vercel Cron job that calls `GET /api/cron/reset` every 30 minutes. The endpoint verifies the `CRON_SECRET` header, truncates all tables via `drizzle-seed`'s `reset()`, then calls `seedAllData()` to re-populate.
