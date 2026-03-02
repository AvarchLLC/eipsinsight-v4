# EIPsInsight — Personas

## Wireframe: Global Layout (All Personas)

```
┌───────────────────────────────────────────────────────────┐
│ EIPsInsight                                                │
│ [Persona Switch ▼]  Search ⌕   Docs   GitHub   About       │
└───────────────────────────────────────────────────────────┘

┌───────────────┐ ┌────────────────────────────────────────┐
│ Left Nav      │ │ Main Content Area                       │
│ (Persona-     │ │ (Persona-specific landing + widgets)   │
│  ordered)     │ │                                        │
│               │ │ ┌──────── Highlights / CTA ─────────┐ │
│ • Home        │ │ │                                    │ │
│ • Explore     │ │ │  Contextual cards / summaries      │ │
│ • Search      │ │ │                                    │ │
│ • Analytics   │ │ └────────────────────────────────────┘ │
│ • Standards   │ │                                        │
│ • Tools       │ │ ┌──────── Live Data / Lists ─────────┐ │
│ • Insights    │ │ │                                    │ │
│ • Upgrades    │ │ │  Tables, timelines, charts         │ │
│ • Resources   │ │ │                                    │ │
│               │ │ └────────────────────────────────────┘ │
└───────────────┘ └────────────────────────────────────────┘
```

🔑 **Persona switch** changes nav order, defaults, and highlighted widgets — not the content itself.

---

## Persona → Default Landing Pages

| Persona | Default Landing | Why |
|---------|-----------------|-----|
| 🧑‍💻 Developer / Client Team | Network Upgrades | What's shipping, when, and how it affects clients |
| 🧾 EIP Editor / Reviewer | Search + Analytics (Editors) | PR flow, reviews, backlog, coordination |
| 🔬 Researcher / Analyst | Analytics | Trends, data, correlations, governance signals |
| 🛠️ Builder / ERC Author | Tools | Writing, validating, and shipping standards |
| 🏢 Enterprise / Decision-Maker | Insights → Upgrades | What's changing and why it matters |
| 🌱 Newcomer / Student | Home → Resources | Orientation, learning paths, context |

---

## Persona-Specific Wireframes & Microcopy

### 🧑‍💻 Developer / Client Team
**Landing:** Network Upgrades

- [Current & Upcoming Upgrades] Fusaka \| Glamsterdam \| Hegotá
- [What Changed Since Last Upgrade] Core EIPs shipped, client impact notes
- [Timeline & Activation Details] Dates, fork epochs, specs

**Microcopy:** *Track what's changing in Ethereum protocol upgrades, how it affects clients, and what's coming next.*

---

### 🧾 EIP Editor / Reviewer
**Landing:** Search + Analytics

- [Quick Search] EIP number \| Status \| Author
- [Editor Dashboard] Open PRs, EIPs in Review / Last Call
- [Process Health] PR aging, review throughput

**Microcopy:** *Coordinate reviews, track proposal status, and keep the EIP process moving.*

---

### 🔬 Researcher / Analyst
**Landing:** Analytics

- [Ecosystem Trends] EIP throughput, status transitions over time
- [Upgrade Impact] Before / after analysis
- [Governance Signals] Review load, contributor activity

**Microcopy:** *Analyze how Ethereum standards evolve over time using real data and historical context.*

---

### 🛠️ Builder / ERC Author
**Landing:** Tools

- [Build an EIP / ERC] Templates, validation tools
- [Popular Standards] ERC usage, recent updates
- [Search & Reference] Specs by category

**Microcopy:** *Create, review, and ship standards with the right tools and references.*

---

### 🏢 Enterprise / Decision-Maker
**Landing:** Insights → Upgrades

- [What's Changing] Upcoming upgrades (plain-English)
- [Why It Matters] Cost, security, scalability
- [Roadmap View] Near-term vs long-term

**Microcopy:** *Understand Ethereum's roadmap, upgrade cadence, and business impact—without protocol deep dives.*

---

### 🌱 Newcomer / Student
**Landing:** Home → Resources

- [What is an EIP?] Basics, how upgrades work
- [Learn by Topic] Videos, Blogs, FAQs
- [Explore the Ecosystem] Popular proposals, major upgrades

**Microcopy:** *Learn how Ethereum evolves, who decides what ships, and how you can participate.*

---

## Persona Entry URLs (Implementation)

| Persona | URL | Redirects to | Source: `persona.ts` |
|---------|-----|--------------|----------------------|
| Developer | `/p/developer` | `/upgrade` | `PERSONA_DEFAULTS.developer` |
| Editor | `/p/editor` | `/standards` | `PERSONA_DEFAULTS.editor` |
| Researcher | `/p/researcher` | `/analytics/prs` | `PERSONA_DEFAULTS.researcher` |
| Builder | `/p/builder` | `/erc` | ERC standards page |
| Enterprise | `/p/enterprise` | `/upgrade` | `PERSONA_DEFAULTS.enterprise` |
| Newcomer | `/p/newcomer` | `/` | Home |

**Nav ordering:** `PERSONA_NAV_ORDER` in `persona.ts` — sidebar sections reorder per persona (when `FEATURES.PERSONA_NAV_REORDER` enabled).

**State:** Persona stored in `localStorage` via Zustand; synced to server when authenticated.
