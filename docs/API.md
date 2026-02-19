# EIPsInsight API Documentation

This document describes all API endpoints available in the EIPsInsight application.

## Overview

The API consists of two main parts:

1. **oRPC Procedures** – RPC-style endpoints at `/rpc/{category}/{method}` (POST)
2. **REST API Routes** – Traditional HTTP endpoints under `/api/*`

### Authentication

- **Session-based**: Use cookies from a logged-in session (for browser clients)
- **API Token**: Send `x-api-token` header for programmatic access. Tokens are validated against `apiToken` table and must not be expired.

Most data procedures require either a valid session or a valid `x-api-token`. Account and preferences procedures require a session.

---

## oRPC Procedures

**Base URL**: `POST /rpc/{category}/{method}`

Example: `POST /rpc/analytics/getActiveProposals` with JSON body `{ "repo": "eips" }`

### auth

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getSession` | None | `{}` | Returns current session or null |

### account

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getMe` | Session | `{}` | Get current user (id, name, email, image, role) |
| `update` | Session | `{ name?: string, image?: string, avatarUrl?: string }` | Update user profile |
| `uploadAvatar` | Session | `{ fileName: string, base64Data: string }` | Upload avatar image; returns `{ url }` |

### preferences

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `get` | Session | `{}` | Get user preferences (persona, default_view) |
| `update` | Session | `{ persona?: 'developer'\|'editor'\|'researcher'\|'builder'\|'enterprise'\|'newcomer', default_view?: { upgradesView?, analyticsView?, standardsView? } }` | Update preferences |
| `setPersona` | Session | `{ persona: string }` | Set persona only |
| `reset` | Session | `{}` | Delete preferences (reset to defaults) |

### search

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `searchProposals` | API Token | `{ query: string, limit?: number }` (default 50) | Search EIPs/ERCs/RIPs by number, title, author, status, type, category |
| `searchAuthors` | API Token | `{ query: string, limit?: number }` (default 50) | Search authors/people from PRs, issues, contributor_activity |
| `searchPRs` | API Token | `{ query: string, limit?: number }` (default 50) | Search pull requests |
| `searchIssues` | API Token | `{ query: string, limit?: number }` (default 50) | Search issues |

### proposals

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getProposal` | API Token | `{ repo: 'eip'\|'erc'\|'rip'\|'eips'\|'ercs'\|'rips', number: number }` | Get proposal overview |
| `getStatusEvents` | API Token | `{ repo, number }` | Get status timeline events |
| `getTypeEvents` | API Token | `{ repo, number }` | Get type timeline events |
| `getUpgrades` | API Token | `{ repo, number }` | Get upgrade inclusion for proposal |
| `getContent` | API Token | `{ repo, number }` | Get markdown content/file path (placeholder) |
| `getGovernanceState` | API Token | `{ repo, number }` | Get governance state for linked PR |

### upgrades

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `listUpgrades` | API Token | `{}` | List all upgrades with stats |
| `getUpgradeStats` | API Token | `{}` | Aggregate stats across upgrades |
| `getUpgrade` | API Token | `{ slug: string }` | Get upgrade by slug |
| `getUpgradeCompositionCurrent` | API Token | `{ slug: string }` | Get current EIP composition for upgrade |
| `getUpgradeCompositionEvents` | API Token | `{ slug: string, limit?: number }` (default 50) | Get composition events (activity feed) |
| `getUpgradeTimeline` | API Token | `{ slug: string }` | Get timeline data grouped by date |

### governance

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getWaitingStates` | API Token | `{}` | Get governance waiting state counts |
| `getResponsibilityMetrics` | API Token | `{}` | Editor/author metrics (count, median wait days) |
| `getWaitingTimeline` | API Token | `{}` | Waiting timeline by bucket (< 7 days, 7–30, 30–90, 90+) |
| `getNeedsAttention` | API Token | `{ minDays?: number, state?: 'WAITING_AUTHOR'\|'WAITING_EDITOR'\|'WAITING_COMMUNITY'\|'IDLE' }` | PRs needing attention (limit 50) |
| `getLongestWaitingPR` | API Token | `{ state?: 'WAITING_AUTHOR'\|'WAITING_EDITOR' }` | Longest waiting PR |

