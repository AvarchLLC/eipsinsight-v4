# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run lint         # ESLint

# Database
bunx prisma generate          # Regenerate Prisma client (also runs on postinstall)
bunx prisma migrate deploy    # Apply pending migrations
bunx prisma db seed           # Seed the database
```

## Architecture

**EIPsInsight** is an observability and analytics platform for Ethereum Improvement Proposals (EIPs, ERCs, RIPs). It tracks proposal statuses, contributor activity, editorial governance, and network upgrades.

### Tech Stack

- **Framework**: Next.js (App Router) with React Server Components and `unstable_cache` for ISR (300s default TTL)
- **RPC Layer**: ORPC (`@orpc/server` + `@orpc/client`) — all backend logic lives in typed procedure modules under `src/server/orpc/procedures/`, assembled in `src/server/orpc/router.ts`, exposed at `/api/rpc`
- **Database**: PostgreSQL via Prisma 7 with PgBouncer pooling (max 3 connections per serverless instance — see `src/lib/prisma.ts`)
- **Auth**: Better Auth with GitHub/Google OAuth and Email OTP (`src/lib/auth.ts`)
- **State**: TanStack Query for server state; Zustand for UI state (persona, sidebar)
- **Payments**: Stripe for membership tiers
- **Cache/Sessions**: Redis via ioredis
- **Styling**: TailwindCSS 4 + Radix UI + shadcn/ui components in `src/components/ui/`

### Persona System

The app adapts navigation, defaults, and highlights based on six user personas defined in `src/lib/persona.ts`: `developer`, `editor`, `researcher`, `builder`, `enterprise`, `newcomer`. Persona state is managed in `src/providers/PersonaProvider.tsx` (localStorage + optional DB sync), Zustand store in `src/stores/personaStore.ts`, and synced to DB via `src/hooks/usePersonaSync.ts`. The sidebar (`src/components/app-sidebar.tsx`) renders persona-aware navigation items.

### Data Flow

1. Pages (App Router RSC) call ORPC procedures server-side via `src/proxy.ts`
2. Client components use TanStack Query with the ORPC client (`src/lib/orpc.ts`) for interactive fetching
3. All RPC procedures go through `src/server/orpc/middleware/` (auth checks, rate limiting)
4. Prisma queries hit PostgreSQL through the pooled client in `src/lib/prisma.ts`

### Key Directories

- `src/app/` — App Router pages; route groups `(auth)`, `(proposal)`, `(public)` for layout sharing
- `src/server/orpc/procedures/` — 20+ RPC modules (`standards.ts`, `analytics.ts`, `explore.ts`, `upgrades.ts`, `blog.ts`, etc.)
- `src/data/` — Static data: network upgrade metadata, timelines, contributor roles (not from DB)
- `src/lib/` — Singleton clients: `prisma.ts`, `auth.ts`, `redis.ts`, `stripe.ts`, `cloudinary.ts`
- `prisma/` — Schema, migrations, seed scripts, and raw SQL index files

### Environment Variables

All env vars are validated via Zod in `src/env.ts` (using `@t3-oss/env-nextjs`). See `.env.example` for the full list including `DATABASE_URL`, `BETTER_AUTH_SECRET`, OAuth credentials, Cloudinary, Ghost CMS, Stripe, and Redis.

### Deployment

CI/CD via `.github/workflows/deploy.yml`: push to `main` → Bun build → SSH to custom server → PM2 process restart on port 3001 → health check → auto-rollback on failure. Discord webhooks notify on deploy events.