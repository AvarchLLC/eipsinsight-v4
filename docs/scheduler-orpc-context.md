# Scheduler + ORPC Data Context

## Purpose
This document defines how EIPsInsight v4 data is collected, derived, and served so product logic and assistant answers stay aligned with the real pipeline.

## Source Pipeline
Source scheduler repo: `/Users/dhanushlnaik/Workspace/Dev/Avarch/eipsinsight_scheduler`

Main execution order in `src/scheduler/index.ts`:
1. Commit ingestion (canonical and observational repos)
2. PR sync + timeline ingestion + PR/EIP linking
3. Issue sync + issue timeline ingestion + issue/EIP linking
4. Upgrade composition sync
5. Notifications
6. Aggregations (`contributor_scores`, `insights_monthly`)
7. Monthly board snapshots

Tracked repos:
- `ethereum/EIPs` (canonical)
- `ethereum/ERCs` (canonical)
- `ethereum/RIPs` (observational)

## Core Ingestion Semantics
Commit ingestion:
- Canonical markdown files (`EIPS/eip-*.md`, `ERCS/erc-*.md`) update:
  - `eip_status_events`
  - `eip_type_events`
  - `eip_category_events`
  - `eip_deadline_events`
  - `eip_snapshots` (latest state)
- RIP commits are tracked via `rip_commits` / `rips`.

PR ingestion (`src/ingestion/pr_ingestor.ts`):
- Upserts `pull_requests` metadata.
- Ingests timeline pages into `pr_events`:
  - `commented`, `issue_comment`, `reviewed`, `committed`, `labeled`, `unlabeled`
- Mirrors review events into `pr_reviews`.
- Adds per-event actor activity into `contributor_activity`.
- Builds `pr_custom_tags` from title + labels (`tagClassifier`).
- Links PRs to proposals in `pull_request_eips` from title/body/files.
- Computes governance state and classification into `pr_governance_state`.

Issue ingestion (`src/ingestion/issue_ingestor.ts`):
- Upserts `issues`.
- Ingests `issue_events`.
- Links issue references to proposals in `issue_eips`.

## Governance State Semantics
Derived in `src/governance/state_engine.ts` from timeline ordering and PR lifecycle.

Canonical state values used by app queries:
- `WAITING_ON_EDITOR`
- `WAITING_ON_AUTHOR`
- `DRAFT`
- `MERGED`
- `CLOSED`
- `STALLED` (derived category/subcategory behavior)

Waiting-side logic:
- No editor/reviewer interaction yet -> waiting on editor.
- Author responded after last editor action -> waiting on editor.
- Editor acted last with no author response -> waiting on author.

## Process-Type / Status-Change Semantics
Process type comes from `src/analytics/boards.ts` + tags:
- `DRAFT`, `TYPO`, `NEW_EIP`, `STATUS_CHANGE`, `WEBSITE`, `TOOLING`, `EIP_1`, `CONTENT_EDIT`, `OTHER`

Status change signal should be interpreted from one or more of:
- `pr_custom_tags.tag = 'Status Change'`
- `pr_governance_state.category = 'Status Change'`
- `pull_requests.labels` containing `c-status` or `c-update`

When user asks for “status change PRs”, prefer these signals instead of title-only heuristics.

## Cursors / Incremental Behavior
Cursors are persisted in `scheduler_state`.
Important keys:
- Commit cursors: `eips_last_sha`, `ercs_last_sha`, `rips_last_sha`
- PR incremental cursor: `${repo.stateKey}_prs_updated_v5` (versioned key)
- Issue incremental cursor: `${repo}_issues_updated`

The `v5` PR cursor suffix in scheduler enables one-time full PR resync on logic upgrades after process restart.

## ORPC Backend Mapping (v4)
Route entry:
- `src/app/rpc/[[...rest]]/route.ts` (prefix `/rpc`)

Router:
- `src/server/orpc/router.ts`

Key data domains:
- `analytics.*` -> wide dashboard metrics and exports
- `standards.*` -> proposal tables/distributions
- `insights.*` -> time-series and narrative analytics
- `explore.*` -> role/year/status/trending exploration
- `governance.*` -> waiting-state metrics/timelines
- `tools.*` -> board/dependency/timeline utilities
- `search.*` -> assistant/search behavior (`answerAndRecommend`)

## Assistant Query Policy
For assistant SQL or deterministic answers:
- Use read-only SQL only (`SELECT`/`WITH`).
- Prefer scheduler-derived truth tables:
  - `pr_governance_state`
  - `pr_custom_tags`
  - `pr_events`
  - `pr_reviews`
  - `pull_request_eips`
  - `eip_status_events`
  - `eip_snapshots`
- For “waiting on editor” asks, filter on `WAITING_ON_EDITOR` (and compatibility alias `WAITING_EDITOR` if present in data).
- For “status change” asks, require status-change signal (tags/category/labels), not just free-text matching.

## Why This Exists
This keeps product UX, analytics queries, and assistant responses aligned with:
- what scheduler actually ingests,
- how governance state is actually derived,
- and what ORPC endpoints actually expose.
