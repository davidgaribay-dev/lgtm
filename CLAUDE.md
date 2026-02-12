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
- **CLI tool**: `packages/cli/`
- **Playwright reporter**: `packages/playwright-reporter/` (has its own `CLAUDE.md`)
- **DB schema**: `apps/web/db/schema.ts`
- **DB migrations**: `apps/web/drizzle/`
- **API routes**: `apps/web/app/api/`
- **UI components**: `apps/web/components/`
- **Shared lib**: `apps/web/lib/`
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
