# @lgtm/web

Next.js web application — the main LGTM UI. Lives at `apps/web/` in the monorepo.

Depends on `@lgtm/shared` for constants and types (build packages first: `pnpm build:packages` from root).

## Commands

Run from this directory (`apps/web/`) or from the monorepo root (which proxies here via `--filter`).

```bash
pnpm dev              # Next.js dev server at localhost:3000
pnpm build            # Production build
pnpm lint             # ESLint (v9 flat config)
pnpm db:generate      # Generate Drizzle migration SQL from schema changes
pnpm db:migrate       # Apply pending migrations to the database
pnpm db:push          # Push schema directly to DB (prototyping only)
pnpm db:studio        # Browser UI for browsing/editing DB data
```

## Architecture

Next.js 16 app using App Router, React 19, TypeScript (strict), Tailwind CSS 4, and shadcn/ui (new-york style). The app is a **test case management system** (similar to TestRail/Zephyr) with team-based RBAC. No test framework is configured yet.

### Shared Constants

API route validation uses constants imported from `@lgtm/shared` instead of inline arrays. When adding or modifying validation in API routes, import from the shared package:

```typescript
import { TEST_CASE_PRIORITIES, TEST_CASE_TYPES, TEST_CASE_SEVERITIES } from "@lgtm/shared";

// Use in validation:
if (!TEST_CASE_PRIORITIES.includes(priority)) { ... }
```

Affected API routes: `test-cases`, `test-runs`, `test-results`, `defects`, `environments`, `cycles`, `workspace-cycles`, `test-plans`, `teams/members`. See `@lgtm/shared` CLAUDE.md for the full list of available constants.

### Route structure

