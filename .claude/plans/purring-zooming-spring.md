# Plan: Docker Compose Dev Environment + DEPLOYMENT_ENV

## Context

The app currently requires cloud services for local development: NeonDB (PostgreSQL via HTTP) and Vercel Blob (storage). This plan adds a Docker Compose setup with PostgreSQL 18 and SeaweedFS so developers can run `pnpm dev` fully locally. A `DEPLOYMENT_ENV` variable switches between local (`dev`) and cloud (`prod`) infrastructure.

**Current state:**
- `apps/web/db/index.ts` hardcodes `drizzle-orm/neon-http` — only works with NeonDB's HTTP proxy
- `apps/web/lib/storage/` already supports S3 backend via `STORAGE_PROVIDER=s3` (with `forcePathStyle: true` for SeaweedFS)
- CSP in `apps/web/middleware.ts` only allows `https://*.public.blob.vercel-storage.com` for images
- No Docker Compose exists

---

## Files to Create

### 1. `docker-compose.yml` (repo root)

PostgreSQL 18 + SeaweedFS all-in-one + bucket init container:

- **postgres**: `postgres:18-alpine`, user/pass/db = `lgtm`, port 5432, healthcheck via `pg_isready`
  - Volume: `pgdata:/var/lib/postgresql` (PG 18 changed PGDATA to `/var/lib/postgresql/18/docker`)
- **seaweedfs**: `chrislusf/seaweedfs:latest`, all-in-one server mode (`-s3 -filer`)
  - S3 API on port 8333, master on 9333
  - `-s3.config` for credentials, `-s3.allowedOrigins=http://localhost:3000` for CORS
  - Volume: `seaweedfs_data:/data`, bind-mount `docker/seaweedfs/s3.json`
- **seaweedfs-init**: One-shot container that creates the `lgtm` bucket via `weed shell` after SeaweedFS is healthy

### 2. `docker/seaweedfs/s3.json`

SeaweedFS S3 identity config:
- `lgtm_admin` identity with full access (accessKey: `lgtm_dev_access_key`, secretKey: `lgtm_dev_secret_key`)
- `anonymous` identity with `Read` access — allows browsers to load images without auth (matches Vercel Blob public behavior)

---

## Files to Modify

### 3. `apps/web/db/index.ts` — Conditional DB driver

Replace hardcoded `neon-http` import with conditional `require()` based on `DEPLOYMENT_ENV`:

```typescript
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL!;

  if (process.env.DEPLOYMENT_ENV === "dev") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/node-postgres");
    return drizzle(url, { schema });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/neon-http");
  return drizzle(url, { schema });
}

export const db: PgDatabase<PgQueryResultHKT, typeof schema> = createDb();
```

This follows the existing `require()` pattern from `lib/storage/index.ts:14-21`. Both drivers accept a connection URL string and return compatible `PgDatabase` subclasses. The export remains synchronous.

### 4. `apps/web/middleware.ts` — Dynamic CSP

Replace the hardcoded CSP block (lines 97-109) with dynamic `img-src` that includes `S3_PUBLIC_URL_BASE` origin when set:

```typescript
const imgSources = ["'self'", "blob:", "data:", "https://*.public.blob.vercel-storage.com"];
const s3PublicUrl = process.env.S3_PUBLIC_URL_BASE;
if (s3PublicUrl) {
  try {
    imgSources.push(new URL(s3PublicUrl).origin);
  } catch { /* invalid URL — skip */ }
}

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSources.join(" ")}`,
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");
```

In dev: `S3_PUBLIC_URL_BASE=http://localhost:8333/lgtm` → adds `http://localhost:8333` to `img-src`.
In prod: `S3_PUBLIC_URL_BASE` unset → no change from current behavior.

### 5. `apps/web/package.json` — Add `pg` dependency

- Add `pg` to dependencies (peer dep for `drizzle-orm/node-postgres`)
- Add `@types/pg` to devDependencies

### 6. `apps/web/.env.local.example` — Document new env vars

Add `DEPLOYMENT_ENV` documentation and a commented-out local dev config block:

```bash
# DEPLOYMENT_ENV=dev         # "dev" = local Docker, unset/prod = Vercel+NeonDB
# DATABASE_URL=postgresql://lgtm:lgtm@localhost:5432/lgtm
# STORAGE_PROVIDER=s3
# S3_ENDPOINT=http://localhost:8333
# S3_REGION=us-east-1
# S3_BUCKET=lgtm
# S3_ACCESS_KEY_ID=lgtm_dev_access_key
# S3_SECRET_ACCESS_KEY=lgtm_dev_secret_key
# S3_PUBLIC_URL_BASE=http://localhost:8333/lgtm
```

### 7. Root `package.json` — Docker convenience scripts

Add: `docker:up`, `docker:down`, `docker:reset`, `docker:logs`

---

## What Does NOT Change

- `drizzle.config.ts` — Drizzle Kit uses its own internal driver, works with both NeonDB and local PG
- `lib/storage/index.ts` — Already supports S3 via `STORAGE_PROVIDER=s3`
- `lib/storage/adapters/s3.ts` — Already uses `forcePathStyle: true` for SeaweedFS
- `next.config.ts` — App uses raw `<img>` tags, no `remotePatterns` needed
- All query files, API routes, auth — import `db` from `@/db` unchanged

---

## Implementation Order

1. Create `docker/seaweedfs/s3.json`
2. Create `docker-compose.yml`
3. Add `pg` + `@types/pg` dependencies
4. Modify `apps/web/db/index.ts` (conditional driver)
5. Modify `apps/web/middleware.ts` (dynamic CSP)
6. Update `apps/web/.env.local.example`
7. Add Docker scripts to root `package.json`
8. Build and verify (`pnpm build`)

## Verification

1. `pnpm docker:up` — PostgreSQL + SeaweedFS start, bucket created
2. Set `DEPLOYMENT_ENV=dev` + local env vars in `.env.local`
3. `pnpm db:push` — schema applied to local PostgreSQL
4. `pnpm dev` — app starts, connects to local DB
5. Upload a file — stored in SeaweedFS, image loads in browser (no CSP violations)
6. Unset `DEPLOYMENT_ENV`, restore NeonDB URL — `pnpm build` succeeds (no regression)
