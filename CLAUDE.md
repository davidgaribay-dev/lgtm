# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint (v9 flat config)
npm run db:generate      # Generate Drizzle migration SQL from schema changes
npm run db:migrate       # Apply pending migrations to the database
npm run db:push          # Push schema directly to DB (prototyping only)
npm run db:studio        # Browser UI for browsing/editing DB data
```

## Architecture

Next.js 16 app using App Router, React 19, TypeScript (strict), Tailwind CSS 4, and shadcn/ui (new-york style).

### Data layer

- **Database:** Neon serverless PostgreSQL, connected via `drizzle-orm/neon-http` (stateless HTTP per query)
- **ORM:** Drizzle ORM — schema defined in TypeScript at `db/schema.ts`, client exported from `db/index.ts`
- **Migrations:** Drizzle Kit reads `drizzle.config.ts`, outputs SQL to `drizzle/`
- **Path alias:** `@/db` resolves to `db/` (tsconfig `@/*` → `./*`)

### Auth

- **Better Auth** with email/password enabled, configured in `lib/auth.ts`
- Drizzle adapter connects auth to the same `db` instance
- API handler: `app/api/auth/[...all]/route.ts` — single catch-all for all auth endpoints
- Client-side: `lib/auth-client.ts` exports `authClient` with `useSession`, `signIn`, `signUp`, etc.
- Server-side session: `auth.api.getSession({ headers: await headers() })`
- Session cookie caching enabled (5 min) to reduce DB round-trips over Neon HTTP
- Password reset via Resend is stubbed out in `lib/auth.ts` (commented), ready to enable
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

### Schema

Better Auth owns four tables (`user`, `session`, `account`, `verification`) with text IDs. Application tables (e.g., `todos`) reference `user.id` as text foreign keys. The `user.image` field stores Vercel Blob URLs for profile images.

### File uploads

- **Vercel Blob** for image/attachment storage
- Upload route: `app/api/upload/route.ts` — authenticates via Better Auth session, restricts to image types (jpeg/png/webp/gif), 5MB max
- Client uploads use `upload()` from `@vercel/blob/client` with `handleUploadUrl: "/api/upload"`
- Pass `clientPayload: JSON.stringify({ context: "profile-image" })` to auto-update `user.image` on upload completion
- Required env var: `BLOB_READ_WRITE_TOKEN`

### UI

- Tailwind CSS 4 via PostCSS, theme defined with OKLCH CSS variables in `app/globals.css`
- shadcn/ui components in `components/ui/`, add new ones with `npx shadcn add <component>`
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) for className composition
- Dark mode support via `next-themes` and `.dark` class variant
- Icons: `lucide-react`

## Environment Variables

All in `.env.local` (gitignored via `.env*` pattern):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — signing key (min 32 chars)
- `BETTER_AUTH_URL` — app base URL
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token
- `RESEND_API_KEY`, `EMAIL_FROM` — for password reset emails (when enabled)
