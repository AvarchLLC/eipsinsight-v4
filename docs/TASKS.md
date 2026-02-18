# EIPsInsight — Remaining Tasks

> Full audit: [Site Map](README.md). Hours are rough estimates (single developer).

---

## Remaining (Top Priority)

---

### 1. API & Access Control

| No. | Task | Hours | Where | Notes |
|------|------|-------|-------|-------|
| 1.1 | **Private API routes** | 2hrs | oRPC procedures | Enforce auth (session or `x-api-token`) for all data routes; currently some may be public |
| 1.2 | **API token management UI** | 4hrs | `/api-tokens` | Profile links here but page missing — create/revoke tokens, show usage, scopes |
| 1.3 | **Rate limiting per tier** | 3hrs | Middleware / procedures | Enforce `MembershipTier.requestLimit`; track usage per user/token |
| 1.4 | **Token scopes** | 4hrs | `ApiToken` model | Optional: read vs write, per-resource (e.g. analytics-only) |

### 2. Payments & Monetization

| No. | Task | Hours | Where | Notes |
|------|------|-------|-------|-------|
| 2.1 | **Stripe payment tiers** | 8hrs | Checkout, webhooks | `MembershipTier` exists — add Stripe Products/Prices, checkout flow, subscription lifecycle |
| 2.2 | **Stripe webhooks** | 2hrs | `/api/webhooks/stripe` | Handle `checkout.session.completed`, `customer.subscription.updated/deleted` |
| 2.3 | **x402 agentic payments** | 8hrs | Scraping / API access | HTTP 402 Pay Required — pay-per-request for bots/scrapers; integrate x402 protocol |
| 2.4 | **Tier gating** | 2hrs | UI + procedures | Show upgrade prompts when free tier limit hit; gate premium analytics/export |

### 3. Content & Features

| No. | Task | Hours | Where | Notes |
|------|------|-------|-------|-------|
| 3.1 | **News** | 6hrs | `/resources/news` | Placeholder → full timeline of EIP ecosystem updates |
| 3.2 | **Videos** | 4hrs | `/resources/videos` | Placeholder → video library/embeds |
| 3.3 | **Featured resources links** | 1hr | `featured.ts` | Links to `/resources/blogs/eip-governance`, `dencun-upgrade` — create those posts or update links |
| 3.4 | **Social & Community Updates** | 4hrs | Home | Not clearly implemented |
| 3.5 | **Analytics export** | 2hrs | `analytics/layout.tsx` | `// TODO: Implement export functionality` |
| 3.6 | **`discussions_to` in proposals** | 1hr | `proposals.ts` | Add field to schema/response |
| 3.7 | **EIP content from GitHub** | 2hrs | `proposals.ts` | Fetch markdown content |
| 3.8 | **Author page navigation** | 3hrs | `search-bar.tsx` | `// TODO: Navigate to author page when available` |

### 4. Other

| No. | Task | Hours | Where | Notes |
|------|------|-------|-------|-------|
| 4.1 | **Move repo to Avarch org** | 1hr | GitHub/GitLab | Transfer repo to Avarch organisation with full commit history preserved |
| 4.2 | **API documentation** | 4hrs | `/api-docs` or OpenAPI | Public docs for token-based access; examples, rate limits, tiers |
| 4.3 | **CORS for API** | 1hr | RPC / API routes | Allow credentialed cross-origin requests for external clients |

## 5. Partial / Optional

| No. | Task | Hours | Notes |
|------|------|-------|-------|
| 5.1 | Documentation Links | 1hr | `/resources/docs` exists; may need more curation |
| 5.2 | Latest News & Announcements | — | Overlaps with News task |
| 5.3 | Dencun | 1hr | In timeline; may need dedicated page |
| 5.4 | Upgrade Archive | 2hr | `/upgrade` lists upgrades; could be enhanced |

## 6. Done

| No. | Feature | Status |
|------|----------|--------|
| 6.1 | Blogs | DB-backed, admin editor at `/admin/blogs`, public at `/resources/blogs` |
| 6.2 | FAQ | `/resources/faq` |
| 6.3 | Dashboard, Explore, Search, Analytics, Standards, Tools, Insights, Network Upgrades | Implemented |
| 6.4 | Auth & Admin | `requireAdmin`, role checks, admin layout |
- **Dashboard, Explore, Search, Analytics, Standards, Tools, Insights, Network Upgrades** — implemented
- **Auth & Admin** — `requireAdmin`, role checks, admin layout
