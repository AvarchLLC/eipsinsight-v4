# EIPsInsight Design System: Ledger

EIPsInsight is an analytical reference work and coordination platform for Ethereum standards (EIPs, ERCs, RIPs). It is built with an editorial and archival design language called **Ledger**: flat ruled surfaces, retro Apple-Garamond serif typography (**Advercase**) for all titles, monospace (**Geist Mono**) for technical citations, and a single emerald accent (**Brand**) used strictly as an intentional signal.

Everything in this specification is implemented in `src/app/globals.css` (tokens and primitives) and `src/components/ledger/` (atomic components). This document covers the core design foundations, the active tokens, and the complete architecture for two primary subsystems:
1. **The Home Page** (The printed plate: side rails, registration crop marks, hero plate, searchbox, KPI strip, index mosaic)
2. **The Protocol Calls System** (The directory at `/calls` and the interactive media workspace at `/calls/[series]/[number]`)

---

## 1. Core Principles

1. **Data is the decoration**: The most prominent element on a screen is always real data (the proposal index mosaic, consensus decisions, an upgrade timeline), never arbitrary gradients, glows, or decorative illustrations.
2. **Rules, not boxes**: Visual hierarchy is created through hairline borders and a single full-strength ink rule per section. Panels and cards are flat ruled surfaces.
3. **Solid, opaque surfaces**: No translucent glassy washes, no backdrop blur, and no pale 15% opacity fills. Buttons, badges, and chips use solid, high-contrast colors.
4. **Green is a signal**: Emerald marks the brand, primary actions, and links. Selected states invert to solid ink instead of turning green, keeping the interface calm and legible.
5. **Color has fixed meaning**: Semantic colors (Draft slate, Review amber, Last Call orange, Final green, Withdrawn red) represent the exact same state everywhere and are never borrowed for styling.
6. **Headings are always Advercase**: All titles, display headlines, section headers (`h1`–`h6`, `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.dec-title`), and KPI figures are rendered in the signature serif font **Advercase**.

### Never Use
- Translucent washes (e.g. `bg-primary/10`, `border-border/60`), glassmorphism, or blurred backdrops.
- Drop shadows on resting surfaces (only elevated overlays like search dropdowns use a shadow).
- Cards that lift, tilt, or scale on hover (interactive tiles darken borders to ink and nudge a directional glyph by 2px).
- Em dashes (`—`) in copy. Use a colon, a comma, or a separate sentence.
- Raw hex codes or un-tokenized values in components. Always use CSS token variables.

---

## 2. Active Design Tokens

All tokens are defined in OKLCH in `src/app/globals.css`. Surfaces feature a subtle green-charcoal cast (hue 165) harmonizing with the emerald brand tone.

### Core Surfaces & Ink

| Token | Light Value | Dark Value | Purpose |
| --- | --- | --- | --- |
| `--paper` | `oklch(0.985 0.003 165)` | `oklch(0.155 0.004 165)` | Base page background canvas |
| `--surface` | `oklch(1 0 0)` | `oklch(0.19 0.005 165)` | Ruled cards, mastheads, form controls |
| `--surface-2` | `oklch(0.966 0.004 165)` | `oklch(0.225 0.006 165)` | Sunken areas, hover rows, inactive chips |
| `--surface-3` | `oklch(0.94 0.005 165)` | `oklch(0.26 0.007 165)` | Pressed states, active wells |
| `--overlay` | `oklch(1 0 0)` | `oklch(0.21 0.006 165)` | Dropdowns, command palette, floating menus |
| `--ink` | `oklch(0.2 0.012 165)` | `oklch(0.955 0.004 165)` | Primary titles, body text, strong rules |
| `--ink-muted` | `oklch(0.42 0.012 165)` | `oklch(0.74 0.008 165)` | Secondary body, metadata, inactive links |
| `--ink-faint` | `oklch(0.55 0.01 165)` | `oklch(0.58 0.009 165)` | Eyebrow labels, timestamps, disabled markers |
| `--border` | `oklch(0.905 0.005 165)` | `oklch(0.275 0.007 165)` | Standard hairline dividers (1px) |
| `--border-strong` | `oklch(0.8 0.008 165)` | `oklch(0.38 0.01 165)` | Input borders, emphasized boundaries |

