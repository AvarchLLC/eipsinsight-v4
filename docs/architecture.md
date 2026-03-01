# EIPsInsight — Architecture & Routing

> **As of implementation audit.** See [TASKS.md](./TASKS.md) for gaps.

## Top-Level Structure

| Path | Description | Status |
|------|-------------|--------|
| `/` | Home — standards explorer (type/status tabs) | ✅ |
| `/landing` | Marketing/landing page | ✅ |
| `/dashboard` | Dashboard (KPIs, charts) | ✅ |
| `/p` | Persona onboarding hub | ✅ |
| `/p/[persona]` | Persona redirect → default landing | ✅ |
| `/explore` | Explore hub | ✅ |
| `/search` | Search (EIPs, PRs, issues) | ✅ |
| `/standards` | Standards (EIPs, ERCs, RIPs) | ✅ |
| `/analytics` | Analytics hub | ✅ |
| `/tools` | Tools hub | ✅ |
| `/insights` | Insights hub | ✅ |
| `/upgrade` | Network Upgrades (singular) | ✅ |
| `/resources` | Resources hub | ✅ |
| `/profile` | User profile | ✅ |
| `/settings` | User settings | ✅ |
| `/admin/blogs` | Admin blog management | ✅ |
| `/login` | Auth login | ✅ |
| `/all` | Legacy alias redirected to `/standards` | ✅ |

---

## Canonical Feature URLs (Shared by All Personas)

These URLs never change and are safe to share:

| URL | Content |
|-----|---------|
| `/upgrade/fusaka` | Fusaka upgrade |
| `/upgrade/glamsterdam` | Glamsterdam upgrade |
| `/upgrade/hegota` | Hegotá upgrade |
| `/upgrade/pectra` | Pectra upgrade |
| `/eip/1559` | EIP-1559 |
| `/erc/20` | ERC-20 |
| `/rip/1` | RIP-1 |
| `/analytics/prs` | PRs analytics |
| `/analytics/editors` | Editors analytics |
| `/insights/year-month-analysis` | Year-month analysis |

---

## Next.js App Router Structure (Actual)

```
app/
  layout.tsx
  (public)/
    page.tsx                  → / (standards explorer with type/status tabs)
  landing/
    page.tsx                  → /landing
  dashboard/
    page.tsx                  → /dashboard
  p/
    page.tsx                  → /p (persona onboarding)
    [persona]/
      page.tsx                → /p/:persona (redirects to default)
  explore/
    page.tsx                  → /explore
    years/page.tsx            → /explore/years
    status/page.tsx           → /explore/status
    roles/page.tsx            → /explore/roles
    trending/page.tsx         → /explore/trending
  search/
    page.tsx                  → /search
  standards/
    page.tsx                  → /standards
  analytics/
    page.tsx                  → /analytics
    eips/page.tsx             → /analytics/eips
    prs/page.tsx              → /analytics/prs
    editors/page.tsx          → /analytics/editors
    reviewers/page.tsx        → /analytics/reviewers
    authors/page.tsx          → /analytics/authors
    contributors/page.tsx     → /analytics/contributors
  tools/
    page.tsx                  → /tools
    eip-builder/page.tsx      → /tools/eip-builder
    board/page.tsx            → /tools/board
    dependencies/page.tsx     → /tools/dependencies
    timeline/page.tsx         → /tools/timeline
  insights/
    page.tsx                  → /insights
    year-month-analysis/page.tsx
    governance-and-process/page.tsx
    upgrade-insights/page.tsx
    editorial-commentary/page.tsx
  upgrade/
    page.tsx                  → /upgrade
    [slug]/page.tsx           → /upgrade/:slug
  resources/
    page.tsx                  → /resources
    faq/page.tsx              → /resources/faq
    blogs/page.tsx            → /resources/blogs
    blogs/[slug]/page.tsx     → /resources/blogs/:slug
    videos/page.tsx           → /resources/videos
    news/page.tsx             → /resources/news
    docs/page.tsx             → /resources/docs
  (proposal)/
    [repo]/[number]/page.tsx  → /eip/:n, /erc/:n, /rip/:n
  admin/
    layout.tsx                → /admin/* (auth required)
    blogs/page.tsx            → /admin/blogs
    blogs/new/page.tsx
    blogs/[id]/edit/page.tsx
  profile/
    page.tsx                  → /profile
  settings/
    page.tsx                  → /settings
  (auth)/
    login/page.tsx            → /login
    verify-request/page.tsx
  debug/
    persona/page.tsx          → /debug/persona (dev only)
```

---

## Redirects (next.config.ts)

| Source | Destination |
|--------|-------------|
| `/standards-by-repo` | `/standards` |
| `/all` | `/standards` |
| `/n-w-upgrades` | `/upgrade` |
| `/eips/:path*` | `/eip/:path*` |
| `/ercs/:path*` | `/erc/:path*` |
| `/rips/:path*` | `/rip/:path*` |

---

## Persona Redirects (Implementation)

**Pattern:** Client-side redirect in `app/p/[persona]/page.tsx` using `PERSONA_DEFAULTS` from `persona.ts`.

```ts
// src/lib/persona.ts
export const PERSONA_DEFAULTS: Record<Persona, string> = {
  developer: "/upgrade",
  editor: "/standards",
  researcher: "/analytics/prs",
  builder: "/erc",
  enterprise: "/upgrade",
  newcomer: "/",
};
```

---

## Implementation Notes

| Item | Implementation |
|------|-----------------|
| Upgrades path | `/upgrade` (singular), not `/upgrades` |
| EIP/ERC/RIP pages | `/eip/:n`, `/erc/:n`, `/rip/:n` via `(proposal)/[repo]/[number]` |
| Board | `/tools/board` (under Tools, not Analytics) |
| Persona redirects | Client-side in `app/p/[persona]/page.tsx` — stores persona, then redirects |
| Nav reordering | `PERSONA_NAV_ORDER` + `FEATURES.PERSONA_NAV_REORDER` |
| Per-persona defaults | `PERSONA_PAGE_CONFIG` (analytics view, standards focus, etc.) |