- `app/(auth)/` — public auth pages (login, signup, forgot-password, reset-password) and invitation acceptance (`invite/[id]`) with centered card layout
- `app/(app)/[workspaceSlug]/` — protected workspace-scoped pages (dashboard, teams, settings, team sub-pages); layout validates workspace membership, redirects unauthenticated users, and guards against incomplete onboarding
- `app/(app)/[workspaceSlug]/settings/` — workspace settings pages (profile, security, tokens, members)
- `app/(app)/[workspaceSlug]/[teamKey]/` — team-scoped pages (test-repo, test-runs, defects, environments); teamKey is 2-10 uppercase letters (e.g., "ENG", "QA")
- `app/(app)/[workspaceSlug]/[teamKey]/settings/` — team settings pages (overview, members, tokens); requires team admin/owner permissions
- `app/onboarding/` — onboarding flow for new users (workspace creation, team invitations, first team creation); requires auth, redirects to dashboard when complete
- `app/api/auth/[...all]/route.ts` — Better Auth catch-all
- `app/api/upload/route.ts` — file upload endpoint (pluggable storage backend via `lib/storage/`)
- `app/api/logs/route.ts` — Client log ingestion endpoint (POST batched logs from browser)
- `app/api/check-slug/route.ts` — Organization slug uniqueness check
- `app/api/check-team-key/route.ts` — Team key availability check (scoped to org)
- `app/api/teams/route.ts` — Team CRUD: GET (list accessible projects; supports token auth for `@lgtm/cli`) + POST (create with auto-incrementing `displayOrder` and `nextTestCaseNumber`)
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
- `app/api/test-cases/by-key/route.ts` — GET test case by human-readable key (e.g., ENG-42); query params: projectId, caseKey; returns test case with steps; supports token auth (used by `@lgtm/cli`)
- `app/api/test-cases/[id]/route.ts` — Test case PATCH (update) + DELETE; supports token auth
- `app/api/test-cases/[id]/steps/route.ts` — Test steps: GET (list) + POST (create step)
- `app/api/test-cases/[id]/steps/reorder/route.ts` — PUT reorder steps
- `app/api/test-cases/[id]/clone/route.ts` — POST clone a test case
- `app/api/test-steps/route.ts` — Test step POST (create)
- `app/api/test-steps/[id]/route.ts` — Test step PUT (update) + DELETE
- `app/api/shared-steps/route.ts` — Shared steps: GET (list by projectId) + POST (create); supports token auth (`sharedStep:read`, `sharedStep:create`)
- `app/api/shared-steps/[id]/route.ts` — Shared step: GET (with actions) + PUT (update title/description/status) + DELETE (soft-delete); supports token auth (`sharedStep:read`, `sharedStep:update`, `sharedStep:delete`)
- `app/api/shared-steps/[id]/actions/route.ts` — Shared step actions: POST (create action); supports token auth (`sharedStep:update`)
- `app/api/shared-steps/[id]/actions/[actionId]/route.ts` — Shared step action: PUT (update) + DELETE; supports token auth (`sharedStep:update`)
- `app/api/shared-steps/[id]/actions/reorder/route.ts` — PUT reorder shared step actions; supports token auth (`sharedStep:update`)
- `app/api/test-suites/route.ts` — Test suite CRUD
- `app/api/test-suites/[id]/route.ts` — Test suite update/delete
- `app/api/test-plans/route.ts` — Test plan: GET (list by projectId) + POST (create with optional testCaseIds); supports token auth
- `app/api/test-plans/[id]/route.ts` — Test plan: GET (with cases) + PATCH (update name/description/status) + DELETE (soft-delete); supports token auth
- `app/api/test-plans/[id]/cases/route.ts` — Plan cases: GET (list with test case details) + PUT (replace entire case list)
- `app/api/test-repo/route.ts` — GET tree data (suites + sections + test cases as TreeNode hierarchy) for client-side tree pickers; query param: projectId
- `app/api/test-runs/route.ts` — Test run: GET (list by projectId) + POST (create); supports token auth
- `app/api/test-runs/[id]/route.ts` — Test run: GET + PATCH (update status/metadata) + DELETE (soft-delete); supports token auth
- `app/api/test-runs/[id]/results/route.ts` — POST bulk submit/update test results
- `app/api/test-runs/[id]/logs/route.ts` — Run-level logs: GET (fetch chunks) + POST (append chunk)
- `app/api/test-results/[id]/route.ts` — Test result PATCH (update status/comment/duration)
- `app/api/test-results/[id]/steps/route.ts` — Step results: GET (fetch) + PUT (bulk upsert)
- `app/api/test-results/[id]/logs/route.ts` — Result-level logs: GET (fetch chunks) + POST (append chunk)
- `app/api/defects/route.ts` — Defects: GET (list by projectId) + POST (create with auto-incrementing defect number/key); supports token auth
- `app/api/defects/by-key/route.ts` — GET defect by human-readable key (e.g., ENG-D-42); query param: defectKey; supports token auth (used by `@lgtm/cli`)
- `app/api/defects/[id]/route.ts` — Defect: GET + PATCH (update fields/status/resolution) + DELETE (soft-delete); supports token auth
- `app/api/comments/route.ts` — Comments: GET (list by entity) + POST (create)
- `app/api/comments/[id]/route.ts` — Comment PATCH (edit) + DELETE
- `app/api/comments/[id]/resolve/route.ts` — POST toggle comment resolved state
- `app/api/comments/[id]/reactions/route.ts` — POST toggle emoji reaction
- `app/api/comments/mentions/route.ts` — GET search users for @mentions
- `app/api/attachments/route.ts` — Attachments: GET (list by entityType + entityId) + POST (upload file with storage delegation); polymorphic across test_case, test_result, defect, test_run, comment; supports token auth (`attachment:read`, `attachment:create`)
- `app/api/attachments/[id]/route.ts` — Attachment DELETE (removes from storage + DB); supports token auth (`attachment:delete`)
- `app/api/tokens/route.ts` — API token CRUD: POST (create) + GET (list user's tokens)
- `app/api/tokens/[id]/route.ts` — API token management: PATCH (update metadata) + DELETE (revoke)
- `app/api/onboarding/advance/route.ts` — Advances onboarding step and clears session cache

**Server/Client split:** `page.tsx` files are server components that fetch data; interactive parts live in separate `"use client"` files (e.g. `login-form.tsx`, `dashboard-content.tsx`, `workspace-form.tsx`).

**Middleware** (`middleware.ts`): redirects authenticated users away from auth pages → `/workspace-redirect` (which resolves their first workspace slug), unauthenticated users away from protected pages → `/login`, blocks signup when registration is closed, and normalizes team keys to uppercase (e.g., `/acme/eng/test-repo` → `/acme/ENG/test-repo`).

### Naming conventions

- Component files: kebab-case (`app-sidebar.tsx`, `login-form.tsx`)
- DB columns: snake_case for app tables, camelCase for Better Auth-owned tables
- Path alias: `@/*` resolves to this package root (`apps/web/*`) (e.g. `@/db`, `@/lib/auth`)

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
- Test run detail: `/{workspaceSlug}/{teamKey}/test-runs/{runKey}` (e.g., `/acme/ENG/test-runs/ENG-TR-42`)
- Test result: `/{workspaceSlug}/{teamKey}/test-runs/{runKey}/results/{caseKey}` (e.g., `/acme/ENG/test-runs/ENG-TR-42/results/ENG-7`)
- Defect detail: `/{workspaceSlug}/{teamKey}/defects/{defectKey}` (e.g., `/acme/ENG/defects/ENG-D-42`)
- API routes remain UUID-based (e.g., `/api/test-runs/{id}`, `/api/defects/{id}`)
- Middleware normalizes lowercase keys to uppercase automatically

**Human-readable identifiers:**
- Test cases: `{TEAM_KEY}-{number}` (e.g., "ENG-42") — stored in `test_case.case_key`
- Test runs: `{TEAM_KEY}-TR-{number}` (e.g., "ENG-TR-2") — stored in `test_run.run_key`
- Defects: `{TEAM_KEY}-D-{number}` (e.g., "ENG-D-42") — stored in `defect.defect_key`
- All auto-incrementing per team, generated atomically during creation
- Server pages resolve keys to entities, then use UUIDs for API/query calls

**Key generation:**
- `generateTeamKey(name, existingKeys)` in `lib/utils.ts`
- Auto-generates from team name (e.g., "Engineering Team" → "ENG")
- Strategies: first letters, acronyms, numbered variants (ENG1, ENG2)
- User can manually override during team creation
- Real-time availability checking via `/api/check-team-key`

### Data layer

- **Database:** PostgreSQL — driver selected by `DEPLOYMENT_ENV`: `dev` uses `drizzle-orm/node-postgres` (standard TCP for local Docker PostgreSQL), unset/`prod` uses `drizzle-orm/neon-http` (stateless HTTP for Neon serverless). Conditional logic in `db/index.ts`
- **ORM:** Drizzle ORM — schema in `db/schema.ts`, reusable column helpers in `db/columns.ts`, client exported from `db/index.ts`
- **Migrations:** Drizzle Kit reads `drizzle.config.ts`, outputs SQL to `drizzle/`. Workflow after editing `db/schema.ts`: run `pnpm db:generate` then `pnpm db:migrate` (or `pnpm db:push` for quick prototyping)
- **IDs:** All tables use text primary keys (UUID via `crypto.randomUUID()`)
- **Soft delete:** All application tables have `deleted_at`/`deleted_by` columns; always filter with `WHERE deleted_at IS NULL`
- **Audit fields:** All application tables spread `auditFields` from `db/columns.ts` (created_at, created_by, updated_at, updated_by, deleted_at, deleted_by). Junction/result tables use lighter `timestamps` (created_at, updated_at only)
- **Path alias:** `@/db` resolves to `apps/web/db/` (tsconfig `@/*` → `./*` relative to this package)

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
- Permission resources: `organization`, `member`, `invitation`, `project`, `environment`, `cycle`, `workspaceCycle`, `testCase`, `testRun`, `testPlan`, `sharedStep`, `defect`, `shareLink`, `comment`, `attachment`, `projectMember`, `projectSettings`

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
- `/api/teams` (GET) — list accessible projects
- `/api/environments` (GET, POST) + `/api/environments/[id]` (PUT, DELETE)
- `/api/cycles` (GET, POST) + `/api/cycles/[id]` (PUT, DELETE)
- `/api/workspace-cycles` (GET, POST) + `/api/workspace-cycles/[id]` (PUT, DELETE)
- `/api/test-cases` (POST) + `/api/test-cases/[id]` (PATCH, DELETE)
- `/api/test-cases/by-key` (GET) — lookup by human-readable key
- `/api/test-repo` (GET) — tree data for test cases
- `/api/test-runs` (GET, POST) + `/api/test-runs/[id]` (GET, PATCH, DELETE)
- `/api/test-runs/[id]/results` (POST) — bulk submit results
- `/api/shared-steps` (GET, POST) + `/api/shared-steps/[id]` (GET, PUT, DELETE) + `/api/shared-steps/[id]/actions` (POST) + `/api/shared-steps/[id]/actions/[actionId]` (PUT, DELETE) + `/api/shared-steps/[id]/actions/reorder` (PUT)
- `/api/defects` (GET, POST) + `/api/defects/[id]` (GET, PATCH, DELETE)
- `/api/defects/by-key` (GET) — lookup by human-readable key
- `/api/attachments` (GET, POST) + `/api/attachments/[id]` (DELETE) — file attachments for any entity

These routes are used by `@lgtm/cli` and `@lgtm/playwright-reporter`. Additional routes can be updated following the same pattern.

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
- **API Tokens** (`/{slug}/settings/tokens`) — create and manage fine-grained access tokens for API access; uses `PageBreadcrumb` + `GroupedList` (grouped by effective status)
- **Workspace Cycles** (`/{slug}/settings/cycles`) — organization-level release cycles for cross-team tracking; admin/owner only; supports API token auth
- **Members** (`/{slug}/settings/members`) — workspace member management (invite, remove, change role, revoke invitations); only visible to org owners/admins; uses DataTable

**Team Settings** (`app/(app)/[workspaceSlug]/[teamKey]/settings/`) accessed via team dropdown menu:

- **Overview** (`/{slug}/{teamKey}/settings`) — team name, description editing; team key is read-only (immutable after creation)
- **Members** (`/{slug}/{teamKey}/settings/members`) — team member management (add org members to team, change team roles, remove from team); enforces last owner protection and self-removal prevention
- **Environments** (`/{slug}/{teamKey}/settings/environments`) — team environment configuration (development, staging, qa, production, custom); `PageBreadcrumb` + `GroupedList` (grouped by type); supports API token auth
- **Test Plans** (`/{slug}/{teamKey}/settings/test-plans`) — reusable test case selections for test runs; `PageBreadcrumb` + `GroupedList` (grouped by status: active/draft/completed/archived); CRUD with wider dialogs embedding `TestCaseTreePicker` for case selection; uses SWR + `useTeamSettings()` pattern; tree data fetched lazily from `GET /api/test-repo`
- **Cycles** (`/{slug}/{teamKey}/settings/cycles`) — team-level sprint/cycle management; `PageBreadcrumb` + `GroupedList` (grouped by status); supports API token auth
- **Shared Steps** (`/{slug}/{teamKey}/settings/shared-steps`) — reusable step sequences that can be inserted into test cases; `PageBreadcrumb` + `GroupedList` (grouped by status: active/draft/archived); clicking a row navigates to detail view (`shared-steps/[id]`) with editable title, description (auto-save on blur), and `TestStepsEditor` for managing actions; uses SWR + `useTeamSettings()` pattern; RBAC: reads allow any org member, writes require admin/owner; supports API token auth (`sharedStep` resource)
- **API Tokens** (`/{slug}/{teamKey}/settings/tokens`) — team-scoped API tokens; `PageBreadcrumb` + `GroupedList` (grouped by effective status); automatically scopes new tokens to the current team

The sidebar forces expanded state on settings pages (both workspace and team), conditionally shows navigation items based on permissions, and detects team settings mode via path segments.

### Schema

Better Auth owns seven tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) with text IDs and camelCase column names. The `user` table has additional fields: `description` and `onboardingStep`.

