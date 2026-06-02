# EIPsInsight — Active Tasks

> Audit baseline: June 2026.
> Goal: Keep only pending work here; moved completed items to archive.

---

## 1. API Security, Scopes, and Limits

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 1.1 | Procedure-level auth policy audit | P0 | 3h | `src/server/orpc/procedures/*` | Confirm each procedure is intentionally `publicProcedure`, `optionalAuthProcedure`, or `protectedProcedure`. |
| 1.2 | Enforce API token scopes | P0 | 4h | `src/server/orpc/procedures/*` | `requireScope` exists but is not used. Apply per-procedure scope checks. |
| 1.3 | Wire rate limiting consistently into oRPC | P0 | 3h | `src/server/orpc/middleware/rate-limit.ts` | Rate-limit module exists; ensure it is actually attached across target procedures. |
| 1.4 | Add explicit API CORS policy | P1 | 1h | API/RPC route handlers | No explicit CORS headers configured for external token clients. |

---

## 2. Technical Debt & Modularization

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 2.1 | Refactor `analytics.ts` procedure | P1 | 6h | `src/server/orpc/procedures/analytics.ts` | File is >250KB. Split into `contributor-analytics.ts`, `editor-analytics.ts`, etc. |
| 2.2 | Refactor `explore.ts` procedure | P1 | 4h | `src/server/orpc/procedures/explore.ts` | Similar to analytics, needs better domain isolation. |
| 2.3 | Fix stale internal links | P0 | 1h | `src/lib/persona.ts`, `src/data/resources/featured.ts` | `"/resources/getting-started"` and `"/upgrade/cancun"` likely unresolved/stale. |

---

## 3. Testing Infrastructure (Critical Gap)

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 3.1 | Setup Vitest for unit testing | P0 | 4h | Root | Add Vitest, configure for Next.js/Prisma, add `bun run test`. |
| 3.2 | Setup Playwright for E2E testing | P1 | 6h | Root | Add Playwright, configure CI flow, add `bun run test:e2e`. |
| 3.3 | Add test coverage for core oRPC procedures | P1 | 8h | `src/server/orpc/procedures` | Focus on auth, proposals, and analytics. |

---

## 4. Product IA & Content

| No. | Task | Priority | Est. | Where | Notes |
|-----|------|----------|------|-------|-------|
| 4.1 | Add lifecycle-first mapping doc | P1 | 2h | `docs/` | Add “Idea → Draft → Review → Merge → Upgrade → Post-upgrade” mapping to product surfaces. |
| 4.2 | Re-enable `builder` and `newcomer` personas | P2 | 4h | `src/lib/persona.ts` | Reintroduce after dedicated UX/content pass. |
| 4.3 | Align docs with live routing | P1 | 1h | `docs/architecture.md`, `docs/sitemap.md` | Update to current behavior (remove legacy `/all` mentions). |

---

## Archived (Completed / Implemented)

| Item | Status |
|------|--------|
| PR Detail Page (`/pr/[repo]/[number]`) | ✅ Implemented |
| Issue Detail Page (`/issue/[repo]/[number]`) | ✅ Implemented |
| About, Privacy, Grants, Terms pages | ✅ Implemented |
| Feedback Operations Dashboard (`/admin/feedback`) | ✅ Implemented |
| Contributor Activity Heatmaps | ✅ Implemented |
| Editor Activity Heatmaps | ✅ Implemented |
| Status Transition Stacked Charts | ✅ Implemented |
| AI EIP Summarizer API | ✅ Implemented |
| API token management UI | ✅ Implemented |
| Stripe payment tiers + checkout | ✅ Implemented |
| News & Videos page implementations | ✅ Implemented |
| Analytics export (CSV/JSON) | ✅ Implemented |
| Author page navigation | ✅ Implemented |
