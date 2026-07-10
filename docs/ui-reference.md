# EIPsInsight — UI Reference

Design tokens, typography, colors, and component patterns used across the app.

---

## Typography

### Font Families

| Token | Font | Weights | Usage |
|-------|------|---------|-------|
| `--font-space-grotesk` | Space Grotesk (Google Font) | 300, 400, 500, 600, 700 | Body, UI, nav |
| `--font-libre-baskerville` | Libre Baskerville (Google Font) | 400, 700 | Titles, headings (`.dec-title`) |

**Default body:** `font-family: var(--font-space-grotesk)`

**Decorative titles:** Add `.dec-title` for Libre Baskerville with `line-height: 1.15`.

### Typography Hierarchy

Sizes should flow hierarchically. Avoid jumps that look odd (e.g. `text-4xl` next to `text-[10px]`). Use consistent steps.

| Level | Class | Size | Usage |
|-------|-------|------|-------|
| **H1 — Main page title** | `dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl` | 30–36px | Page headers (EIPs, Dashboard) |
| **H1 subtitle** | `mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base` | 14–16px | One line under main title |
| **H2 — Section title** | `dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl` | 20–24px | Section headers (Protocol Bento, etc.) |
| **H2 subtitle** | `mt-0.5 text-sm text-muted-foreground` | 14px | Section descriptions |
| **H3 — Card/subsection** | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | 12px | DashCard titles, table headers |
| **Body** | `text-sm` | 14px | Default body copy |
| **Small** | `text-xs` | 12px | Labels, badges |
| **Tiny** | `text-[10px]`–`text-[11px]` | 10–11px | Table cells, micro labels |

### Main Header Pattern

Use this pattern for primary page headers (e.g. `/`, `/dashboard`):

```tsx
<motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
  <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
    Page Title
  </h1>
  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
    Description. Powered by <span className="text-foreground/80">EIPsInsight</span>.
  </p>
</motion.header>
```

### Font Sizes (Reference)

| Class | Size | Usage |
|-------|------|-------|
| `text-[10px]` | 10px | Tiny labels, table cells |
| `text-[11px]` | 11px | Section labels, uppercase |
| `text-xs` | 12px | Small labels, badges |
| `text-sm` | 14px | Body, nav items, buttons |
| `text-base` | 16px | Default body, search input |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section headings |
| `text-2xl` | 24px | Large section titles |
| `text-3xl` | 30px | Page titles |
| `text-4xl` | 36px | Hero / large display |

### Font Weights

| Class | Weight |
|-------|--------|
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |

---

## Colors

### Semantic Palette

Use semantic tokens only. Avoid hardcoded color scales (`slate-*`, `cyan-*`, `emerald-*`) in shared UI primitives.

| Role | Token/Class | Usage |
|------|-------------|-------|
| **Background** | `bg-background` | Page background |
| **Foreground** | `text-foreground` | Primary text |
| **Muted surface** | `bg-muted` / `bg-muted/60` | Chips, icon tiles, subtle containers |
| **Muted text** | `text-muted-foreground` | Secondary copy, labels |
| **Card** | `bg-card text-card-foreground` | Cards, elevated panels |
| **Border** | `border-border` | Dividers, control borders |
| **Accent/Brand** | `text-primary`, `bg-primary/10`, `border-primary/30` | Active and persona-driven accents |
| **Focus** | `focus-visible:ring-2 focus-visible:ring-ring/40` | Keyboard focus states |

### Gradient Accents

```
from-emerald-500/10 via-cyan-500/10 to-blue-500/10   — Card hover, CTA bg
from-emerald-500 to-cyan-500                         — Primary CTA button
from-emerald-300 via-cyan-300 to-emerald-300         — Text gradient (bg-clip-text)
```

### Status / Semantic Colors

| Status | Tailwind | Hex (charts) | Usage |
|--------|----------|--------------|-------|
| Draft | `slate-500/20`, `text-slate-300` | `#64748b` | EIP status |
| Review | `amber-500/20`, `text-amber-300` | `#f59e0b` | EIP status |
| Last Call | `orange-500/20`, `text-orange-300` | `#f97316` | EIP status |
| Final | `emerald-500/20`, `text-emerald-300` | `#10b981` | EIP status |
| Living | `cyan-500/20`, `text-cyan-300` | `#22d3ee` | EIP status |
| Stagnant | `gray-500/20`, `text-gray-400` | `#6b7280` | EIP status |
| Withdrawn | `red-500/20`, `text-red-300` | `#ef4444` | EIP status |
| Error / Destructive | `rose-400`, `red-500` | — | Errors, delete |

### Persona Colors