Application tables use snake_case column names and are organized into three domains:

**Organization-scoped:**
- `project` — teams (called "teams" in UI, `project` in DB); has `key` (2-10 uppercase letters, immutable, unique per org), `display_order` for user-controlled ordering, `next_test_case_number` for auto-incrementing test case IDs, `next_defect_number` for auto-incrementing defect IDs
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
- `test_step` — ordered steps within a test case (action + expected_result + optional `shared_step_id` FK for steps inserted from shared steps)
- `shared_step` — reusable step sequences (title, description, project_id, status: active/draft/archived, display_order); partial unique index on `(project_id, title)` where not deleted; CRUD via `/api/shared-steps`; query helpers in `lib/queries/shared-steps.ts`
- `shared_step_action` — ordered actions within a shared step (shared_step_id, step_order, action, data, expected_result); cascades on shared step delete
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
- `test_plan` — planned collection of test cases (draft/active/completed/archived); managed via team settings UI; query helpers in `lib/queries/test-plans.ts`: `getProjectTestPlans()`, `getTestPlanCases()`
- `test_plan_case` — junction table linking plans to test cases with `display_order`; unique on (test_plan_id, test_case_id)
- `test_run` — execution instance (linked to plan or ad-hoc), tracks environment (legacy text field + `environment_id` FK to `environment` table), cycle associations (dual FKs), and timing; has `run_number` (auto-incremented per project) and `run_key` (human-readable key, format `{TEAM_KEY}-TR-{number}`, e.g., `MOAPP-TR-2`); page URLs use `run_key` instead of UUID
- `test_result` — verdict per test case per run (passed/failed/blocked/skipped/untested), with cycle defect tracking via dual FKs
- `test_step_result` — per-step granular results
- `test_run_log` — log chunks for CI/automation output (test_run_id, test_result_id nullable for run-level vs result-level scoping, step_name, chunk_index, content, line_offset, line_count); unique index on `(test_run_id, test_result_id, chunk_index)`; cascades on run/result delete