### Brand (Emerald)

| Token | Light Value | Dark Value | Purpose |
| --- | --- | --- | --- |
| `--brand` | `oklch(0.62 0.15 162)` | `oklch(0.78 0.15 162)` | Emerald mark, primary action button, live dot |
| `--brand-strong` | `oklch(0.45 0.115 162)` | `oklch(0.84 0.13 162)` | High-contrast brand text and active links |
| `--brand-soft` | `oklch(0.955 0.035 162)` | `oklch(0.27 0.05 162)` | Solid subtle tint behind brand callouts |
| `--brand-ink` | `oklch(0.18 0.04 162)` | `oklch(0.16 0.03 162)` | Dark text on top of a `--brand` solid fill |

*Note: Raw `--brand` is used for fills; text always uses `--brand-strong` to guarantee strict WCAG AAA contrast.*

### Solid Semantic Badges (`.l-badge`)

Badges in Ledger are **100% opaque, solid fills** with high-contrast text (`#ffffff`). They never use translucent or faded washes.

```css
.l-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.15rem 0.55rem;
  border-radius: 4px;
  font-family: var(--font-geist-mono), monospace;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.35;
  background: var(--token-bg, #334155);
  color: var(--token-fg, #ffffff) !important;
  border: 1px solid var(--token-bg, #334155);
  white-space: nowrap;
  letter-spacing: 0.02em;
}
```

#### Status & Category Color Mappings

| State / Track | Data Token | Solid Background (`--token-bg`) | Text (`--token-fg`) |
| --- | --- | --- | --- |
| **Draft** | `data-token="draft"` | `#475569` (Slate 600) | `#ffffff` |
| **Review** | `data-token="review"` | `#b45309` (Amber 700) | `#ffffff` |
| **Last Call** | `data-token="lastcall"` | `#c2410c` (Orange 700) | `#ffffff` |
| **Final** | `data-token="final"` | `#15803d` (Green 700) | `#ffffff` |
| **Living** | `data-token="living"` | `#0f766e` (Teal 700) | `#ffffff` |
| **Stagnant** | `data-token="stagnant"` | `#be123c` (Rose 700) | `#ffffff` |
| **Withdrawn** | `data-token="withdrawn"` | `#b91c1c` (Red 700) | `#ffffff` |
| **Core** | `data-token="core"` | `#4338ca` (Indigo 700) | `#ffffff` |
| **Networking** | `data-token="networking"` | `#0369a1` (Sky 700) | `#ffffff` |
| **Interface** | `data-token="interface"` | `#0e7490` (Cyan 700) | `#ffffff` |
| **ERC** | `data-token="erc"` | `#047857` (Emerald 700) | `#ffffff` |
| **RIP** | `data-token="rip"` | `#b45309` (Amber 700) | `#ffffff` |
| **Meta** | `data-token="meta"` | `#6d28d9` (Violet 700) | `#ffffff` |
| **Informational** | `data-token="informational"` | `#475569` (Slate 600) | `#ffffff` |

---

## 3. Typography Hierarchy

| Font Family | CSS Variable | Usage |
| --- | --- | --- |
| **Advercase** | `var(--font-advercase)` | **All headings and display text**: `h1`–`h6`, `.t-display`, `.t-h1`, `.t-h2`, `.t-h3`, `.dec-title`, and `.t-figure`. |
| **Plus Jakarta Sans / Inter** | `var(--font-plus-jakarta)` / `var(--font-inter)` | **Interface & prose**: Form inputs, buttons, filter chips, navigation items, and body copy. |
| **Geist Mono** | `var(--font-geist-mono)` | **Technical identifiers**: Proposal numbers (`EIP-7702`), call counts, timestamps, `.eyebrow`, `.kbd`, and badges. |

### Typography Classes

