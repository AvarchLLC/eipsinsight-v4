# EIPsInsight — Site Map

> **Implementation:** Sidebar uses `/standards`, `/upgrade`, `/explore`, etc. See [architecture.md](./architecture.md).

## Navigation Tree

```
EIPsInsight
│
├── Home
│   ├── Dashboard
│   ├── Trending Proposals
│   ├── Latest News & Announcements
│   └── Social & Community Updates
│
├── Explore
│   ├── By Year
│   │   └── All Years
│   ├── By Status & Category
│   │   ├── All Status & Categories
│   │   ├── Individual Status/Category Views
│   │   └── Individual EIP Views
│   ├── By Role
│   │   ├── Editors
│   │   ├── Reviewers
│   │   └── Contributors
│   └── By Trending Proposals
│
├── Search
│   ├── EIP Number
│   ├── Title
│   ├── Author
│   ├── Type / Category
│   └── PRs & Issues
│
├── Analytics
│   ├── EIPs Analytics
│   ├── PRs & Issues Analytics
│   ├── Editors Analytics
│   ├── Reviewers Analytics
│   ├── Authors Analytics
│   └── Contributors Analytics
│
├── Standards by repo
│   ├── All Standards
│   ├── EIPs
│   ├── ERCs
│   └── RIPs
│
├── Tools
│   ├── EIP Builder
│   ├── EIP/ERC/RIP Board
│   ├── EIP Dependency/Relationship
│   └── EIP timeline - status & commit
│
├── Resources
│   ├── FAQ
│   ├── Blogs
│   ├── Videos
│   ├── News
│   └── Documentation Links
│
├── Insights
│   ├── Year-Month Analysis
│   ├── Governance & Process Insights
│   ├── Upgrade Insights - Trivia/highlights
│   └── Editorial Commentary - Enter EIP/PR number and get EIP Progress timeline with PRs total, Conversation, Commits, Check, File change per PR
│
└── Network Upgrades
    ├── Current & Upcoming
    │   ├── Hegotá
    │   ├── Glamsterdam
    │   ├── Fusaka
    │   └── Dencun
    ├── Earlier Upgrades
    └── Upgrade Archive
```

---

## URL Mapping (Implementation)

| Sitemap Section | Actual Route(s) |
|-----------------|-----------------|
| Home | `/`, `/dashboard`, `/landing` |
| Explore | `/explore`, `/explore/years`, `/explore/status`, `/explore/roles`, `/explore/trending` |
| Search | `/search` |
| Analytics | `/analytics`, `/analytics/eips`, `/analytics/prs`, `/analytics/editors`, etc. |
| Standards | `/standards` (sidebar), `/standards?repo=eips|ercs|rips` |
| Tools | `/tools`, `/board`, `/eip-builder`, `/dependencies`, `/timeline` |
| Resources | `/resources`, `/resources/faq`, `/resources/blogs`, `/resources/videos`, `/resources/news`, `/resources/docs` |
| Insights | `/insights`, `/insights/hub`, `/insights/governance`, `/insights/commentary` |
| Network Upgrades | `/upgrade`, `/upgrade/pectra`, `/upgrade/fusaka`, `/upgrade/glamsterdam`, `/upgrade/hegota` |
| Individual EIP/ERC/RIP | `/eip/:n`, `/erc/:n`, `/rip/:n` |
| PR / Issue Details | `/pr/:repo/:n`, `/issue/:repo/:n` |

---

## Persona Alignment (EIPsInsight-first thinking)

| Persona | Primary | Secondary |
|---------|---------|-----------|
| **Protocol Developers & Client Teams** | Standards, Network Upgrades, Analytics (PRs, missed slots, timelines) | Insights (upgrade rationale, meta context) |
| **EIP Editors & Reviewers** | Search, Analytics (Editors / Reviewers), Tools (EIP Board, Builder) | Explore (by status, category) |
| **Researchers & Analysts** | Analytics, Insights, Standards | Network Upgrades (historical context) |
| **Builders & ERC Authors** | Tools, Standards (ERCs) | Resources, Search |
| **Enterprises & Decision-Makers** | Network Upgrades, Insights, Resources | Standards (high-level) |
| **Newcomers & Students** | Resources, Explore, Home | Insights |