**Defect Tracking (project-scoped):**
- `defect` — bug/defect reports (title, description, defect_number auto-incremented per project, defect_key e.g. "ENG-D-42", severity: blocker/critical/major/normal/minor/trivial, priority: critical/high/medium/low, defect_type: functional/ui/performance/security/crash/data/other, status: open/in_progress/fixed/verified/closed/reopened/deferred/rejected/duplicate, resolution: fixed/wont_fix/duplicate/cannot_reproduce/by_design/deferred, steps_to_reproduce, expected_result, actual_result, external_url, assignee_id FK→user, test_result_id/test_run_id/test_case_id for traceability, environment_id, cycle_id, workspace_cycle_id); unique partial index on `(project_id, defect_number)` where not deleted; query helpers in `lib/queries/defects.ts`

**Comments (project-scoped):**
- `comment` — polymorphic comments (entity_type: "test_case" | "test_result" | "defect", entity_id, project_id, parent_id for threading, body, edited_at, resolved_at/resolved_by); indexed on `(entity_type, entity_id)`
- `comment_reaction` — emoji reactions (comment_id, user_id, emoji); unique per user+comment+emoji

**Cross-cutting:**
- `attachment` — polymorphic file references (entity_type + entity_id), stores storage URLs (Vercel Blob or S3)
- `share_link` — hashed token for external guest access (read-only, with optional expiry)

### File uploads

Pluggable storage backend via `STORAGE_PROVIDER` env var — supports **Vercel Blob** (default, for Vercel deployments) and **S3-compatible** (SeaweedFS, MinIO, AWS S3 for self-hosted).

**Architecture:** Port/Adapter pattern in `lib/storage/`:
- `types.ts` — `StorageProvider` interface (port): `put`, `delete`, `deleteMany`, `getUrl`
- `adapters/vercel-blob.ts` — Vercel Blob adapter (uses server-side `put()`/`del()` from `@vercel/blob`)
- `adapters/s3.ts` — S3 adapter (uses `@aws-sdk/client-s3`; `forcePathStyle: true` for SeaweedFS/MinIO)
- `index.ts` — `getStorage()` factory/singleton, reads `STORAGE_PROVIDER` env var, lazy-loads the selected adapter