- `.t-display`: `clamp(2.5rem, 5.2vw, 4.2rem)` / line-height 1.02. Advercase Bold. Used exclusively on the home page hero headline.
- `.t-h1`: `clamp(2.1rem, 4.4vw, 3.3rem)` / line-height 1.04. Advercase Bold. The single page-level title inside a masthead.
- `.t-h2`: `clamp(1.4rem, 2.4vw, 1.85rem)` / line-height 1.15. Advercase Bold. Major section titles.
- `.t-h3`: `1.125rem` / line-height 1.35. Advercase Bold. Card and workspace section titles.
- `.dec-title`: `1.125rem`–`1.25rem` / line-height 1.15. Advercase Bold. Standard editorial heading primitive.
- `.t-figure`: `clamp(2.2rem, 4.0vw, 3.2rem)` / line-height 1. Advercase Bold, tabular numbers. KPI values.
- `.eyebrow`: `0.68rem`, uppercase, tracking 0.12em. Geist Mono. Section and category markers.
- `.t-lead`: `1.15rem`, line-height 1.55. Plus Jakarta Sans / Inter in `--ink-muted`. Explanatory text beneath an `h1`.

---

## 4. The Home Page Architecture

The Home Page (`src/app/(public)/page.tsx`) represents the printed reference plate of EIPsInsight. Unlike other pages, its upper section is strictly framed with side rails and engineering crop marks.

### 1. Framed Plate Layout (`sm:border-x`)
- Bound between two vertical hairline rules (`border-[var(--border)]`) centered on screen with a maximum width of `74rem` (`max-w-7xl`).
- Where horizontal section dividers intersect the vertical side rails, a 9px registration crop mark (`CropMark` / `.crop`) is placed at each corner.

### 2. Hero Plate (`HomeHeroSection`)
- **Status Pill**: Centered pill showing live consensus and tracker state (`.live-dot` in `--brand`).
- **Display Title**: Set in `.t-display` Advercase serif, balanced and tight.
- **Lead Copy**: `.t-lead` highlighting the purpose of the platform in `--ink-muted`.
- **Hero Searchbox (`.searchbox`)**:
  - Ruled input plate with a `1.5px` border in `var(--border-strong)` transitioning to `var(--ink)` on focus.
  - Houses the query field, shortcut hints (`.kbd`), and primary action button (`.btn-primary`).
  - Active dropdown panel attaches seamlessly beneath the input without shifting layout.
- **KPI Metrics Strip**:
  - Four ruled figures dividing the base of the hero plate with vertical hairlines.
  - Numbers set in `.t-figure` Advercase with Geist Mono labels underneath (`Total EIPs`, `Final Standards`, `Core Proposals`, `Active Editors`).

### 3. Index Plate (Mosaic)
- Sits immediately beneath the hero plate within the same vertical rails.
- Displays every proposal ordered by number as an unboxed grid cell colored by status token.
- Provides immediate visual discovery without container padding or decorative wrappers.

### 4. Open Sections (No Rails)
- Below the index plate, side rails terminate and content opens to the full standard `.wrap` container:
  - **Recent Movements**: Real-time status changes and pull requests.
  - **Upgrade Watch**: Upcoming Hard Fork inclusion pipelines (e.g. Fusaka, Glamdring).
  - **Protocol Calls Preview**: Direct link to the `/calls` directory with latest recaps.

---

## 5. The Protocol Calls System

Protocol calls coordinate the core engineering decisions of Ethereum. The calls system is organized into two primary interfaces: the **Directory** (`/calls`) and the **Interactive Media Workspace** (`/calls/[series]/[number]`).

### A. The Calls Directory (`/calls`)

1. **Page Masthead (`PageHead`)**:
   - Banded surface plate (`bg-[var(--surface)]`) with engineering hairline grid texture.
   - Eyebrow displaying total series count (`4 SERIES`), title in `.t-h1` Advercase (`All Core Devs`), and lead text describing coordination scope.
2. **Series Filter Pills (`.chip`)**:
   - Non-wrapping solid filter chips (`whitespace-nowrap shrink-0`): `All`, `ACD`, `Breakouts`, `EthProof`, `EIPIP`, `EIP OH`.
   - Inactive: `bg-[var(--surface-2)] text-[var(--ink-muted)] border border-[var(--border)]`.
   - Active: `bg-[var(--ink)] text-[var(--paper)] font-semibold border-[var(--ink)]`.