| Persona | Color | Tailwind |
|---------|-------|----------|
| Developer | Emerald | `emerald-500/20`, `text-emerald-400` |
| Editor | Blue | `blue-500/20`, `text-blue-400` |
| Researcher | Purple | `purple-500/20`, `text-purple-400` |
| Builder | Orange | `orange-500/20`, `text-orange-400` |
| Enterprise | Cyan | `cyan-500/20`, `text-cyan-400` |
| Newcomer | Pink | `pink-500/20`, `text-pink-400` |

### Persona-Swappable Accent System

UI accents are persona-driven at runtime (instead of hardcoded cyan/emerald).

- `PersonaProvider` sets `data-persona="<persona>"` on `<html>`.
- `globals.css` maps each persona to `--persona-*` tokens.
- Core theme tokens (`--primary`, `--accent`, `--ring`, `--sidebar-*`) read from `--persona-*`.
- Result: navbar, sidebar, headers, chips, focus rings, and interactive accents switch automatically when persona changes.

Primary utility classes for persona-aware styling:

- `text-primary`, `bg-primary/10`, `border-primary/30`, `ring-primary/40`
- `persona-gradient` (CTA/background gradient)
- `persona-gradient-soft` (subtle surface tint)
- `persona-glow` (accent glow)
- `persona-title` (persona-aware heading gradient)

---

## Spacing & Sizing

### Common Values

| Token | Value | Usage |
|-------|-------|-------|
| Navbar height | `h-14` (56px) | Header, sidebar header |
| Sidebar collapsed | `w-11` (44px) | Icon-only nav |
| Button default | `h-9` (36px) | Buttons |
| Button sm | `h-8` (32px) | Small buttons |
| Button lg | `h-10` (40px) | Large buttons |
| Icon default | `h-4 w-4`, `h-5 w-5` | 16px, 20px icons |
| Container | `max-w-7xl`, `px-4 sm:px-6` | Main content |
| Shared shell | `.page-shell` | Use for centered page bodies that should stay within `max-w-7xl` |
| Full-width page padding | `mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6` | Use for full-width page sections such as `/search` and the global page feedback wrapper |
| Upgrade shell column | `mx-auto w-full max-w-6xl px-4 sm:px-6` | All `/upgrade/*` pages (dedicated shell — see Upgrade Shell section) |

### Border Radius

| Class | Value |
|-------|-------|
| `rounded-md` | 6px (default for buttons, inputs) |
| `rounded-lg` | 8px (cards, nav items) |
| `rounded-xl` | 12px (large cards) |
| `--radius` | 0.625rem (10px) — CSS variable |

---

## Shadows & Effects

| Usage | Class / Value |
|-------|---------------|
| Accent glow (persona-aware) | `persona-glow` |
| Interactive accent state | `shadow-lg shadow-primary/20` |
| Header separator accent | `via-primary/50` |
| Backdrop | `backdrop-blur-xl`, `backdrop-blur-sm` |

---

## Animation

| Token | Value |
|-------|-------|
| `--expo-in` | `cubic-bezier(0.95, 0.05, 0.795, 0.035)` |
| `--expo-out` | `cubic-bezier(0.19, 1, 0.22, 1)` |
| Transition | `transition-all duration-300` (common) |
| Hover translate | `hover:translate-x-0.5` |

---

## Component Patterns

### Buttons

- **Primary CTA:** `persona-gradient text-black`
- **Secondary:** `bg-primary/10 border border-primary/40 text-primary`
- **Ghost:** `text-muted-foreground hover:text-foreground`

### Inputs

- **Default:** `h-9 rounded-md px-3 py-1 text-sm bg-muted/60 border-border`
- **Focus:** `focus:border-primary/50 focus:ring-1 focus:ring-primary/30`

### Cards

- **Default:** `rounded-xl border border-border bg-card/60`
- **Hover:** `hover:border-primary/40`

### Page Shell