**Upload flows:**
- Profile/logo upload: `app/api/upload/route.ts` — receives FormData (file + context), authenticates via Better Auth session, validates image types (jpeg/png/webp/gif) and 4MB max, delegates to `getStorage().put()`. Context `"profile-image"` auto-updates `user.image` in DB. Context `"workspace-logo"` returns URL for client.
- Attachment upload: `app/api/attachments/route.ts` (POST) — receives FormData (file + entityType + entityId + projectId), validates against `ALLOWED_ATTACHMENT_MIME_TYPES` and `MAX_ATTACHMENT_SIZE` from `@lgtm/shared`, stores file via `getStorage().put()`, creates `attachment` DB record. Query helpers in `lib/queries/attachments.ts`.
- Attachment utilities: `lib/attachment-utils.ts` — `formatFileSize()`, `isImageMimeType()`, `AttachmentEntityType` type
- Client components POST FormData, receive `{ url }` or `{ attachment }` response
- Storage keys: `uploads/{context}/{userId}/{uuid}.{ext}` (profile/logo) or `attachments/{projectId}/{entityType}/{uuid}.{ext}` (entity attachments)

**Usage in code:**
```typescript
import { getStorage } from "@/lib/storage";

const storage = getStorage();
const result = await storage.put(key, buffer, contentType);
// result.url — public URL to store in DB
```

**Storage proxy (dev mode):** `next.config.ts` adds a rewrite that proxies `/storage/*` to the S3 endpoint. This allows `S3_PUBLIC_URL_BASE` to be set to `http://localhost:3000/storage`, serving uploaded files through Next.js (same-origin). This avoids CORS issues and port-forwarding problems when using remote dev servers.