3. **Grouped Series Overview**:
   - Structured into four canonical working categories:
     - `All Core Devs`: ACDE, ACDC, Testing.
     - `Breakout Calls`: Focused feature tracks (FOCIL, Pectra, PeerDAS, EOF).
     - `Governance Process`: EIPIP and EIP Office Hours.
     - `One-off Calls`: Ephemeral technical sessions.
   - **Series Card (`SeriesCard`)**:
     - Solid series badge (`LedgerBadge` with series token).
     - Title in `.t-h3` Advercase serif.
     - Cadence description ("meets ~biweekly", "last 2d ago") and total call count in Geist Mono.
     - Ruled footer displaying latest call number and headline summary.
4. **Recent & Upcoming Calls List**:
   - Ruled ledger list with disclosure expanders for quick outcome inspection.

---

### B. The Call Workspace (`/calls/[series]/[number]`)

The call detail workspace (`CallWorkspace`) is an interactive companion player that synchronizes video playback with structured notes, proposals, and live transcript cues.

#### 1. Masthead Strip
- Back navigation link with directional arrow.
- Solid series badge (`LedgerBadge` with series token) and call number.
- Call title in `.t-h1` Advercase serif.
- Metadata strip: Meeting date, duration, total agenda items, decisions count, and proposal count in Geist Mono.

#### 2. Media Companion Split (Two-Column Layout)
- **Left Column: Video Player**
  - 16:9 responsive container housing an embedded YouTube player.
  - Powered by the YouTube IFrame API to enable programmatic seeking from any timestamp on the page.
- **Right Column: Media Companion Switcher**
  - Allows the user to toggle between:
    - **Live Transcript**: Scrollable container of transcript cues. Clicking any timestamp seeks the video immediately to that second. The active cue currently playing is highlighted in solid `var(--surface-2)`.
    - **Key Outcomes**: High-level executive bullet points and consensus summaries.

#### 3. Workspace Navigation Tabs
The lower section switches between four focused tabs:
- **`Highlights & Notes`**:
  - Executive summary and key discussion points.
  - **Detailed Notes by Topic**:
    - Topic filter buttons are placed on their **own dedicated row** directly beneath the heading (never inline with the title) to prevent cramped wrapping.
    - Topic chips use non-wrapping solid buttons (`.chip` with `whitespace-nowrap shrink-0`).
    - Individual topic cards feature Advercase titles and timestamped seekable moments.
- **`Proposals & EIPs`**:
  - Card grid of all proposals referenced during the meeting.
  - Each card features:
    - Solid repository badge (`EIP` indigo `#4338ca`, `ERC` emerald `#047857`, `RIP` gold `#b45309`).
    - Solid state badge (`Discussed` green, `Mentioned` slate, `On agenda` cyan).
    - Proposal number in Advercase serif, official title, and seekable timestamps for every mention.
- **`Decisions & Actions`**:
  - Two-column split:
    - **Consensus Decisions**: Ruled cards with solid green decision badges and high-contrast text.
    - **Action Items**: Assigned tasks with solid orange action badges, assignee GitHub handles, and follow-up deadlines.
- **`Agenda`**:
  - Formal agenda extracted from `ethereum/pm` repository agendas.

---

## 6. Shared Component Primitives

### Solid Filter Chip (`.chip`)
```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.9rem;
  padding-inline: 0.75rem;
  border-radius: var(--l-radius-control);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--ink-muted);
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}
.chip:hover {
  border-color: var(--ink);
  background: var(--surface-3);
  color: var(--ink);
}
.chip[data-active="true"] {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
  font-weight: 600;
}
```

### Section Divider (`SectionHead`)
- How every major section opens:
  - Top rule: A 40px emerald accent (`bg-[var(--brand)]`) followed by a 1px hairline rule in `var(--border)`.
  - Eyebrow: Geist Mono label with optional sequence index (`01 / CALLS`).
  - Heading: Advercase serif heading (`.t-h2`).
  - Action link: Optional right-aligned link with a 2px hover arrow nudge.
