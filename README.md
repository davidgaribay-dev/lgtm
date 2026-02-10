# LGTM

A test case management system built with Next.js, designed for teams to organize, execute, and track test cases.

## Features

- **Test case management** — Create and organize test cases with steps, preconditions, priorities, and tags
- **Hierarchical organization** — Suites, sections (nested folders), and tags for flexible test structure
- **Test execution** — Plan test runs, record results (pass/fail/blocked/skip), track per-step outcomes
- **Team collaboration** — Organizations with role-based access (owner, admin, member, viewer)
- **Invitations** — Invite team members by email with role assignment
- **Share links** — Grant read-only access to external guests without requiring an account
- **File attachments** — Upload images and files to test cases and results via Vercel Blob

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** Neon serverless PostgreSQL via Drizzle ORM
- **Auth:** Better Auth (email/password + organization plugin for RBAC)
- **Storage:** Vercel Blob for file uploads
- **Styling:** Tailwind CSS 4, shadcn/ui, Lucide icons

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store (for file uploads)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Random signing key (min 32 chars, generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — App base URL (e.g., `http://localhost:3000`)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token

Optional variables:
- `NEXT_PUBLIC_REGISTRATION_OPEN` — Set to `"false"` to disable public signup (only invited users can join)

3. Push the schema to your database:

```bash
npm run db:push
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate migration SQL from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly to DB (prototyping) |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