**Environment variables:**
- `STORAGE_PROVIDER` — `"vercel-blob"` (default) or `"s3"`
- For Vercel Blob: `BLOB_READ_WRITE_TOKEN`
- For S3: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE`

### UI

- Tailwind CSS 4 via PostCSS, theme defined with OKLCH CSS variables in `app/globals.css`
- shadcn/ui components in `components/ui/`, add new ones with `pnpm dlx shadcn add <component>`
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) and `generateSlug()` for URL slug generation
- Dark mode support via `next-themes` and `.dark` class variant
- Icons: `lucide-react`
- Collapsible sidebar (`components/app-sidebar.tsx`) with Zustand-persisted state (`lib/stores/sidebar-store.ts`), hydration-safe via `useSidebarReady()` hook. Linear-style "Your teams" section with collapsible team items, "+" button for quick team creation (admin-only), and drag-and-drop reordering via `react-dnd` with `HTML5Backend` (admin-only). Team order persists to DB via `display_order` column. Sidebar detects both workspace settings (`isSettings`) and team settings (`isTeamSettings`) modes and adjusts navigation accordingly.
- Shared `CreateTeamDialog` (`components/create-team-dialog.tsx`) — reused in sidebar and teams page for team creation with slug auto-generation and availability checking
- Workspace context (`lib/workspace-context.tsx`) — provides `workspace`, `teams`, `userRole`, `isAdmin` to all workspace-scoped pages
- Team settings context (`lib/team-settings-context.tsx`) — provides team info to team settings pages
- Shared `GroupedList<T>` component (`components/grouped-list.tsx`) — **preferred list component** for all list views. Renders items in collapsible status groups with chevron toggles, colored status dots, group labels with counts, and empty states. Exports `GroupedList<T>`, `ListGroup<T>` interface, `groupedListRowClass` (consistent row styling with hover-reveal `...` dropdown via `group`/`group-hover:opacity-100`), and `formatRelativeDate()`. Used by: defects, test runs (list + detail results), environments, cycles, test plans, API tokens (workspace + team). **Prefer `GroupedList` over `DataTable` for new list views.**
- `DataTable` component (`components/data-table.tsx`) wrapping TanStack React Table with shadcn Table primitives — legacy, prefer `GroupedList` for new list views
- Shared `PageBreadcrumb` component (`components/page-breadcrumb.tsx`) — renders a breadcrumb bar with chevron separators; accepts `items` array (label + optional href/onClick) and `children` for right-side action buttons (menus, toggles, navigation). Used as the top bar on all list and detail pages
- Shared `LogViewer` component (`components/log-viewer.tsx`) — renders log output with ANSI color support (via `anser` library), collapsible step groups, line numbers, and full-text search; theme-aware with dual light/dark ANSI color palettes
- Shared `TestCasePropertiesSidebar` component (`components/test-case-properties-sidebar.tsx`) — right sidebar with dropdown selectors for test case properties (status, priority, severity, type, automation status, behavior, layer, flaky toggle, assignee)
- Shared `CommentSection` component (`components/comments/comment-section.tsx`) — threaded comments with replies, editing, resolving, emoji reactions, and @mentions; polymorphic via entityType + entityId
- Shared auth UI components (`components/auth-ui.tsx`): `AuthInput`, `AuthLabel`, `PasswordInput`
- Shared `TestCaseTreePicker` component (`components/test-case-tree-picker.tsx`) — reusable tree picker with checkboxes for selecting test cases; manages own expand/collapse and search state; used by test plan dialogs and create test run dialog
- Shared `SharedStepPicker` component (`components/shared-step-picker.tsx`) — dialog for selecting a shared step to insert into a test case; searchable list of active shared steps; on selection, fetches full step with actions and calls `onSelect` callback; used by test case detail via `TestStepsEditor`'s `onInsertSharedStep` prop
- Shared `AttachmentSection` component (`components/attachments/attachment-section.tsx`) — polymorphic attachment manager for any entity; SWR-loaded list, upload button (member+), delete button (admin/owner or own uploads); uses `AttachmentList` for display and `AttachmentUploader` for uploads
- Shared `AttachmentList` component (`components/attachments/attachment-list.tsx`) — grid display of attachments with image thumbnails, video/file icons; clicking images/videos opens a preview dialog with navigation arrows and download button; non-previewable files open in new tab
- Shared `AttachmentUploader` component (`components/attachments/attachment-uploader.tsx`) — drag-and-drop file upload with progress indicator; validates MIME types and file size; posts to `/api/attachments`
- Team settings components (`components/team-settings/`) — `team-info-form.tsx`, `team-tokens-list.tsx`, `test-plans-list.tsx`, `cycles-list.tsx`, `shared-steps-list.tsx`, `shared-step-detail.tsx` using `PageBreadcrumb` + `GroupedList` layout

**GroupedList pattern:** All list views (defects, test runs, environments, cycles, test plans, shared steps, tokens) use a consistent layout: `PageBreadcrumb` header with "New" button → `GroupedList` body with items grouped by status. Each row uses `groupedListRowClass` and includes a hover-reveal `...` `DropdownMenu` (using `group` + `group-hover:opacity-100`), a colored status dot, the item name, and right-aligned metadata. For SWR-loaded data, show a `RefreshCw` spinner before the list renders. The test run detail page also uses `GroupedList` for its results tab (grouped by result status), combined with a collapsible properties sidebar.

**Breadcrumb pattern:** All list and detail pages use `PageBreadcrumb`. Detail pages (test case, test run, test result, defect) add a `...` dropdown menu for actions (Delete, Reset to Untested) and a PanelRight toggle for the properties sidebar. Action menus are permission-guarded (e.g., delete only for owner/admin roles).

**Date formatting:** Locale-dependent dates (e.g., `toLocaleString()`) must be rendered client-side only to avoid hydration mismatches. Use `useState("—")` + `useEffect` to format after mount — never call `toLocaleString()` in the initial render of a server-rendered component.

### Test Repository

The test repo page (`/{workspace}/{team}/test-repo`) is a split-pane view: tree sidebar (left) + detail pane (right), managed by Zustand (`lib/stores/test-repo-store.ts`).

**Tree sidebar** (`test-repo-tree.tsx`): uses `react-arborist` for virtualized rendering with drag-and-drop reorder. Supports suites, sections (nested), and test cases. Inline folder creation/rename. Selection updates `selectedNode` in Zustand store.

**Test case creation — instant draft pattern:**
- Clicking "New Test Case" in the tree immediately POSTs to `/api/test-cases` with title `"Untitled"` and default properties — no separate create form
- `test-repo-content.tsx` manages creation via two effects: one fires the API call when `creatingTestCase` is set, another watches `testCases` for the new ID to appear after `router.refresh()` and auto-selects it
- The user lands directly in the edit view (`test-repo-detail-case.tsx`) where all fields auto-save on blur
- There is no dedicated create form component — creation and editing use the same detail view

**Test case editing — auto-save on blur:**
- `test-repo-detail-case.tsx` saves individual fields via `PATCH /api/test-cases/{id}` on blur (dirty-checked against `savedRef`)
- Properties sidebar (`components/test-case-properties-sidebar.tsx`) changes save immediately on value change — dropdown selectors for status, priority, severity, type, automation status, behavior, layer, flaky toggle, and assignee
- Test steps auto-save on blur: new steps POST on blur, existing steps PUT on blur
- Save state indicator: "Saving..." → "Saved" (2s) in the breadcrumb bar
- Component uses `key={testCase.id}` to remount cleanly when switching between test cases
- Comments section (`components/comments/comment-section.tsx`) at the bottom of test case detail — threaded comments with replies, editing, resolving, and emoji reactions

**State management (`test-repo-store.ts`):**
- `selectedNode` — currently displayed suite/section/test case
- `creatingTestCase` — parent context when creating (cleared after API call)
- `treePanelWidth` — resizable panel width (persisted to localStorage)
- `openNodes` — tree expand/collapse state per project (persisted to localStorage)

### Test Runs

The test runs feature provides test execution management at `/{workspace}/{team}/test-runs`.

**Pages:**
- `test-runs/page.tsx` → `test-runs-content.tsx` — list of test runs with `PageBreadcrumb` + `GroupedList` (grouped by run status), create dialog, environment/cycle selectors
- `test-runs/[runKey]/page.tsx` → `test-run-detail-content.tsx` — run detail with `GroupedList` results (grouped by result status), pie chart metrics, properties sidebar, and logs tab; `runKey` format is `{TEAM_KEY}-TR-{number}` (e.g., `MOAPP-TR-2`); server page resolves `runKey` to run via `getTestRunByKey()`, then uses UUID for API calls
- `test-runs/[runKey]/results/[caseKey]/page.tsx` → `test-result-execution-content.tsx` — individual result execution with step-by-step status, overall verdict, comment, duration, and logs tab; `caseKey` is the test case's human-readable key (e.g., `ENG-7`); server page resolves `caseKey` to result via `getTestResultByCaseKey()`, then uses UUID for API calls

**Supporting files:**
- `test-run-columns.tsx` — `TestRunRow` type definition (used by runs list `GroupedList`)
- `test-result-columns.tsx` — `TestResultRow` type definition (used by run detail `GroupedList`)
- `progress-bar.tsx` — shared status color/label helpers (`getStatusColor`, `getStatusLabel`, `getStatusTextColor`) and `StackedProgressBar` component
- `create-test-run-dialog.tsx` — dialog for creating new test runs; "Load from plan..." dropdown pre-populates tree from test plan, user can modify selection; properties sidebar for environment/cycle; uses shared `TestCaseTreePicker` component

**Test run detail (`test-run-detail-content.tsx`):**
- Breadcrumb bar with status action buttons (Start Run / Complete + Abort), `...` dropdown menu with Delete, and properties sidebar toggle
- Results/Logs tabs — Results tab uses `GroupedList` with results grouped by status (failed, blocked, untested, passed, skipped); each row has hover `...` menu for quick status change, case key, status dot, title, comment tooltip, duration, assignee avatar; rows are clickable links to result execution page. Logs tab lazy-loads run-level log chunks
- Properties sidebar: pie chart with status breakdown, environment, cycle, created by, created date
- Delete confirmation via AlertDialog; navigates back to runs list after deletion
- Status transitions: pending → in_progress → passed/failed/blocked (auto-computed based on result metrics)

**Test result execution (`test-result-execution-content.tsx`):**
- Breadcrumb bar with save indicator, "X of Y" counter, prev/next navigation (keyboard shortcuts J/K), `...` dropdown with "Reset to Untested", and properties sidebar toggle
- Execution/Logs tabs — Execution shows step-by-step status selectors, overall verdict buttons (keyboard shortcuts 1-4), comment, and duration; Logs tab lazy-loads result-level log chunks
- Properties sidebar: overall status, executed by (avatar), executed at, duration inputs
- Auto-save on blur for all fields; dirty-checking against `savedRef`
- Keyboard shortcuts: 1=Passed, 2=Failed, 3=Blocked, 4=Skipped, J=Next, K=Previous

**Query helpers (`lib/queries/test-runs.ts`):**
- `getProjectTestRuns(projectId)` — list runs with computed result metrics (includes `runKey`)
- `getTestRun(runId)` — single run with environment, cycle, and creator info (includes `runKey`)
- `getTestRunByKey(runKey)` — single run looked up by human-readable key (e.g., `MOAPP-TR-2`); used by `[runKey]` server pages
- `getTestRunResults(runId)` — results joined with test case/section info
- `getRunMetrics(runId)` — aggregated counts (passed, failed, blocked, skipped, untested, total, passRate)
- `computeRunStatus(runId)` — suggest run status based on result distribution
- `getTestResult(resultId)` — single result with case info
- `getTestResultByCaseKey(runId, caseKey)` — single result looked up by run ID and test case key (e.g., `ENG-7`); used by `[caseKey]` server page
- `getTestRunResultCaseKeys(runId)` — ordered case keys for prev/next navigation
- `getTestResultSteps(resultId)` — steps with existing step results

**Log infrastructure:**
- `test_run_log` DB table with dual scoping: run-level (testResultId = NULL) or result-level (testResultId set)
- Query helpers (`lib/queries/test-run-logs.ts`): `getRunLogs()`, `getResultLogs()`, `hasRunLogs()`, `hasResultLogs()`, `getNextChunkMeta()`
- API: `POST /api/test-runs/[id]/logs` and `POST /api/test-results/[id]/logs` to append chunks; GET to fetch
- `LogViewer` component (`components/log-viewer.tsx`): ANSI escape code rendering via `anser`, collapsible step groups, line numbers, full-text search with highlighting, theme-aware styling (light + dark mode ANSI colors)

### Defects

Defect/bug tracking at `/{workspace}/{team}/defects`, following the same list-view → detail-view flow as Test Runs.

**Pages:**
- `defects/page.tsx` → `defects-content.tsx` — list of defects with `PageBreadcrumb` + `GroupedList` (grouped by defect status: open, in_progress, reopened, fixed, verified, closed, deferred, rejected, duplicate), create dialog
- `defects/[defectKey]/page.tsx` → `defect-detail-content.tsx` — defect detail with editable fields, properties sidebar, comments, status transitions; `defectKey` format is `{TEAM_KEY}-D-{number}` (e.g., `ENGT-D-42`); server page resolves `defectKey` to defect via `getDefectByKey()`

**Supporting files:**
- `defect-columns.tsx` — `DefectRow` type definition (used by defects list `GroupedList`)
- `defect-status-helpers.ts` — status/severity/priority color and label helpers
- `create-defect-dialog.tsx` — split-pane dialog (content left, properties right); accepts optional `prefill` prop for pre-populating from test result context

**Defect detail (`defect-detail-content.tsx`):**
- Breadcrumb bar with status transition actions (Start Working, Mark Fixed, Verify, Close, Reopen) and `...` dropdown (Mark Duplicate, Reject, Defer, Delete)
- Left content: editable title, description, reproduction fields (steps/expected/actual), traceability links (test case, test run, external URL), comments
- Properties sidebar: status badge, defect ID, severity/priority/type/resolution selects, environment/cycle selects, created by, created date
- Auto-save on blur with dirty checking via savedRef; save state indicator (Saving.../Saved)

**"Fail + Create Defect" integration:**
- Test result execution page (`test-result-execution-content.tsx`) has a split button on the "Failed" status — clicking the main area marks as failed, clicking the dropdown arrow shows "Fail + Create Defect" which marks as failed AND opens CreateDefectDialog pre-populated with test result/run/case info

**Query helpers (`lib/queries/defects.ts`):**
- `getProjectDefects(projectId)` — list defects with assignee, environment, test case joins
- `getDefect(defectId)` — single defect with full joins (includes `testRunKey`)
- `getDefectByKey(defectKey)` — single defect looked up by human-readable key (e.g., `ENGT-D-42`); used by `[defectKey]` server page
- `getDefectsForTestResult(testResultId)` — defects linked to a specific test result

### Comments

Threaded comments with reactions, used on test cases, test results, and defects.

**Component:** `components/comments/comment-section.tsx` — polymorphic via `entityType` ("test_case" | "test_result" | "defect") + `entityId`

**Features:**
- Threaded replies (parent_id), inline editing, delete, resolve/unresolve
- Emoji reactions (toggle per user per emoji)
- @mentions with user search via `/api/comments/mentions`
- Uses SWR for data fetching with optimistic updates

**API:** `/api/comments` (GET list + POST create), `/api/comments/[id]` (PATCH edit + DELETE), `/api/comments/[id]/resolve` (POST toggle), `/api/comments/[id]/reactions` (POST toggle emoji)

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

All in `apps/web/.env.local` (gitignored via `.env*` pattern). Copy from `.env.local.example`:

**Core:**
- `DEPLOYMENT_ENV` — `"dev"` for local Docker (node-postgres), unset or `"prod"` for Vercel/NeonDB (neon-http)
- `DATABASE_URL` — PostgreSQL connection string (Neon URL for prod, `postgresql://lgtm:lgtm@localhost:5432/lgtm` for local Docker)
- `BETTER_AUTH_SECRET` — signing key (min 32 chars)
- `BETTER_AUTH_URL` — app base URL

