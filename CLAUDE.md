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
- `app/(app)/[workspaceSlug]/` — protected workspace-scoped pages (dashboard, teams, settings, team sub-pages); layout validates workspace membership, redirects unauthenticated users, and guards against incomplete onboarding
- `app/(app)/[workspaceSlug]/settings/` — workspace settings pages (profile, security, tokens, members)
- `app/(app)/[workspaceSlug]/[teamKey]/` — team-scoped pages (test-repo, test-runs, environments, views); teamKey is 2-10 uppercase letters (e.g., "ENG", "QA")
- `app/(app)/[workspaceSlug]/[teamKey]/settings/` — team settings pages (overview, members, tokens); requires team admin/owner permissions
- `app/onboarding/` — onboarding flow for new users (workspace creation, team invitations, first team creation); requires auth, redirects to dashboard when complete
- `app/api/auth/[...all]/route.ts` — Better Auth catch-all
- `app/api/upload/route.ts` — Vercel Blob upload endpoint
- `app/api/logs/route.ts` — Client log ingestion endpoint (POST batched logs from browser)
- `app/api/check-slug/route.ts` — Organization slug uniqueness check
- `app/api/check-team-key/route.ts` — Team key availability check (scoped to org)
- `app/api/teams/route.ts` — Team CRUD (POST creates with auto-incrementing `displayOrder` and `nextTestCaseNumber`)
- `app/api/teams/[id]/route.ts` — Team update: PATCH (update name, description; key is immutable)
- `app/api/teams/[id]/members/route.ts` — Team members: GET (list) + POST (add member)
- `app/api/teams/[id]/members/[memberId]/route.ts` — Team member: PATCH (update role) + DELETE (remove)
- `app/api/teams/[id]/tokens/route.ts` — Team tokens: GET (list tokens scoped to team)
- `app/api/teams/reorder/route.ts` — PUT endpoint for batch reorder of team `displayOrder`
- `app/api/organizations/[id]/members/route.ts` — GET organization members (with optional team exclusion filter)
- `app/api/environments/route.ts` — Environment CRUD: GET (list by projectId) + POST (create); scoped to project/team; supports token auth
- `app/api/environments/[id]/route.ts` — Environment PUT (update) + DELETE (soft-delete)
- `app/api/cycles/route.ts` — Team cycle CRUD: GET (list by projectId) + POST (create); scoped to project/team; supports token auth
- `app/api/cycles/[id]/route.ts` — Team cycle PUT (update) + DELETE (soft-delete); supports token auth
- `app/api/workspace-cycles/route.ts` — Workspace cycle CRUD: GET (list by organizationId) + POST (create); organization-scoped; admin/owner only; supports token auth
- `app/api/workspace-cycles/[id]/route.ts` — Workspace cycle PUT (update) + DELETE (soft-delete); admin/owner only; supports token auth
- `app/api/test-cases/route.ts` — Test case POST (create); supports token auth
- `app/api/test-cases/[id]/route.ts` — Test case PATCH (update) + DELETE; supports token auth
- `app/api/tokens/route.ts` — API token CRUD: POST (create) + GET (list user's tokens)
- `app/api/tokens/[id]/route.ts` — API token management: PATCH (update metadata) + DELETE (revoke)
- `app/api/onboarding/advance/route.ts` — Advances onboarding step and clears session cache

**Server/Client split:** `page.tsx` files are server components that fetch data; interactive parts live in separate `"use client"` files (e.g. `login-form.tsx`, `dashboard-content.tsx`, `workspace-form.tsx`).

**Middleware** (`middleware.ts`): redirects authenticated users away from auth pages → `/workspace-redirect` (which resolves their first workspace slug), unauthenticated users away from protected pages → `/login`, blocks signup when registration is closed, and normalizes team keys to uppercase (e.g., `/acme/eng/test-repo` → `/acme/ENG/test-repo`).

### Naming conventions

- Component files: kebab-case (`app-sidebar.tsx`, `login-form.tsx`)
- DB columns: snake_case for app tables, camelCase for Better Auth-owned tables
- Path alias: `@/*` resolves to project root (e.g. `@/db`, `@/lib/auth`)

### Team Keys

Teams use short, immutable keys (similar to Jira project keys) instead of slugs for URLs and test case identifiers.

**Key format:**
- Pattern: 2-10 uppercase letters (e.g., "ENG", "QA", "BACKEND")
- Validation: `^[A-Z]{2,10}$` via `validateTeamKey()` in `lib/utils.ts`
- Reserved keys: `["TEST", "TEMP", "ADMIN", "ROOT", "API", "APP", "WEB", "DASHBOARD", "TEAMS", "SETTINGS"]`
- Unique per organization
- Immutable after creation (enforced in API)

**URL structure:**
- Team pages: `/{workspaceSlug}/{teamKey}/test-repo` (e.g., `/acme/ENG/test-repo`)
- Middleware normalizes lowercase keys to uppercase automatically

**Test case identifiers:**
- Format: `{TEAM-KEY}-{number}` (e.g., "ENG-42", "QA-123")
- Stored in `test_case.case_key` column
- Auto-incrementing per team via `project.next_test_case_number`
- Generated atomically in transaction during test case creation

**Key generation:**
- `generateTeamKey(name, existingKeys)` in `lib/utils.ts`
- Auto-generates from team name (e.g., "Engineering Team" → "ENG")
- Strategies: first letters, acronyms, numbered variants (ENG1, ENG2)
- User can manually override during team creation
- Real-time availability checking via `/api/check-team-key`

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
- Permission resources: `organization`, `member`, `invitation`, `project`, `environment`, `cycle`, `workspaceCycle`, `testCase`, `testRun`, `testPlan`, `shareLink`, `projectMember`, `projectSettings`

### Team-level RBAC

In addition to organization-level roles (owner, admin, member, viewer), teams have **per-team membership** with team-specific roles:

- **team_owner**: Full team control (settings, members, delete team)
- **team_admin**: Manage content, environments, members (cannot delete team)
- **team_member**: Create/edit test cases, execute runs
- **team_viewer**: Read-only access to team resources

**Permission Resolution:**
- Org admins/owners automatically get team_admin access to all teams (no explicit membership required)
- Explicit team membership grants team-specific roles
- No org admin role + No team membership = No access

**Database Tables:**
- `project_member` — team membership with roles (project_id, user_id, role, audit fields)
- `project_member_invitation` — team-level invitations (project_id, email, role, status, expiry)

**Query Helpers:**
- `lib/queries/team-permissions.ts`: `getTeamPermission()`, `canManageTeamSettings()`, `canManageTeamMembers()`, `hasTeamAccess()`
- `lib/queries/team-members.ts`: `getTeamMembers()`, `getAvailableOrgMembers()`, `isTeamMember()`, `getTeamMemberCountByRole()`

**Team Settings Pages:**
- `/{workspace}/{team}/settings` — Team info (name, slug, description)
- `/{workspace}/{team}/settings/members` — Team member management
- `/{workspace}/{team}/settings/tokens` — Team-scoped API tokens

**API Endpoints:**
- `PATCH /api/teams/[id]` — Update team info
- `GET /api/teams/[id]/members` — List team members
- `POST /api/teams/[id]/members` — Add team member
- `PATCH /api/teams/[id]/members/[memberId]` — Update member role
- `DELETE /api/teams/[id]/members/[memberId]` — Remove member
- `GET /api/teams/[id]/tokens` — List team-scoped tokens
- `GET /api/organizations/[id]/members?excludeTeam=[teamId]` — Get available org members

**Migration Note:**
Existing teams start with no team members after upgrade. Org admins retain automatic access. Use team settings to add members as needed.

### API Tokens

Fine-grained access tokens enable programmatic API access with specific permissions, similar to GitHub's personal access tokens.

**Token format:** `lgtm_v1_<48-chars>` (288 bits entropy)
- Prefix identifies tokens in logs/code
- Version enables future format changes
- Tokens are bcrypt-hashed (never stored in plaintext)
- Shown only once at creation

**Database schema:**
- `api_token` — token metadata (user_id, organization_id, token_hash, token_prefix, status, expiry, last_used)
- `api_token_permission` — resource:action permissions (e.g., `testCase:create`, `environment:read`)
- `api_token_project_scope` — optional project-level restrictions
- `api_token_activity` — comprehensive audit trail

**Core infrastructure:**
- `lib/token-utils.ts` — token generation, hashing, verification (bcrypt)
- `lib/api-token-auth.ts` — token validation from Authorization headers
- `lib/token-permissions.ts` — permission checking and validation
- `lib/api-auth.ts` — unified auth context supporting both sessions and tokens

**API endpoints:**
- `app/api/tokens/route.ts` — POST (create), GET (list user's tokens)
- `app/api/tokens/[id]/route.ts` — PATCH (update metadata), DELETE (revoke)

**UI components:**
- `app/(app)/[workspaceSlug]/settings/tokens/page.tsx` — settings page
- `components/settings/tokens-list.tsx` — token management with Card-based layout
- `components/settings/create-token-dialog.tsx` — token creation with permission selector
- `components/settings/show-token-dialog.tsx` — one-time token display

**Usage pattern in API routes:**
```typescript
import { getAuthContext } from "@/lib/api-auth";
import { hasTokenPermission } from "@/lib/token-permissions";

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For API tokens, check permissions
  if (authContext.type === "api_token") {
    if (authContext.organizationId !== requiredOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasTokenPermission(authContext, "testCase", "read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  // Session auth verification here...
}
```

**Client usage:**
```bash
curl -X GET "http://localhost:3000/api/test-cases?projectId=xxx" \
  -H "Authorization: Bearer lgtm_v1_..."
```

**Security features:**
- Bcrypt hashing with 10 salt rounds
- One-time display at creation
- Optional expiration dates
- Revocation via status field (active/revoked)
- Tokens inherit subset of user's role permissions (prevent privilege escalation)
- Organization and project scoping enforced
- Comprehensive activity logging

**Supported API routes:**
- `/api/environments` (GET, POST) + `/api/environments/[id]` (PUT, DELETE)
- `/api/cycles` (GET, POST) + `/api/cycles/[id]` (PUT, DELETE)
- `/api/workspace-cycles` (GET, POST) + `/api/workspace-cycles/[id]` (PUT, DELETE)
- `/api/test-cases` (POST) + `/api/test-cases/[id]` (PATCH, DELETE)
- Additional routes can be updated following the same pattern

See [API_TOKEN_TESTING.md](./API_TOKEN_TESTING.md) for comprehensive testing guide.

### Onboarding

Two distinct flows handle user registration:

**Flow A — New user creating a workspace:**
1. Signup (`/signup`) — name, email, password, optional profile photo; sets `onboardingStep: "workspace"`
2. Create workspace (`/onboarding/workspace`) — workspace name, URL slug (auto-generated with real-time uniqueness check), optional logo
3. Invite team (`/onboarding/invite`) — add invitees by email with role selection, or skip
4. Create first team (`/onboarding/team`) — team name, slug (auto-generated with uniqueness check per org), optional description
5. Complete → `onboardingStep` set to `null` → redirected to `/{workspaceSlug}/dashboard`

**Flow B — Invited user joining a workspace:**
1. Click invite link (`/invite/[id]`) — shows invitation details and org name
2. Create account or sign in — signup form accepts `?invite=ID` to auto-accept after signup
3. Auto-joined to workspace → redirected to `/{workspaceSlug}/dashboard` (no onboarding steps)

**Onboarding tracking:** `user.onboardingStep` column — `null` = complete, `"workspace"` = needs workspace, `"invite"` = needs invites, `"team"` = needs first team. The app layout guards against incomplete onboarding. The `/api/onboarding/advance` endpoint validates step transitions (`workspace` → `invite` → `team` → `null`) and clears the session cache cookie.

### Settings

**Workspace Settings** (`app/(app)/[workspaceSlug]/settings/`) with a Linear-style sidebar nav:

- **Profile** (`/{slug}/settings`) — name, photo, description
- **Security** (`/{slug}/settings/security`) — password change
- **API Tokens** (`/{slug}/settings/tokens`) — create and manage fine-grained access tokens for API access; Card-based UI matching members page layout
- **Workspace Cycles** (`/{slug}/settings/cycles`) — organization-level release cycles for cross-team tracking; admin/owner only; supports API token auth
- **Members** (`/{slug}/settings/members`) — workspace member management (invite, remove, change role, revoke invitations); only visible to org owners/admins; uses TanStack React Table with shadcn DataTable

**Team Settings** (`app/(app)/[workspaceSlug]/[teamKey]/settings/`) accessed via team dropdown menu:

- **Overview** (`/{slug}/{teamKey}/settings`) — team name, description editing; team key is read-only (immutable after creation)
- **Members** (`/{slug}/{teamKey}/settings/members`) — team member management (add org members to team, change team roles, remove from team); enforces last owner protection and self-removal prevention
- **Environments** (`/{slug}/{teamKey}/settings/environments`) — team environment configuration (development, staging, qa, production, custom); supports API token auth
- **Cycles** (`/{slug}/{teamKey}/settings/cycles`) — team-level sprint/cycle management for tracking test execution and defects; supports API token auth
- **API Tokens** (`/{slug}/{teamKey}/settings/tokens`) — team-scoped API tokens; automatically scopes new tokens to the current team

The sidebar forces expanded state on settings pages (both workspace and team), conditionally shows navigation items based on permissions, and detects team settings mode via path segments.

### Schema

Better Auth owns seven tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) with text IDs and camelCase column names. The `user` table has additional fields: `description` and `onboardingStep`.

Application tables use snake_case column names and are organized into three domains:

**Organization-scoped:**
- `project` — teams (called "teams" in UI, `project` in DB); has `key` (2-10 uppercase letters, immutable, unique per org), `display_order` for user-controlled ordering, `next_test_case_number` for auto-incrementing test case IDs
- `project_member` — team membership with roles (project_id, user_id, role: team_owner/team_admin/team_member/team_viewer, audit fields)
- `project_member_invitation` — team-level invitations (project_id, email, role, status, expires_at)
- `workspace_cycle` — organization-level release cycles (name, status, start/end dates, is_current, display_order); partial unique index on `(organization_id, name)` where not deleted; admin/owner only; CRUD via `/api/workspace-cycles`; query helpers in `lib/queries/workspace-cycles.ts`
- `api_token` — fine-grained access tokens (organization-scoped, token_hash bcrypt-hashed, status: active/revoked)
- `api_token_permission` — token permissions (junction: token_id + resource + action)
- `api_token_project_scope` — optional project restrictions (junction: token_id + project_id)
- `api_token_activity` — audit trail (method, path, status_code, ip_address, allowed)

**Test Design (project-scoped):**
- `test_suite` — top-level grouping of test cases
- `section` — hierarchical folders (self-referencing `parent_id`), ordered by `display_order`
- `test_case` — core entity (title, description, preconditions, type, priority, status, template_type, case_number, case_key); case_key format: "TEAMKEY-123" (e.g., "ENG-42"); unique per project
- `test_step` — ordered steps within a test case (action + expected_result)
- `tag` — labels scoped to a project (partial unique index on name where not deleted)
- `test_case_tag` — many-to-many junction

**Environment Configuration (project-scoped):**
- `environment` — named test environments (name, url, description, type, is_default, display_order); partial unique index on `(project_id, name)` where not deleted; types: development, staging, qa, production, custom; CRUD via `/api/environments`; query helpers in `lib/queries/environments.ts`

**Cycle Management (dual-scoped):**
- `cycle` — team-level sprint/cycle tracking (name, status, start/end dates, is_current, display_order, project_id); partial unique index on `(project_id, name)` where not deleted; status: planned/active/completed; CRUD via `/api/cycles`; query helpers in `lib/queries/cycles.ts`
- Test execution tables have **dual cycle foreign keys** for flexible tracking:
  - `test_case.cycle_id` (team cycle) + `test_case.workspace_cycle_id` (workspace cycle) — link test cases to team sprints OR organization releases
  - `test_run.cycle_id` + `test_run.workspace_cycle_id` — track test runs at team OR workspace level
  - `test_result.defect_cycle_id` + `test_result.defect_workspace_cycle_id` — track defects found in specific cycles at either level

**Test Execution (project-scoped):**
- `test_plan` — planned collection of test cases (draft/active/completed/archived)
- `test_run` — execution instance (linked to plan or ad-hoc), tracks environment (legacy text field + `environment_id` FK to `environment` table), cycle associations (dual FKs), and timing
- `test_result` — verdict per test case per run (passed/failed/blocked/skipped/untested), with cycle defect tracking via dual FKs
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
- Collapsible sidebar (`components/app-sidebar.tsx`) with Zustand-persisted state (`lib/stores/sidebar-store.ts`), hydration-safe via `useSidebarReady()` hook. Linear-style "Your teams" section with collapsible team items, "+" button for quick team creation (admin-only), and drag-and-drop reordering via `react-dnd` with `HTML5Backend` (admin-only). Team order persists to DB via `display_order` column. Sidebar detects both workspace settings (`isSettings`) and team settings (`isTeamSettings`) modes and adjusts navigation accordingly.
- Shared `CreateTeamDialog` (`components/create-team-dialog.tsx`) — reused in sidebar and teams page for team creation with slug auto-generation and availability checking
- Workspace context (`lib/workspace-context.tsx`) — provides `workspace`, `teams`, `userRole`, `isAdmin` to all workspace-scoped pages
- Team settings context (`lib/team-settings-context.tsx`) — provides team info to team settings pages
- Reusable `DataTable` component (`components/data-table.tsx`) wrapping TanStack React Table with shadcn Table primitives
- Shared auth UI components (`components/auth-ui.tsx`): `AuthInput`, `AuthLabel`, `PasswordInput`
- Team settings components (`components/team-settings/`) — `team-info-form.tsx`, `team-tokens-list.tsx` with Card-based layouts matching workspace settings style

### Registration control

- `NEXT_PUBLIC_REGISTRATION_OPEN` env var controls public signup (defaults to `"true"`)
- Set to `"false"` to disable public registration — only invited users can join
- When closed: middleware blocks both the `/signup` page and the `/api/auth/sign-up/email` endpoint (returns 403)
- UI hides "Sign up" / "Create Account" links on login and landing pages
- Invitation-based onboarding still works (invited users accept via the org invitation flow)

### Logging

- **Pino logger** for server-side structured logging with JSON output
- Client-side logger sends batched logs to `/api/logs` endpoint
- Correlation IDs for distributed tracing across client/server
- Automatic sensitive data redaction (passwords, tokens, PII)
- Error boundaries capture React errors

**Server logging:**
```typescript
import { logger, logInfo, logError } from '@/lib/logger';

logInfo('User logged in', { userId: '123' });
logError('Database error', error, { query: 'SELECT...' });

// API route logging
const apiLogger = logger.child({ correlationId });
apiLogger.info({ userId }, 'Team created successfully');
```

**Client logging:**
```typescript
import { logClientInfo, logClientError } from '@/lib/client-logger';

logClientInfo('Feature used', { feature: 'export' });
logClientError('API call failed', error, { endpoint: '/api/teams' });
```

**Environment variables:**
- `LOG_LEVEL`: debug | info | warn | error (default: info in prod, debug in dev)
- `LOG_TO_FILE`: true/false for file-based logging (default: false, logs to stdout)
- `LOG_FILE_PATH`: path to log file (default: ./logs/app.log)
- `LOG_MAX_FILES`: days of retention (default: 30)

**Viewing logs:**
- Development: Pretty-printed to console
- Production (Vercel): `vercel logs <project>` or Vercel dashboard
- Production (VPS): `tail -f /var/log/lgtm/app.log`

## Environment Variables

All in `.env.local` (gitignored via `.env*` pattern):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — signing key (min 32 chars)
- `BETTER_AUTH_URL` — app base URL
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token
- `NEXT_PUBLIC_REGISTRATION_OPEN` — set to `"false"` to disable public signup (default: open)
- `RESEND_API_KEY` — Resend API key for invitation emails (optional; falls back to console.log)
- `EMAIL_FROM` — sender address for emails (e.g. `"LGTM <noreply@yourdomain.com>"`)
- `LOG_LEVEL` — logging level: debug | info | warn | error (default: info in prod, debug in dev)
- `LOG_TO_FILE` — set to `"true"` for file-based logging on VPS (default: false, logs to stdout)
- `LOG_FILE_PATH` — path to log file (default: ./logs/app.log)
- `LOG_MAX_FILES` — days of log retention (default: 30)
