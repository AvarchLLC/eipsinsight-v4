# Legacy vs New Website Gap Analysis

Generated: 2026-03-02  
Source baseline:
- Legacy inventory provided in chat (`src/pages/**` era, ~80 routes)
- Current app routes in this repo (`src/app/**`)

## 1. Executive Summary

The new website already covers most core analytics surfaces (standards, upgrades, insights, analytics hubs for EIPs/PRs/editors/reviewers/authors/contributors, search, people pages, tools).

Main gaps are **workflow depth and legacy utility surfaces** rather than base analytics:
- Missing deep PR/Issue detail routes in-app
- Missing monthly status-change drilldown tables by status/type
- Missing legacy board-style moderation/discussion surfaces
- Missing some content/support pages (about/privacy/grants/newsletter feedback dashboard)
- Missing a few high-signal visual modules that were strong in the legacy site

## 2. High-Value Missing Pages (Recommended)

## P0 (add first)

1. PR Detail Page (legacy parity: `/PR/[Type]/[number]`)
- Why: closes loop from editor/reviewer activity and governance state to actionable detail.
- Suggested route: `/pr/[repo]/[number]`
- Must include:
  - PR metadata, timeline, governance state
  - Conversation + review comments
  - Links to related proposal(s)

2. Issue Detail Page (legacy parity: `/issue/[Type]/[number]`)
- Why: many governance decisions and blockers live in issues.
- Suggested route: `/issue/[repo]/[number]`
- Must include:
  - Issue description, conversation timeline
  - Linked EIP/ERC/RIP references
  - Status labels history

3. Monthly Drilldown Table (legacy parity: `/monthly/[type]/[year]/[month]/[status]`, `/stats/[status]/[date]`)
- Why: old site supported fast "what changed this month/status" forensic navigation.
- Suggested route: `/insights/monthly-drilldown?repo=&month=&status=`
- Must include:
  - filterable rows for changed proposals
  - CSV export
  - links to proposal + relevant PR

## P1


5. Feedback Operations Dashboard (legacy parity: `/feedback-dashboard`, `/feedbacks`)
- Why: closes product feedback loop for internal prioritization.
- Suggested route: `/admin/feedback`
- Must include:
  - sorting by severity/category/created_at
  - status workflow (new/in-review/resolved)
  - export

6. About/Trust/Support Content Parity
- Missing or underexposed compared to legacy:
  - `/about`
  - `/privacy`
  - `/grants`
  - `/newsletter`
  - `/donate` (if still business-relevant)

## P2

7. Milestones/Retrospective Page (legacy parity: `/milestones2024`)
- Suggested route: `/resources/milestones/[year]`

8. On-chain Tracker Sandbox (legacy parity: `/txtracker`, `/testv2`)
- Only if strategic for product direction.
- If kept: move under `/labs/` and keep scope explicit.

## 3. Missing Components / Visualization Modules

These existed in legacy and still add value if rebuilt in current design language.

1. Contributor Heatmap Calendar
- Legacy signal: strong activity-at-a-glance over time.
- Target pages: `/analytics/contributors`, `/people/[actor]`

2. Editor Activity Heatmap + Velocity Pair
- Legacy signal: editor workload + responsiveness trend.
- Target pages: `/analytics/editors`

3. Reviewer Specialty/Focus Matrix (repo/category vs reviewer)
- Legacy signal: reviewer domain concentration.
- Target page: `/analytics/reviewers`

4. Status Transition Stacked Bars for monthly deltas (drilldown-linked)
- Legacy signal: quick status flow intuition.
- Target pages: `/insights/year-month-analysis`, new `/insights/monthly-drilldown`

5. Last-Updated block on all analytics cards/charts
- Legacy signal: trust in freshness.
- Target: shared component for analytics/insights pages.

6. Comment/annotation block per major analytics section (optional)
- Legacy had heavy comment presence; new could implement a cleaner annotation model.

## 4. Data/API Gaps to Close for Parity

1. Event-level links for editor activity (in progress now)
- Need reliable URL formation for:
  - review anchors
  - review comments
  - issue comments

2. Unified "monthly change events" endpoint for drilldown page
- Current yearly/monthly insight endpoints exist, but dedicated drilldown payload should be standardized.

3. PR/Issue detail endpoints for new routes
- Need normalized payload contracts (metadata, timeline, conversation, linked proposals).

4. Optional alias redirects for legacy inbound URLs
- Keep SEO and old shared links alive.
- Examples:
  - `/eip` -> `/standards?repo=eips`
  - `/erc` -> `/standards?repo=ercs`
  - `/rip` -> `/standards?repo=rips`
  - `/EditorAnalytics` -> `/analytics/editors`
  - `/Reviewers` -> `/analytics/reviewers`

## 5. Recommended Build Order (4 sprints)

Sprint 1
- PR detail page
- Issue detail page
- Event-link correctness for recent editor activity

Sprint 2
- Monthly drilldown page (+ CSV)
- Status transition charts linked to drilldown

Sprint 3
- Board parity expansion in `/tools/board`
- Feedback ops dashboard (admin)

Sprint 4
- Content parity pages (`/about`, `/privacy`, `/grants`, `/newsletter`)
- Heatmap/specialty visual modules

## 6. What Is Already Strong in New Site (Do Not Rebuild)

- Unified proposal detail route (`/(proposal)/[repo]/[number]`)
- Analytics hub split by domain (`/analytics/*`)
- Insights hub (`/insights/*`) and upgrade insight surfaces
- People route and actor-centric exploration (`/people/[actor]`)
- Better route architecture and docs (`docs/architecture.md`, `docs/sitemap.md`, `docs/API.md`)

---

If needed, this can be converted into a checkable implementation tracker by adding each gap to `docs/TASKS.md` with owner + ETA.
