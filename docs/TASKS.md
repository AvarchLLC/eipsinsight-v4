# EIPsInsight — Active Tasks

> Audit baseline: routes/components/procedures in current repo state.  
> Goal: keep only pending work here; move completed items to archive.

---

## 0. Critical Routing & Link Hygiene

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 0.2 | Fix stale internal links | P0 | 1h | `src/lib/persona.ts`, `src/data/resources/featured.ts` | `"/resources/getting-started"` and `"/upgrade/cancun"` likely unresolved/stale. Replace with valid pages or add routes. |
| 0.3 | Align docs with live routing | P1 | 1h | `docs/architecture.md`, `docs/personas.md`, `docs/sitemap.md` | Docs still mention legacy `/all` defaults. Update to current behavior. |

---

## 1. API Security, Scopes, and Limits

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 1.1 | Procedure-level auth policy audit | P0 | 3h | `src/server/orpc/procedures/*` | Confirm each procedure is intentionally `publicProcedure`, `optionalAuthProcedure`, or `protectedProcedure`. |
| 1.2 | Enforce API token scopes | P0 | 4h | `src/server/orpc/procedures/*`, `src/server/orpc/procedures/types.ts` | `requireScope` exists but is not used. Apply per-procedure scope checks. |
| 1.3 | Wire rate limiting consistently into oRPC | P0 | 3h | `src/server/orpc/middleware/rate-limit.ts`, procedure wrappers | Rate-limit module exists; ensure it is actually attached across target procedures. |
| 1.4 | Add explicit API CORS policy | P1 | 1h | API/RPC route handlers | No explicit CORS headers currently configured for external token clients. |

---

## 2. Product IA Refinements (From UX Review)

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 2.1 | Decide canonical “Standards vs Explore” structure | P1 | 4h | IA + sidebar + docs | Evaluate merging discovery modes under Standards (All/Repo/Status/Year/Role/Trending). |
| 2.2 | Re-evaluate `/explore/trending` placement | P2 | 2h | Explore IA | Consider making trending homepage/dashboard signal instead of deep nav route. |
| 2.3 | Clarify Analytics vs Insights boundaries in-page | P1 | 2h | Page intros/microcopy | Make “metrics vs interpretation” distinction explicit on landing sections. |
| 2.4 | Add lifecycle-first mapping doc | P1 | 2h | `docs/` | Add “Idea → Draft → Review → Merge → Upgrade → Post-upgrade” mapping to product surfaces. |
| 2.5 | Optional: lifecycle-first sidebar experiment | P2 | 6h | Nav model + docs | Prototype alternative information spine and compare against feature-first nav. |

---

## 3. Upgrade Hub Depth

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 3.1 | Add upgrade readiness panel | P1 | 4h | `/upgrade/[slug]` | Include “included EIPs, status mix, client readiness, governance threads” summary block. |
| 3.2 | Add merge/change timeline module on upgrade pages | P1 | 4h | `/upgrade/[slug]` | Strengthen “upgrade observability hub” positioning. |

---

## 4. Platform / GTM Backlog

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 4.1 | Public API docs route (or OpenAPI surface) | P1 | 4h | `/api-docs` or docs site | `docs/API.md` exists; expose a product-facing docs entrypoint with auth/scope/rate-limit examples. |
| 4.2 | x402 agentic payments | P3 | 8h | API monetization layer | Keep as strategic backlog; not required for current core flows. |

---

## Archived (Completed / Implemented)

| Item | Status Snapshot |
|------|-----------------|
| API token management UI | Implemented at `/api-tokens` with create/revoke/list/stats dialogs. |
| Stripe payment tiers + checkout/subscription flow | Implemented (`/pricing`, billing pages, checkout/portal/cancel/resume routes, membership tier handling). |
| Stripe webhooks | Implemented at `/api/webhooks/stripe` with subscription lifecycle handlers. |
| News page implementation | Implemented at `/resources/news` (Ghost-backed client feed). |
| Videos page implementation | Implemented at `/resources/videos` with listing/filter/admin flows. |
| Social & community updates section | Implemented on homepage/public surfaces. |
| Analytics export | Implemented (CSV/JSON hooks + multiple analytics export endpoints/UI actions). |
| `discussions_to` in proposals | Implemented in proposals procedures/frontmatter extraction. |
| EIP content from GitHub | Implemented via proposal content/frontmatter fetch flow. |
| Author page navigation | Implemented (search routes to `/people/[actor]`). |
| Core app surfaces | Dashboard, Explore, Search, Analytics, Standards, Tools, Insights, Upgrades, Resources are present. |
| Auth/Admin | Role checks and admin pages/routes present. |
| Persona foundation | Persona defaults/nav order/store/sync + accent token system implemented. |
| `/all` route normalization | Completed: redirects and internal links now point to `/standards`; `/all` kept only as legacy redirect alias. |
