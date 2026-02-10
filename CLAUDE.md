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

Next.js 16 app using App Router, React 19, TypeScript (strict), Tailwind CSS 4, and shadcn/ui (new-york style). The app is a **test case management system** (similar to TestRail/Zephyr) with team-based RBAC. No test framework is configured yet.

### Route structure

- `app/(auth)/` — public auth pages (login, signup, forgot-password, reset-password) and invitation acceptance (`invite/[id]`) with centered card layout
- `app/(app)/` — protected pages (dashboard, settings, future project/test screens) with collapsible sidebar; layout checks session, redirects unauthenticated users, and guards against incomplete onboarding
- `app/onboarding/` — onboarding flow for new users (workspace creation, team invitations); requires auth, redirects to dashboard when complete
- `app/api/auth/[...all]/route.ts` — Better Auth catch-all
- `app/api/upload/route.ts` — Vercel Blob upload endpoint
- `app/api/check-slug/route.ts` — Organization slug uniqueness check
- `app/api/onboarding/advance/route.ts` — Advances onboarding step and clears session cache

**Server/Client split:** `page.tsx` files are server components that fetch data; interactive parts live in separate `"use client"` files (e.g. `login-form.tsx`, `dashboard-content.tsx`, `workspace-form.tsx`).

**Middleware** (`middleware.ts`): redirects authenticated users away from auth pages → `/dashboard`, unauthenticated users away from protected pages (`/dashboard`, `/settings`, `/onboarding`) → `/login`, and blocks signup when registration is closed.

### Naming conventions

- Component files: kebab-case (`app-sidebar.tsx`, `login-form.tsx`)
- DB columns: snake_case for app tables, camelCase for Better Auth-owned tables
- Path alias: `@/*` resolves to project root (e.g. `@/db`, `@/lib/auth`)

### Data layer

- **Database:** Neon serverless PostgreSQL, connected via `drizzle-orm/neon-http` (stateless HTTP per query)
- **ORM:** Drizzle ORM — schema in `db/schema.ts`, reusable column helpers in `db/columns.ts`, client exported from `db/index.ts`
- **Migrations:** Drizzle Kit reads `drizzle.config.ts`, outputs SQL to `drizzle/`. Workflow after editing `db/schema.ts`: run `npm run db:generate` then `npm run db:migrate` (or `npm run db:push` for quick prototyping)
- **IDs:** All tables use text primary keys (UUID via `crypto.randomUUID()`)
- **Soft delete:** All application tables have `deleted_at`/`deleted_by` columns; always filter with `WHERE deleted_at IS NULL`
- **Audit fields:** All application tables spread `auditFields` from `db/columns.ts` (created_at, created_by, updated_at, updated_by, deleted_at, deleted_by). Junction/result tables use lighter `timestamps` (created_at, updated_at only)
- **Path alias:** `@/db` resolves to `db/` (tsconfig `@/*` → `./*`)

### Auth

- **Better Auth** with email/password enabled, configured in `lib/auth.ts`
- Drizzle adapter connects auth to the same `db` instance
- API handler: `app/api/auth/[...all]/route.ts` — single catch-all for all auth endpoints
- Client-side: `lib/auth-client.ts` exports `authClient` with `useSession`, `signIn`, `signUp`, etc.
- Server-side session: `auth.api.getSession({ headers: await headers() })`
- Session cookie caching enabled (5 min) to reduce DB round-trips over Neon HTTP
- User additional fields: `description` (bio), `onboardingStep` (tracks onboarding progress)
- Password reset via Resend is stubbed out in `lib/auth.ts` (commented), ready to enable
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

### Organizations & RBAC

- **Better Auth organization plugin** handles teams, members, invitations, and role-based access
- Configured in `lib/auth.ts` (server) and `lib/auth-client.ts` (client) with matching AC config
- Access control defined in `lib/permissions.ts` using `createAccessControl` from `better-auth/plugins/access`
- Four roles: **owner** (full control), **admin** (all except org delete), **member** (create/edit test cases, execute runs), **viewer** (read-only)
- Invitation system: 7-day expiry, emails sent via Resend (falls back to console.log if `RESEND_API_KEY` not set)
- Organization plugin tables: `organization`, `member`, `invitation` + `activeOrganizationId` on `session`
- Permission resources: `organization`, `member`, `invitation`, `project`, `testCase`, `testRun`, `testPlan`, `shareLink`

### Onboarding

Two distinct flows handle user registration:

**Flow A — New user creating a workspace:**
1. Signup (`/signup`) — name, email, password, optional profile photo; sets `onboardingStep: "workspace"`
2. Create workspace (`/onboarding/workspace`) — workspace name, URL slug (auto-generated with real-time uniqueness check), optional logo
3. Invite team (`/onboarding/invite`) — add invitees by email with role selection, or skip
4. Complete → `onboardingStep` set to `null` → redirected to `/dashboard`