- Use `page-shell` for centered page bodies: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12`
- Use the full-width page wrapper for sections that should align with the viewport content area instead of a centered max-width container:
  `mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6`
- Use that full-width wrapper for `/upgrade`, `/search`, and the global page feedback section
- Do not add another outer `max-w-*` wrapper around page feedback when it is already inside the full-width wrapper

### Upgrade Shell (`/upgrade/*`)

The `/upgrade` tree renders inside its own minimal chrome (`src/components/upgrade/upgrade-shell.tsx`), selected by `src/components/shell-switcher.tsx` — no main sidebar or main navbar. `/oldupgrade` keeps the standard shell.

- Navbar: sticky `h-14`, `border-b border-border bg-background/80 backdrop-blur-xl`; brand → `/`, "Upgrades" wordmark → `/upgrade`, nav links (Overview · forks · Analytics · Archive), freshness dot, avatar only when signed in
- Nav link active state: `text-primary underline decoration-primary/50 underline-offset-8`; inactive: `text-muted-foreground hover:text-foreground`
- Content column: `mx-auto w-full max-w-6xl px-4 sm:px-6` on every page — never full-bleed
- Vertical rhythm: `space-y-10` between page sections
- Calmer-card rules for this surface: `rounded-xl border-border bg-card/60`; hover = `hover:border-primary/40` only (no glow shadows); no radial-gradient/blur-orb backdrops; no motion section entrances (only accordion grid-rows transitions and the timeline "we are here" pulse)
- Accents: persona primary + the five inclusion-stage colors only
- Footer: single line ("Powered by EIPsInsight · composition parsed from meta-EIPs every 5 minutes · GitHub")

### Collapsible Page Header

For pages with an expandable info panel (e.g. `/`, `/upgrade`):

- H1: `dec-title persona-title text-3xl font-semibold tracking-tight sm:text-4xl`
- Subtitle: `mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base`
- Info button: rounded-lg border, `border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10`
- Collapsible panel: `rounded-lg border border-border bg-card/60`
- Info card titles: `text-sm font-semibold text-foreground`
- Info card descriptions: `text-sm text-muted-foreground`

### FAQs Section

- Layout: two-column (sticky sidebar + accordion) on md+
- H2: `dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl`
- H2 subtitle: `mt-0.5 text-sm text-muted-foreground`
- Accordion items: `rounded-lg border border-border bg-card/60`
- Trigger: icon + question in `text-base font-semibold text-foreground`
- Content: `text-sm leading-relaxed text-muted-foreground`

### Tables

- Table wrapper: `rounded-xl border border-border bg-card/60 backdrop-blur-sm`
- Header row: `border-b border-border/70`
- Header cell: `px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`
- Body row: `border-b border-border/60 last:border-0`
- Body cell: `px-4 py-3 text-sm text-foreground`
- Dense analytics variant: headers `text-[10px]`, cells `text-xs`, row padding `py-2`

### Lifecycle Funnel (Pie Chart)

- Use pie chart with status colors from Status / Semantic Colors (hex column)
- Donut style: `innerRadius={40}` `outerRadius={70}`
- Legend: status dot + name + count + percentage

### Scrollbar

- **Track:** `scrollbar-track-transparent` or `scrollbar-track-slate-900/50`
- **Thumb:** `scrollbar-thumb-cyan-500/20` or `scrollbar-thumb-cyan-500/30`

---

## CSS Variables (globals.css)

Theme tokens in `:root` and `.dark`:

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--border`, `--input`, `--ring`
- `--destructive`
- `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, etc.
- `--sidebar-*`, `--chart-1`–`--chart-5`
- `--persona-primary`, `--persona-accent`, `--persona-ring`
- `--persona-accent-rgb`, `--persona-secondary-rgb`

---

## ECharts Visual Patterns

### Standard DataZoom Slider

Use the following configuration pattern to create beautiful, unified, and highly detailed `dataZoom` components with thumbnail previews and custom handles:

```typescript
dataZoom: [
  {
    type: "slider",
    show: true,
    realtime: true,
    height: 22,
    bottom: 4,
    borderColor: "rgba(148,163,184,0.15)",
    backgroundColor: "rgba(148,163,184,0.03)",
    fillerColor: "rgba(34,211,238,0.12)",
    handleIcon: "M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z",
    handleSize: "110%",
    handleStyle: {
      color: "var(--background)",
      borderColor: "rgba(34,211,238,0.5)",
      borderWidth: 1.5,
      shadowBlur: 3,
      shadowColor: "rgba(0, 0, 0, 0.2)",
      shadowOffsetX: 1,
      shadowOffsetY: 1
    },
    showDetail: true,
    start: 40,
    end: 100,
    textStyle: { 
      color: "var(--muted-foreground)", 
      fontSize: 10,
      fontFamily: "inherit",
      fontWeight: 505
    },
    dataBackground: {
      areaStyle: { color: "rgba(34,211,238,0.03)" },
      lineStyle: { color: "rgba(34,211,238,0.1)" }
    },
    selectedDataBackground: {
      areaStyle: { color: "rgba(34,211,238,0.08)" },
      lineStyle: { color: "rgba(34,211,238,0.3)" }
    }
  },
  {
    type: "inside",
    realtime: true,
    start: 40,
    end: 100
  }
]
```

To accommodate this dataZoom component, ensure that your ECharts options have a layout `grid` bottom set to at least `50` or `52`.
