# Legacy vs New Website Gap Analysis

Updated: June 2026

## 1. Executive Summary

The new website has achieved high parity with the legacy system, implementing core analytics, proposal details, and governance tracking. Most "High-Value" gaps identified in previous audits are now closed.

Current focus has shifted from **parity** to **observability depth, security, and developer experience**.

## 2. Gap Status

### ✅ Completed (Parity Achieved)

1.  **PR Detail Page** (`/pr/[repo]/[number]`)
    *   Full metadata, timeline, conversation, and related proposals linked.
2.  **Issue Detail Page** (`/issue/[repo]/[number]`)
    *   Metadata and EIP/ERC/RIP references integrated.
3.  **Feedback Operations Dashboard** (`/admin/feedback`)
    *   Internal dashboard for reviewing user feedback.
4.  **Static Content Parity**
    *   `/about`, `/privacy`, `/grants`, `/terms`, `/donate` are all live.
5.  **Visualization Modules**
    *   Contributor Heatmaps, Editor Velocity, Status Transition Stacked Bars are all implemented in the analytics hub.
6.  **AI EIP Summaries**
    *   Integrated Cohere-backed summarization API.

### ⏳ Pending / In-Progress

1.  **Monthly Drilldown Table**
    *   Why: Forensic "what changed this month" navigation.
    *   Status: Partially covered by `/insights/[year]/[month]`, but needs a dedicated tabular view with CSV export.
2.  **Milestones/Retrospective Page**
    *   Status: `/resources/milestones` exists but content needs population.
3.  **On-chain Tracker Sandbox**
    *   Status: Lower priority; strategic decision pending.

## 3. Data/API Gaps to Close

1.  **Event-level links for editor activity**
    *   Need reliable URL formation for specific review comments and anchors.
2.  **Unified "monthly change events" endpoint**
    *   Standardizing the payload for the drilldown page.
3.  **API Scoping & Rate Limiting**
    *   Enforce `requireScope` and wire `withRateLimit` middleware across the oRPC layer.

---

This document is now a historical reference for the parity phase. For active development items, see `docs/TASKS.md`.