**Flow B — Invited user joining a workspace:**
1. Click invite link (`/invite/[id]`) — shows invitation details and org name
2. Create account or sign in — signup form accepts `?invite=ID` to auto-accept after signup
3. Auto-joined to workspace → redirected to `/dashboard` (no onboarding steps)

**Onboarding tracking:** `user.onboardingStep` column — `null` = complete, `"workspace"` = needs workspace, `"invite"` = needs invites. The app layout guards against incomplete onboarding. The `/api/onboarding/advance` endpoint validates step transitions and clears the session cache cookie.

### Settings

Settings pages live under `app/(app)/settings/` with a Linear-style sidebar nav:

- **Profile** (`/settings`) — name, photo, description
- **Security** (`/settings/security`) — password change
- **Members** (`/settings/members`) — team member management (invite, remove, change role, revoke invitations); only visible to org owners/admins; uses TanStack React Table with shadcn DataTable

The sidebar forces expanded state on settings pages and conditionally shows the Members nav item based on the user's admin org membership.

### Schema

Better Auth owns seven tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) with text IDs and camelCase column names. The `user` table has additional fields: `description` and `onboardingStep`.

Application tables use snake_case column names and are organized into three domains:

**Organization-scoped:**
- `project` — top-level container within an organization

**Test Design (project-scoped):**
- `test_suite` — top-level grouping of test cases
- `section` — hierarchical folders (self-referencing `parent_id`), ordered by `display_order`
- `test_case` — core entity (title, description, preconditions, type, priority, status, template_type)
- `test_step` — ordered steps within a test case (action + expected_result)
- `tag` — labels scoped to a project (partial unique index on name where not deleted)
- `test_case_tag` — many-to-many junction

**Test Execution (project-scoped):**
- `test_plan` — planned collection of test cases (draft/active/completed/archived)
- `test_run` — execution instance (linked to plan or ad-hoc), tracks environment and timing
- `test_result` — verdict per test case per run (passed/failed/blocked/skipped/untested)
- `test_step_result` — per-step granular results

**Cross-cutting:**
- `attachment` — polymorphic file references (entity_type + entity_id), stores Vercel Blob URLs
- `share_link` — hashed token for external guest access (read-only, with optional expiry)

### File uploads

- **Vercel Blob** for image/attachment storage
- Upload route: `app/api/upload/route.ts` — authenticates via Better Auth session, restricts to image types (jpeg/png/webp/gif), 5MB max
- Client uploads use `upload()` from `@vercel/blob/client` with `handleUploadUrl: "/api/upload"`
- Pass `clientPayload: JSON.stringify({ context: "profile-image" })` to auto-update `user.image` on upload completion
- Also used for workspace logos during onboarding (context: `"workspace-logo"`)
- Required env var: `BLOB_READ_WRITE_TOKEN`

### UI

- Tailwind CSS 4 via PostCSS, theme defined with OKLCH CSS variables in `app/globals.css`
- shadcn/ui components in `components/ui/`, add new ones with `npx shadcn add <component>`
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) and `generateSlug()` for URL slug generation
- Dark mode support via `next-themes` and `.dark` class variant
- Icons: `lucide-react`
- Collapsible sidebar with Zustand-persisted state (`lib/stores/sidebar-store.ts`), hydration-safe via `useSidebarReady()` hook
- Reusable `DataTable` component (`components/data-table.tsx`) wrapping TanStack React Table with shadcn Table primitives
- Shared auth UI components (`components/auth-ui.tsx`): `AuthInput`, `AuthLabel`, `PasswordInput`
- Onboarding step indicator (`components/onboarding-steps.tsx`)

### Registration control

- `NEXT_PUBLIC_REGISTRATION_OPEN` env var controls public signup (defaults to `"true"`)
- Set to `"false"` to disable public registration — only invited users can join
- When closed: middleware blocks both the `/signup` page and the `/api/auth/sign-up/email` endpoint (returns 403)
- UI hides "Sign up" / "Create Account" links on login and landing pages
- Invitation-based onboarding still works (invited users accept via the org invitation flow)

## Environment Variables

All in `.env.local` (gitignored via `.env*` pattern):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — signing key (min 32 chars)
- `BETTER_AUTH_URL` — app base URL
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token
- `NEXT_PUBLIC_REGISTRATION_OPEN` — set to `"false"` to disable public signup (default: open)
- `RESEND_API_KEY` — Resend API key for invitation emails (optional; falls back to console.log)
- `EMAIL_FROM` — sender address for emails (e.g. `"LGTM <noreply@yourdomain.com>"`)