**Storage:**
- `STORAGE_PROVIDER` — storage backend: `"vercel-blob"` (default) or `"s3"` (SeaweedFS/MinIO/AWS)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token (when `STORAGE_PROVIDER=vercel-blob`)
- `S3_ENDPOINT` — S3-compatible endpoint URL (when `STORAGE_PROVIDER=s3`, e.g. `http://localhost:8334`)
- `S3_REGION` — S3 region (default: `us-east-1`, placeholder for SeaweedFS)
- `S3_BUCKET` — S3 bucket name
- `S3_ACCESS_KEY_ID` — S3 access key
- `S3_SECRET_ACCESS_KEY` — S3 secret key
- `S3_PUBLIC_URL_BASE` — base URL for public file access; in dev mode use `http://localhost:3000/storage` (proxied through Next.js rewrite) to avoid port-forwarding issues; in production use the direct storage URL

**Optional:**
- `NEXT_PUBLIC_REGISTRATION_OPEN` — set to `"false"` to disable public signup (default: open)
- `RESEND_API_KEY` — Resend API key for invitation emails (optional; falls back to console.log)
- `EMAIL_FROM` — sender address for emails (e.g. `"LGTM <noreply@yourdomain.com>"`)
- `LOG_LEVEL` — logging level: debug | info | warn | error (default: info in prod, debug in dev)
- `LOG_TO_FILE` — set to `"true"` for file-based logging on VPS (default: false, logs to stdout)
- `LOG_FILE_PATH` — path to log file (default: ./logs/app.log)
- `LOG_MAX_FILES` — days of log retention (default: 30)
