# 🚀 Intern & Contributor Task Roadmap

Welcome to EIPsInsight! This document outlines potential tasks and projects for interns and new contributors. Tasks are categorized by difficulty and technical area to help you find the right challenge.

---

## 🛠 Tech Stack Summary
- **Frontend:** Next.js 16 (App Router), Tailwind CSS 4, Framer Motion.
- **State:** Zustand (Client), oRPC (API Layer).
- **Backend:** Node.js, Prisma ORM, PostgreSQL.
- **Auth:** Better Auth (GitHub/Google).
- **Visuals:** Three.js, Recharts, ECharts, Visx.
- **Experimental:** Cohere (LLM), Redis (Caching).

---

## 🟢 Level 1: Quick Wins & Exploratory Pages
*Estimated time: 4-8 hours*

### 1.1 "Year in Review" Infographic Page
- **Goal:** Create a visually rich "Governance Wrapped" for any given year.
- **Task:** Build a page at `/insights/review/[year]` that displays a summary of the year's activity.
- **Requirements:** 
  - Total proposals finalized vs. total created.
  - "Top Authors of the Year" leaderboard.
  - "Most Active Editor" and "Fastest Merged EIP" highlights.
  - Use simple animations (Framer Motion) to reveal stats.

### 1.2 User Watchlist Dashboard
- **Goal:** Personalization for logged-in users.
- **Task:** Create a "Watchlist" feature where users can pin EIPs, Authors, or Repos.
- **Requirements:** 
  - Update `User` model or `user_preferences` to store an array of pinned IDs.
  - Add a "Pin to Dashboard" button on proposal and author pages.
  - Show activity updates for pinned items on the `/dashboard`.

---

## 🟡 Level 2: Advanced Visualizations & Tools
*Estimated time: 2-3 days*

### 2.1 Author & Co-Author Network Graph
- **Goal:** Visualize the social structure of Ethereum standards.
- **Task:** Build an interactive network graph (using D3.js or React Force Graph) on a new page `/analytics/network`.
- **Requirements:** 
  - Nodes: Authors.
  - Edges: Co-authored proposals.
  - Weight: Number of shared proposals.
  - Filter by Repo (EIP/ERC/RIP) or Category.

### 2.2 Interactive Proposal Dependency Tree
- **Goal:** Deep-dive into EIP relationships.
- **Task:** Replace the static dependency view with a drill-down interactive tree (using React Flow or D3).
- **Requirements:** 
  - Handle both "Requires" and "Required By" relationships.
  - Allow users to click a node to expand its own dependencies.
  - Visual indicators for the status of dependent EIPs (e.g., color-coded by Draft/Final).

### 2.3 "Governance Velocity" Dashboard
- **Goal:** Measuring the efficiency of the standard process.
- **Task:** Create a dashboard at `/analytics/velocity`.
- **Requirements:** 
  - Chart showing the average time spent in each status (Draft → Review → Last Call → Final).
  - "Stagnancy Probability": A metric showing the likelihood of a proposal reaching 'Final' based on its current time in 'Draft'.
  - Comparison between EIP vs ERC velocity.

---

## 🔴 Level 3: AI & System MVPs
*Estimated time: 4-6 days*

### 3.1 AI-Powered Governance Chatbot (MVP)
- **Goal:** Interactive RAG-based search for standards.
- **Task:** Build an AI assistant at `/assistant/chat`.
- **Requirements:** 
  - Integrate Cohere RAG to answer questions about specific EIP content (e.g., "What are the security considerations of EIP-1559?").
  - Feed the LLM with relevant EIP markdown content based on search query.
  - Implement streaming responses for a snappy UI.

### 3.2 Automated Review Summarizer for Editors
- **Goal:** Reducing cognitive load for EIP editors.
- **Task:** Add a "Summarize PR Conversation" button on the PR detail page (`/pr/[repo]/[number]`).
- **Requirements:** 
  - Pull all review comments and conversation data.
  - Use LLM to identify "Resolved vs. Unresolved" points of contention.
  - Output a concise bulleted summary for an editor to quickly audit the state of the PR.

### 3.3 Governance Notification Hub (MVP)
- **Goal:** Real-time updates for heavy users.
- **Task:** Build a centralized notification center at `/profile/notifications`.
- **Requirements:** 
  - Allow users to subscribe to specific "Events" (e.g., "New ERC Draft in 'Account Abstraction' category").
  - Implement a real-time feed using polling or SSE (Server-Sent Events).
  - MVP for Telegram Bot integration (sending notifications to a specified Chat ID).

---

## 🚀 Ready to start?
1. Pick a task that sounds exciting—don't be afraid to propose your own MVP!
2. Create a new branch: `feat/intern-[task-name]`.
3. Check the `analytics.ts` and `proposals.ts` procedures to see what data you can leverage or expand.
