# EIPsInsight — Context Brief (for a new agent / collaborator)

A standalone primer. Hand this to a fresh agent so it understands the platform
without re-deriving everything. Written 2026-10-28.

---

## What EIPsInsight is

EIPsInsight is an observability and analytics platform for the Ethereum
standards ecosystem. It tracks the full lifecycle of Ethereum Improvement
Proposals (EIPs), ERC standards, and RIPs: proposal status, editorial
governance, contributor activity, network upgrades, and real-world adoption.

The core idea: specs are public, but it is hard to tell **what has actually
shipped, what is being tested on devnets, and what is still just a proposal.**
EIPsInsight turns raw protocol and GitHub activity into views people can reason
about. Live at https://eipsinsight.com.

Audiences it serves (via a persona system): developer, editor, researcher,
builder, enterprise, newcomer.

---

## Tech stack (for anyone touching the code)

- **Framework**: Next.js (App Router), React Server Components, `unstable_cache`
  for ISR (300s default TTL).
- **RPC**: ORPC (`@orpc/server` + `@orpc/client`). All backend logic lives in
  typed procedure modules under `src/server/orpc/procedures/`, assembled in
  `src/server/orpc/router.ts`, exposed at `/api/rpc`.
- **Database**: PostgreSQL via Prisma 7 with PgBouncer pooling.
- **Auth**: Better Auth (GitHub/Google OAuth + Email OTP).
- **State**: TanStack Query (server state), Zustand (UI state, persona).
- **Styling**: TailwindCSS 4 + Radix UI + shadcn/ui (`src/components/ui/`).
- **Charts**: Recharts (SVG, supports CSS vars) and ECharts (canvas, needs
  resolved hex). Shared color helpers in `@/lib/chart-colors`.
- **External data**: ClickHouse (BlobLens — blob/DA/MEV data on `ba-data`),
  Blobscan API, GitHub, Ghost CMS (blog), Stripe (membership).
- **Dev**: `bun run dev` (port 3000), `bun run build`, `bun run lint`.

A separate **scheduler** repo (`eipsinsight_scheduler`) indexes GitHub activity,
devnet RPCs, and price data into Postgres on cron. App + scheduler share one DB.

---

## The main pages / featured hubs

EIPsInsight is organized around several "featured hubs" plus analytics and
governance tooling.

### Featured hubs
- **Account Abstraction** (`/aa`) — AA EIP tracking, overview, per-EIP pages
  (e.g. `/aa/eip-8141`), devnet activity toggles. See AA section below.
- **Lucid / Encrypted Mempool** (`/lucid`) — encrypted mempool + MEV protection
  project page, including a DEX Impact tab. Pulls sandwich-attack stats from
  BlobLens (ClickHouse).
- **Post-Quantum** (`/pq`) — PQ readiness, implementation matrices, a live PQ
  testnet (Daisugi PQTS: SPHINCS+ userops + EIP-8141 frame txs), adoption charts.
- **Blob Data Layer** (`/blobs`) — blob/DA/rollup/gas/market/MEV console.
  Overview, Fee Market (gauge/regime/forecast), Rollups (L2 cost-efficiency).

### Standards & exploration
- `/standards`, `/explore` — browse EIPs/ERCs/RIPs by status, category, repo.
- `/explore/roles` — contributor roles (editors, reviewers, authors).
- `/user/[actor]` — per-contributor profile (activity timeline, repo breakdown,
  action-type charts). Recently renamed from `/people`.

### Governance & upgrades
- `/upgrade` — network upgrade tracker (Pectra, Fusaka, Glamsterdam, etc.),
  schedule, devnets, countdowns.
- `/calls`, `/decisions` — AllCoreDevs protocol calls and decisions.
- `/eipip` — EIPIP (EIP Improvement Process) meeting recaps.
- `/officehours` — office hours.

### Analytics
- `/analytics/reviewers`, `/editors`, `/authors`, `/contributors` — editorial
  activity dashboards with leaderboards, KPIs, and shareable OG cards.

---

## Account Abstraction — the material for the talk

(The upcoming EIP Hub talk is on AA. This is the substance.)

### The AA stack — three layers that compose, not compete
1. **ERC-4337 — Account Abstraction via alt mempool.**
   Smart accounts without any protocol change. Introduces UserOperations, a
   separate mempool, bundlers, EntryPoint contract, and paymasters. Already live
   on mainnet.
2. **EIP-7702 — Set code for EOAs.**
   Shipped in the **Pectra** upgrade. Lets a plain EOA temporarily delegate to
   smart-contract code within a transaction. Bridges existing EOAs to AA
   features (batching, gas sponsorship, session keys) **without migrating users
   to a new address.** This is the practical turning point for AA adoption.
3. **Native / enshrined AA.**
   Account abstraction at the protocol level. Tracked via **EIP-7701** (native
   AA) and **RIP-7560** (rollup-focused native AA). Being tested on devnets.

### Supporting standards
- **ERC-7579** — minimal modular smart accounts (modules: validators,
  executors, hooks).
- **ERC-6900** — modular smart contract accounts and plugins.

### EIP-8141 (EIPsInsight's edge)
EIPsInsight tracks EIP-8141 frame transactions on a live devnet. The scheduler
indexes a devnet RPC (currently the `bogota-devnet-0` network, same chainId as
the former `frames-devnet-0`) into Postgres (`frames_devnet_*` tables), surfaced
on `/aa/eip-8141` via a devnet toggle. This is native-AA-adjacent work and is a
concrete "being tested right now" data point most speakers will not have.
NOTE: confirm 8141's exact framing/status against the live page before stating
it on stage.

### The talk's throughline
"**Shipped, testing, or just a proposal?**" — 4337 is shipped, 7702 is shipped
in Pectra, native AA (7701/7560) is in devnets. EIPsInsight is the tool that
lets you see which is which with live data. The signature moment of the talk is
a live walk-through of `/aa` (status + devnet activity + adoption).

### Talk logistics (current plan)
- Event: EIP Hub (Devcon-adjacent), Nov 3–6 2026.
- Fits **Nov 5: Application EIPs & Adoption** (or Nov 4 Protocol/Core for the
  7702 / native-AA lean).
- Format: 15–20 min talk + short live demo + Q&A.
- EIP numbers to cite: ERC-4337, EIP-7702 (Pectra), ERC-7579, ERC-6900,
  EIP-7701, RIP-7560, EIP-8141.

---

## Conventions worth knowing

- **Content style**: no em dashes; avoid brackets/parentheses in polished copy;
  avoid the word "telemetry"; keep descriptions tight.
- **Charts**: Recharts `Bar`/`Area` need `isAnimationActive={false}` or they
  render at 0 height (reactCompiler interaction).
- Deployment is CI/CD via GitHub Actions to a custom server (PM2), health-check
  with auto-rollback.

---

## Good first things for a new agent to do

- To build the AA deck: read `/aa` pages and the AA ORPC procedures, verify each
  EIP's current status against live data, then draft slides.
- Dev server: `bun run dev` then open http://localhost:3000.
- Verify AA facts before any public claim — statuses move (what's in which
  devnet, 7702 post-Pectra details).