### governanceTimeline

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getTimelineByCategory` | API Token | `{ includeRIPs?: boolean }` (default true) | Timeline by category |
| `getTimelineByStatus` | API Token | `{ includeRIPs?: boolean }` | Timeline by status |
| `getDetailedDataByYear` | API Token | `{ year: number, includeRIPs?: boolean }` | Detailed data for a year |
| `getTrendingProposals` | API Token | `{ limit?: number }` (default 6) | Trending from Ethereum Magicians |

### historical

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `getHistoricalGrowth` | API Token | `{ mode?: 'category'\|'status', includeRIPs?: boolean }` | Historical growth by category or status |

### analytics

All analytics procedures accept `repo?: 'eips' | 'ercs' | 'rips'` where applicable.

#### EIP Analytics

| Method | Input | Description |
|--------|-------|-------------|
| `getActiveProposals` | `{ repo? }` | Counts: total, draft, review, lastCall |
| `getActiveProposalsDetailed` | `{ repo? }` | List of active proposals with details |
| `getLifecycleData` | `{ repo? }` | Lifecycle stage counts (Draft, Review, etc.) |
| `getLifecycleDetailed` | `{ repo? }` | Full list with status |
| `getStandardsComposition` | `{ repo? }` | Type/category composition |
| `getStandardsCompositionDetailed` | `{ repo? }` | Detailed composition with EIPs |
| `getRecentChanges` | `{ limit?, repo? }` (limit default 5) | Recent status changes |
| `getDecisionVelocity` | `{ repo? }` | Median days for transitions |
| `getMomentumData` | `{ months?, repo? }` (months default 12) | Status events per month |
| `getLastCallWatchlist` | `{ repo? }` | EIPs in Last Call with deadlines |
| `getEIPStatusTransitions` | `{ repo?, from?, to? }` | Status transition counts |
| `getEIPThroughput` | `{ repo?, months? }` (months default 12) | Throughput by month/status |
| `getEIPHeroKPIs` | `{ repo?, from?, to? }` | Hero KPIs (active, newDrafts, finalized, stagnant) |

#### PR Analytics

| Method | Input | Description |
|--------|-------|-------------|
| `getRecentPRs` | `{ limit?, repo? }` (limit default 5) | Recent PRs |
| `getPRMonthlyActivity` | `{ from?, to?, repo? }` | Monthly PR activity (created, merged, closed, open) |
| `getPROpenState` | `{ repo? }` | Open PR stats (total, median age, oldest) |
| `getPRGovernanceStates` | `{ repo? }` | Governance state distribution |
| `getPRLabels` | `{ repo? }` | Label counts on open PRs |
| `getPRLifecycleFunnel` | `{}` | Funnel: created → reviewed → merged/closed |
| `getPRTimeToOutcome` | `{ repo? }` | Median/p75/p90 days (first_review, first_comment, merge, close) |
| `getPRStaleness` | `{ repo? }` | Open PR age buckets |
| `getPRStaleHighRisk` | `{ days?, repo? }` (days default 30) | Stale PRs with no recent activity |
| `getPRMonthHeroKPIs` | `{ year, month, repo? }` | Month-scoped PR KPIs |
| `getPROpenClassification` | `{ repo? }` | Open PR classification (DRAFT, TYPO, NEW_EIP, etc.) |
| `getPRGovernanceWaitingState` | `{ repo? }` | Waiting state with median wait, oldest PR |
| `getPROpenExport` | `{ repo? }` | Open PRs with governance state (for CSV/JSON) |

#### Contributor Analytics

| Method | Input | Description |
|--------|-------|-------------|
| `getContributorKPIs` | `{}` | Total contributors, active 30d, activities |
| `getContributorActivityByType` | `{ from?, to?, repo? }` | Activity by type |
| `getContributorActivityByRepo` | `{ from?, to? }` | Activity by repo |
| `getContributorRankings` | `{ sortBy?, repo?, from?, to?, limit? }` (sortBy: total/reviews/status_changes/prs_authored/prs_reviewed) | Contributor rankings |
| `getContributorProfile` | `{ actor: string, limit? }` (limit default 100) | Profile for one contributor |
| `getContributorLiveFeed` | `{ hours?, limit? }` (hours default 48, limit 50) | Recent activity feed |

#### Author Analytics

| Method | Input | Description |
|--------|-------|-------------|
| `getAuthorKPIs` | `{ repo?, from?, to? }` | Author KPIs |
| `getAuthorActivityTimeline` | `{ repo?, months? }` (months default 12) | Active authors per month |
| `getAuthorSuccessRates` | `{ repo?, limit? }` (limit default 20) | Success rates per author |
| `getTopAuthors` | `{ repo?, from?, to?, limit? }` (limit default 50) | Top authors by PRs |

#### Editor & Reviewer Analytics

| Method | Input | Description |
|--------|-------|-------------|
| `getEditorsLeaderboard` | `{ limit?, repo?, from?, to? }` (limit 30) | Editor leaderboard |
| `getEditorsLeaderboardExport` | `{ repo?, from?, to? }` | CSV export of editors |
| `getReviewersLeaderboard` | `{ limit?, repo?, from?, to? }` | Reviewer leaderboard |
| `getEditorsByCategory` | `{ repo? }` | Editors by category |
| `getEditorsRepoDistribution` | `{ actor?, repo?, from?, to? }` | Editor activity by repo |
| `getReviewersRepoDistribution` | `{ actor?, repo?, from?, to? }` | Reviewer activity by repo |
| `getEditorsMonthlyTrend` | `{ repo?, months? }` (months default 12) | Monthly editor trend |
| `getReviewersMonthlyTrend` | `{ repo?, months? }` | Monthly reviewer trend |
| `getReviewerCyclesPerPR` | `{ repo? }` | Review cycles per PR distribution |
| `getMonthlyReviewTrend` | `{ actor?, from?, to?, repo? }` | Monthly review trend |
| `getMonthlyEditorLeaderboard` | `{ limit? }` (limit 10) | This month's editor leaderboard |

### standards

| Method | Input | Description |
|--------|-------|-------------|
| `getKPIs` | `{ repo? }` | total, inReview, finalized, newThisYear |
| `getRIPKPIs` | `{}` | RIP-specific KPIs |
| `getStatusDistribution` | `{ repo? }` | Status × repo distribution |
| `getCreationTrends` | `{ repo? }` | Creation trends by year/repo |
| `getCategoryBreakdown` | `{ repo? }` | Category breakdown |
| `getFilterOptions` | `{ repo? }` | statuses, types, categories for filters |
| `getTable` | `{ repo?, status?, type?, category?, yearFrom?, yearTo?, search?, sortBy?, sortDir?, page?, pageSize? }` (sortBy: number/title/status/type/category/created_at/updated_at/days_in_status/linked_prs) | Paginated EIPs/ERCs table |
| `getRIPsTable` | `{ search?, sortBy?, sortDir?, page?, pageSize? }` | Paginated RIPs table |
| `getRIPActivity` | `{}` | RIP commit activity over time |
| `getStatusMatrix` | `{}` | Status × group (EIPs/ERCs) matrix |
| `getUpgradeImpact` | `{}` | Upgrade impact snapshot |
| `getMonthlyDelta` | `{}` | Monthly governance delta |
| `getRepoDistribution` | `{}` | Repo distribution (EIPs, ERCs, RIPs) |
| `exportCSV` | `{ repo?, status?, type?, category? }` | CSV export |
| `getCategoryStatusCrosstab` | `{}` | Category × status cross-tab |

### explore

| Method | Input | Description |
|--------|-------|-------------|
| `getYearsOverview` | `{}` | Years with newEIPs, statusChanges, activePRs |
| `getYearSparkline` | `{ year: number }` | Monthly activity for year |
| `getYearStats` | `{ year: number }` | Stats for a year |
| `getEIPsByYear` | `{ year, limit?, offset? }` (limit 50, offset 0) | EIPs created in year |
| `getYearActivityChart` | `{ year }` | Monthly chart data |
| `getStatusCounts` | `{}` | Status counts |
| `getCategoryCounts` | `{}` | Category counts |
| `getEIPsByStatus` | `{ status?, category?, type?, limit?, offset? }` | EIPs by status with filters |
| `getStatusFlow` | `{}` | Status flow for pipeline |
| `getRoleLeaderboard` | `{ role?: 'EDITOR'\|'REVIEWER'\|'CONTRIBUTOR', limit? }` (limit 20) | Role leaderboard |
| `getTopActorsByRole` | `{ role, limit? }` (limit 3) | Top actors by role |
| `getRoleCounts` | `{}` | Role counts summary |
| `getRoleActivityTimeline` | `{ role?, limit? }` (limit 20) | Recent role activity |
| `getRoleActivitySparkline` | `{ role? }` | Last 6 months sparkline |
| `getTrendingProposals` | `{ limit? }` (limit 20) | Trending proposals |
| `getTrendingHeatmap` | `{ topN? }` (default 10) | Heatmap of top N EIPs |
| `getTypes` | `{}` | Unique types |
| `getCategories` | `{}` | Unique categories |

### insights

| Method | Input | Description |
|--------|-------|-------------|
| `getMonthlyStatusSnapshot` | `{ month: string (YYYY-MM), repo? }` | Status snapshot for month |
| `getStatusFlowOverTime` | `{ repo? }` | Status flow (last 24 months) |
| `getDeadlineVolatility` | `{ repo? }` | Deadline change counts by month |
| `getEditorsLeaderboard` | `{ month?, repo? }` | Editors leaderboard (month-scoped) |
| `getOpenPRs` | `{ month?, repo?, limit? }` (limit 50) | Open PRs with governance |
| `getPRLifecycleFunnel` | `{ repo? }` | PR lifecycle funnel |
| `getGovernanceStatesOverTime` | `{ repo? }` | Governance state distribution |
| `getTimeToDecision` | `{ repo? }` | Time to decision (merged/closed) |
| `getBottleneckHeatmap` | `{ repo? }` | Bottleneck heatmap |
| `getUpgradeTimeline` | `{}` | Upgrade timeline |
| `getUpgradeCompositionChanges` | `{ upgradeId? }` | Upgrade composition changes |
| `getEIPTimeline` | `{ eipNumber: number }` | Full EIP timeline (status, category, deadline, PRs) |
| `getAvailableMonths` | `{}` | Available months for insights |

### tools

| Method | Input | Description |
|--------|-------|-------------|
| `getBoardData` | `{ repo?, search?, type?, category? }` | EIPs grouped by status (Kanban) |
| `getDependencyGraph` | `{ repo?, eipNumber? }` | EIP dependency graph (nodes, edges) |
| `getEIPFullTimeline` | `{ eipNumber: number }` | Full EIP timeline with events |
| `getBoardFilterOptions` | `{ repo? }` | Types and categories for board |
| `getOpenPRBoard` | `{ repo?, govState?, processType?, search?, page?, pageSize? }` | Paginated open PR board |
| `getOpenPRBoardStats` | `{ repo?, govState?, search? }` | Process type + governance state counts |

### blog

| Method | Auth | Input | Description |
|--------|------|-------|-------------|
| `list` | Public (published) / Admin (all) | `{ publishedOnly?: boolean, limit?, offset? }` (publishedOnly default true, limit 20) | List blog posts |
| `getById` | Admin | `{ id: string }` | Get post by ID |
| `getBySlug` | Public (published) / Admin (draft) | `{ slug: string }` | Get post by slug |
| `create` | Admin | `{ slug, title, excerpt?, content, coverImage?, published? }` | Create post |
| `update` | Admin | `{ id, slug?, title?, excerpt?, content?, coverImage?, published? }` | Update post |
| `delete` | Admin | `{ id: string }` | Delete post |
| `uploadCoverImage` | Admin | `{ fileName, base64Data }` | Upload cover image |

---

## REST API Routes

### GET /api/me

Returns current session. Requires authenticated session (cookies).

**Response**: `{ session, user }` or `401` if not authenticated.

---

### POST /api/account/update

Update current user profile. Requires authenticated session.

**Body**: `{ name?: string, image?: string }`

**Response**: `{ ok: true }` or `401` if not authenticated.

---

### POST /api/analytics/revalidate

On-demand cache invalidation for analytics. Intended for internal/admin use.

**Query params**:
- `tag` (optional): Specific cache tag to invalidate. If omitted, invalidates all analytics tags.

**Tags** (when no `tag` provided):
- `analytics-eips-hero`, `analytics-eips-lifecycle`, `analytics-eips-composition`, `analytics-eips-transitions`, `analytics-eips-throughput`
- `analytics-prs-monthly`, `analytics-prs-governance`, `analytics-prs-staleness`, `analytics-prs-time-to-outcome`
- `analytics-contributors-kpis`, `analytics-contributors-activity-type`, `analytics-contributors-activity-repo`
- `analytics-editors-leaderboard`, `analytics-reviewers-leaderboard`, `analytics-editors-by-category`
- `analytics-editors-repo-distribution`, `analytics-reviewers-repo-distribution`

**Response**: `{ revalidated: true, tag?: string, tags?: string[], message: string }`

---

### POST /api/validate-eip

Validate EIP markdown preamble (frontmatter). No auth required.

**Body**: `{ markdownContent: string }`

**Response**: `{ success: boolean, messages: Array<{ level: 'error'|'warning'|'info', message: string }> }`

Validates: frontmatter, required fields (eip, title, description, author, status, type, created), status, type, category (for Standards Track), last-call-deadline (when Last Call), Abstract/Security Considerations sections.

---

### /api/auth/[...all]

Better Auth catch-all route. Handles sign-in, sign-out, session, OAuth, etc. See [Better Auth](https://www.better-auth.com/) documentation for details.

---

## Client Usage (TypeScript)

```ts
import { client } from '@/lib/orpc'

// Search
const proposals = await client.search.searchProposals({ query: 'erc20', limit: 10 })

// Analytics
const kpis = await client.analytics.getActiveProposals({ repo: 'eips' })

// Proposals
const proposal = await client.proposals.getProposal({ repo: 'eip', number: 1 })

// With API token (set in env or localStorage)
// Headers are added automatically from NEXT_PUBLIC_API_TOKEN or x-api-token
```

---

## Error Codes

- `UNAUTHORIZED`: No valid session or API token
- `FORBIDDEN`: Authenticated but insufficient permissions (e.g. admin required)
- `NOT_FOUND`: Resource not found
- `BAD_REQUEST`: Invalid input
