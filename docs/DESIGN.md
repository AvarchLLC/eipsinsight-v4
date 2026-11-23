# EIPsInsight design system: Ledger

EIPsInsight is a reference work for Ethereum standards, so it is designed like one. The
language is called **Ledger**: flat ruled surfaces, a serif for anything you read as a
title, a mono for anything you would cite, and one emerald accent that stays rare enough
to mean something.

Everything here is implemented in `src/app/globals.css` (tokens and primitives) and
`src/components/` (composed parts). During the phased migration, Ledger tokens and styles
are scoped under `[data-ledger]` so migrated pages opt in cleanly while legacy pages
continue functioning untouched. The CSS is layered `base` then `components`, so a
Tailwind utility on an element always wins over the component class beside it
(`btn h-12`, `chip rounded-full`, `ledger-row px-2`). Keep new primitives inside
`@layer components`. If this file and the code disagree, fix one of them
in the same change.

## 1. Principles

1. **Data is the decoration.** The most striking thing on a page should be real data
   (the index mosaic, a lifecycle, a status distribution), never a gradient or a glow.
2. **Rules, not boxes.** Structure comes from hairlines and one full-strength ink rule
   per section. Cards exist, but they are flat ruled panels.
3. **Green is a signal.** Emerald marks the brand, the primary action, and links. Selected
   states invert to ink instead, so the page never turns green.
4. **Colour has fixed meaning.** A status or track colour means the same thing on every
   page and is never borrowed for decoration.
5. **Same in light and dark.** Every colour is a token with a light and a dark value.
   Components never branch on theme.
6. **Fast paths first.** A number typed anywhere jumps to that proposal. Every list row is
   a link. Every filter is a URL.

### Never

- Glass, backdrop blur, glows, gradient washes, or noise textures.
- Drop shadows on resting surfaces (only floating overlays cast one).
- Cards that lift or scale on hover.
- Em dashes in any copy. Use a comma, a colon, or a new sentence.
- A raw hex or oklch value in a component. Add or use a token.
- A status colour used for anything except that status.

## 2. Colour

All values are OKLCH. Surfaces are neutral with a trace of the brand hue (165) so the
greys sit comfortably beside the emerald.

### Core tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `0.985 0.003 165` | `0.155 0.004 165` | Page background |
| `--surface` | `1 0 0` | `0.19 0.005 165` | Cards, mastheads, inputs |
| `--surface-2` | `0.966 0.004 165` | `0.225 0.006 165` | Hover rows, sunken areas, code |
| `--surface-3` | `0.94 0.005 165` | `0.26 0.007 165` | Pressed or deeper wells |
| `--overlay` | `1 0 0` | `0.21 0.006 165` | Palette and dropdown panels |
| `--ink` | `0.2 0.012 165` | `0.955 0.004 165` | Titles, body, strong rules |
| `--ink-muted` | `0.42 0.012 165` | `0.74 0.008 165` | Secondary text |
| `--ink-faint` | `0.55 0.01 165` | `0.58 0.009 165` | Labels, metadata |
| `--border` | `0.905 0.005 165` | `0.275 0.007 165` | Hairlines |
| `--border-strong` | `0.8 0.008 165` | `0.38 0.01 165` | Input borders, inactive tracks |

### Brand

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--brand` | `0.62 0.15 162` | `0.78 0.15 162` | Fills and marks: logo, primary button, live dot, graph hub |
| `--brand-strong` | `0.45 0.115 162` | `0.84 0.13 162` | Brand-coloured **text** and links (passes contrast on paper) |
| `--brand-soft` | `0.955 0.035 162` | `0.27 0.05 162` | Tinted wash behind brand text |
| `--brand-ink` | `0.18 0.04 162` | `0.16 0.03 162` | Text on a `--brand` fill |

Text is never set in `--brand` (it fails contrast in light mode). Use `text-brand-strong`.

### Semantic constants

Used through `<Badge>` and `data-token`. Each has a lighter dark-mode twin in
`globals.css`.

| Meaning | Token | Hue |
| --- | --- | --- |
| Draft | `--c-draft` | slate |
| Review | `--c-review` | amber |
| Last Call | `--c-lastcall` | orange |
| Final | `--c-final` | green |
| Living | `--c-living` | teal |
| Stagnant | `--c-stagnant` | dusty rose |
| Withdrawn | `--c-withdrawn` | red |
| Moved | `--c-moved` | violet |
| Core / Networking / Interface / ERC / RIP | `--c-core` … `--c-rip` | indigo, blue, cyan, emerald, gold |
| Meta / Informational / Standards Track | `--c-meta`, `--c-informational`, `--c-standards` | violet, slate, slate |
| Execution / Consensus layer | `--c-el`, `--c-cl` | blue, violet |
| Editor / Author / Reviewer / Contributor | `--c-editor` … | emerald, violet, cyan, slate |

Pull request and issue states borrow the status colour that means the same thing: Open
and Approved are Final green, Merged is Moved violet, Closed and Changes requested are
Withdrawn red, Commented is Draft slate.

Upgrade buckets reuse status colours through `bucketToken()` in `src/lib/format.ts`:
Included and Scheduled are Final green, Considered is Review amber, Proposed is Draft
slate, Declined is Withdrawn red.

Setting `data-token="final"` on any element defines `--token` for it and its children.
Badges, ledger spines, mosaic cells and meters all read `--token`.

## 3. Typography

| Family | Variable | Role |
| --- | --- | --- |
| Fraunces (optical size axis, 600, italic 400) | `--font-fraunces` | Titles, figures, the logo wordmark |
| Geist | `--font-geist` | Body and interface text |
| Geist Mono | `--font-geist-mono` | Identifiers, dates, counts, eyebrows, keyboard hints |

Root size is 17px (`html { font-size: 106.25% }`) so the site reads at
reference-document size. Reference the font variables directly in CSS, since Tailwind's
`@theme inline` does not emit mapped font variables.

| Class | Size | Use |
| --- | --- | --- |
| `.t-display` | `clamp(2.7rem, 6.4vw, 5.2rem)` / 0.98 | Home hero only |
| `.t-h1` | `clamp(2.1rem, 4.4vw, 3.3rem)` / 1.04 | One per page, in the masthead |
| `.t-h2` | `clamp(1.65rem, 2.8vw, 2.2rem)` / 1.1 | Section titles |
| `.t-h3` | `1.25rem` / 1.25 | Card titles, sub-section titles |
| `.t-lead` | `1.15rem` / 1.55, muted | The sentence under a title |
| `.t-figure` | `clamp(2.4rem, 4.6vw, 3.5rem)` | Big numbers |
| `.eyebrow` | `0.68rem` mono, uppercase, 0.12em tracking | Names a region or a column |
| body | `1rem` / 1.6 | Default |

Rules of use:

- Serif is for titles and numbers. Body copy and controls are always Geist.
- Anything a reader might cite or copy is mono: `EIP-4844`, `#12594`, `Mar 2024`, counts.
- `.accent` (italic serif in `--brand-strong`) is the single flourish. One per page at most.
- Sentence case everywhere. Only eyebrows are uppercase.

## 4. Layout and spacing

- **Measure:** `.wrap` is the universal page container: `74rem` max, `1.25rem` gutters
  on phones, `2rem` from `sm`. Every page hangs from the same two edges.
  `.wrap-narrow` (`50rem`) is strictly for single-column utilities like Search.
  Do not artificially narrow or center long-form articles or research deep-dives into
  isolated reading columns; research papers feature wide comparison charts, invariant
  matrices, and replay tables that breathe properly inside `.wrap`.
- **Rhythm:** sections are separated by `6rem` (`space-y-24`) on index pages and `4rem`
  (`space-y-16`) inside a document. A section head sits `2rem` above its content.
- **Breakpoints:** `sm` 640 (tab bar gives way to header nav, lists gain columns),
  `lg` 1024 (two-column layouts, the entity rail appears).
- **Shape:** `--radius` is `0.5rem` for cards and fields, `0.375rem` for buttons and
  chips, `4px` for badges, `2px` for swatches and mosaic cells. Nothing is fully round
  except avatars and the live dot.
- **Elevation:** resting surfaces have none. `--shadow-overlay` is reserved for the
  command palette and the hero results panel.

### Page anatomy

1. **Ticker** (`Ticker`): a 2rem strip above the header carrying the latest status
   changes. It scrolls away with the page, pauses on hover, and every item is a link.
2. **Header** (`SiteHeader`, mounted once in the root layout): sticky, solid paper, one
   hairline. Three zones: logo left, the segmented nav (`.nav-seg`) centred with live
   counts, search field and theme toggle right. The current section inverts to ink. Below
   `sm` the nav moves to the tab bar and search becomes an icon.
3. **Masthead:** a `bg-surface` band with a bottom hairline holding eyebrow or breadcrumb,
   the `h1`, a lead, and page-level facts. Index pages use `PageHead`.
4. **Sections:** each opens with `SectionHead` (ink rule, mono eyebrow with an optional
   index number, serif title, optional description and action).
5. **Footer** (`SiteFooter`): opens with an ink rule, three columns, a mono colophon.
6. **Phone tab bar** (`TabBar`): fixed to the bottom below `sm` with Home, Proposals,
   Upgrades, Contributors, Search. The footer pads itself so the bar never covers it.
   The desktop nav carries one more destination (Calls) that the phone bar has no room
   for. Search lives in exactly one place per width: the header field from `sm`, the tab
   bar below it, and in the `sm` to `md` gap the header shows a search icon instead.

### The home page

The home page is the one place the layout is framed. The hero and the index sit inside
side rails (`sm:border-x`) with `.crop` registration marks where the rails meet a
horizontal rule, so the top of the page reads as a printed plate:

1. **Hero plate:** status pill, `.t-display` headline, lead, the hero search, a row of
   numbers to try. Centred. Its base is the four figures on a ruled strip.
2. **Index plate** (`bg-surface`): the mosaic, unboxed, between the same rails.
3. **Open sections** below, no rails: latest movements, upgrades, ways to browse, and a
   closing line that opens the palette.

Do not add rails or crop marks to other pages. They mark the front page.

## 5. Components

| Part | Where | Notes |
| --- | --- | --- |
| `.card` / `.card-quiet` | CSS | Flat panel with a hairline. `-quiet` is the sunken variant for empty states. |
| `.tile` | CSS | A pressable card. Hover darkens the border to ink and nudges `.tile-arrow`. It never lifts. |
| `.ledger` + `.ledger-row` | CSS | The list primitive. Rows are split by hairlines. Hover fills the row and shows a 2px spine in `--token` (the status colour, or brand by default). `data-active="true"` gives the same state for keyboard selection. |
| `ProposalRow` | `proposal-row.tsx` | One proposal as a ledger line: mono call number, title, optional meta, status badge. Used everywhere a proposal is listed. |
| `HitBody` | `hit-row.tsx` | The inside of a search result line, shared by the hero bar, the palette and `/search`. |
| `Badge` | `badge.tsx` | The semantic constant. Squared, tinted with `--token`, explains itself on hover unless `tip={false}` (always off inside rows). |
| `.chip` | CSS | A filter or suggestion. `data-active="true"` inverts it to ink. `.chip-n` is its count. |
| `.btn` `.btn-primary` `.btn-outline` | CSS | 40px controls. One primary action per view at most. |
| `.icon-btn` | CSS | 36px square icon control. |
| `.field` | CSS | Search input shell. Focus darkens the border and adds the ring. |
| `CommandBar` + `.searchbox` | `command-bar.tsx` | The hero search. A 1.5px ink outline with the primary button inside it. See "Search" below. |
| `Highlight` + `mark.hl` | `hit-row.tsx` | Marks the typed text inside a result title with a brand-soft wash. |
| `.nav-seg` | CSS | The segmented primary nav. `aria-current="page"` inverts a segment to ink. `.nav-n` is its count. |
| `Ticker` + `.ticker` | `ticker.tsx` | Latest status changes above the header. |
| `.crop` | CSS | A 9px registration cross. Home page only. |
| `OpenPaletteButton` | `open-palette-button.tsx` | Any button that opens the command palette. |
| `.kbd` | CSS | Keyboard hint. |
| `SectionHead` | `src/components/ledger/section-head.tsx` | How every section opens: hairline ink rule with emerald accent, mono eyebrow, serif title. |
| `PageHead` | `src/components/ledger/page-head.tsx` | Masthead for index and profile pages: banded plate with bottom hairline holding eyebrow, h1, lead, and metadata facts. Aligns to `.wrap`. |
| `LeaderboardCard` | analytics & office hours | Single ruled container holding metric switcher, view toggle, and horizontal bar chart with medal badges (`🥇`, `🥈`, `🥉`). Never separated into outer filter boxes or podium cards. |
| `.masthead` | CSS | The banded page header with a faint fading engineering-grid texture for light-mode depth (`.masthead-shadow` adds a soft separation). Applied by `PageHead` and every detail masthead. |
| `ColumnChart` | `column-chart.tsx` | A ruled column chart, server-rendered as inline SVG, one or two grouped series. Scrolls on phones (min-width), bars carry a CSS tip. Every colour is a token. Used on Insights. |
| `DataTable` | `data-table.tsx` | A themed, generic sortable + paginated table. Client-side sort/paging over the rows it is given (instant), whole-row navigation with a real link in the first cell for keyboard access, responsive column hiding (`hideBelow`), themed via `.dtable` in globals. Used by `ProposalsTable` on /proposals. |
| `BarList` | `bar-list.tsx` | A ranked list with a proportional bar behind each value. Used for the busiest editors. |
| `PlainLanguage` / `Stakeholders` / `Enterprise` / `Faqs` | `curation.tsx` | Curated plain-language context from `eip_curations`: a layman summary with benefit/tradeoff lists, per-stakeholder impact cards, an enterprise-readiness brief with impact tiers, and a native `<details>` FAQ accordion. Shown on proposal pages when present. |
| `ThreadView` | `thread-view.tsx` | A pull request or issue: the entity masthead pattern, then proposals touched, reviews, and the description. Author-written markdown is rendered with `trusted={false}`. |
| `IndexMosaic` | `index-mosaic.tsx` | Every proposal as one square in number order, coloured by status. Hover reads one out, the legend isolates a status, a click opens it. |
| `LifecycleTrack` | `lifecycle-track.tsx` | Horizontal stepper from `sm`, vertical on phones so no stage is off-screen. |
| `DependencyGraph` | `dependency-graph.tsx` | SVG fan from `sm`, chip lists on phones. |
| `.ghost-numeral` | CSS | The proposal number as a giant outlined serif behind the entity masthead. Decorative, hidden below `md`. |
| `.tip[data-tip]` | CSS | Pure CSS tooltip, ink on paper inverted. Anchored to the element's left edge. Disabled on touch. |
| `.eip-content` | CSS | Rendered proposal markdown, capped at a `46rem` reading measure. |

### Search

Search is the product, so it has one behaviour everywhere (hero, palette, `/search`):

- **Focus opens it.** The hero panel hangs off the field as one surface: the field squares
  its bottom corners and the panel continues the same ink outline. It opens in 180ms from
  the top edge. It never pushes the page down.
- **Empty is useful.** Before anything is typed the panel offers popular searches, links to
  the index pages, and what just changed.
- **A number is a command.** A bare number, or `EIP-123` / `ERC-20`, shows a "Go to" row
  first and Enter goes straight there with no database wait (`src/lib/swoop.ts`).
- **Results are grouped** under sticky labels (Proposals, Upgrades, People, Pull requests,
  Issues) by `ResultGroups`. Each label carries the full count for its group, and "Show
  all" when the group holds more than its preview. Groups keep that order unless one holds
  an exact hit, which then leads. The typed text is highlighted in each title.
- **Scope chips** narrow to one group. On `/search` the scope lives in the URL (`type=`)
  and each chip shows how many results it holds.
- **Results never flash empty.** The previous list stays on screen while the next one
  loads, and repeats are answered from memory (`useSearch`).
- **Keys:** arrows move, Enter opens the selected row, Escape closes. The selected row uses
  the ledger `data-active` state.
- **Idle placeholder** types out example searches. It stops the moment the field is used.

### States

- **Hover:** borders go to `--ink`, rows fill with `--surface-2`. No movement beyond a 2px
  arrow nudge.
- **Selected:** inverted ink (chips), or an ink underline (nav). Not green.
- **Focus:** a 2px `--ring` outline on everything focusable. Inputs show it on their
  `.field` wrapper instead.
- **Empty and error:** a `.card-quiet` with one plain sentence and, where possible, a link
  that fixes it ("Clear filters").

## 6. Motion

- Entrance: `.rise` (fade and 10px settle, 0.6s) on the home hero only, staggered by 50ms.
- Search panel: opens in 180ms from its top edge; rows settle in over 250ms.
- Interaction: 120 to 200ms colour and border transitions.
- Data: figures count up once when they scroll into view. Charts are static (server-rendered SVG); only their CSS tooltips react.
- All of it is disabled under `prefers-reduced-motion`.

Only three things loop: the 7px live dot, the ticker (80s per pass, paused on hover or
focus), and the idle search placeholder. Nothing else may.

## 7. Voice

- Plain and specific. Say what a thing is, then stop.
- Sentence case. No exclamation marks. No em dashes.
- Labels name the thing ("Proposals", "Network upgrades"), actions say what happens
  ("Browse 266 Final", "Show full specification", "Clear filters").
- Explain jargon where it appears: status and bucket meanings live in `src/lib/meanings.ts`
  and surface through badges and section descriptions.

## 8. Calls

Protocol calls are their own area, three levels deep, so a reader can enter at any altitude.

- **Index** (`/calls`): the newest recaps first, each leading with its headline decision,
  then every series as a card grouped into All Core Devs, Breakouts, and Governance
  process. This turns 247 meetings into about two dozen entry points. A card carries the
  cadence ("meets biweekly"), when it last met, the call count, and the latest decision, so
  the choice is informed before the click. Series labels and groups live in
  `src/data/call-series.ts`.
- **Series** (`/calls/[series]`): a timeline of that one series, newest first, each call
  leading with its headline decision and a decision count.
- **Call** (`/calls/[series]/[number]`): a two-column workspace. On `lg` the left column is
  sticky (the embedded player and the contents rail); the right column is one continuous
  recap.

### The call workspace (`call-workspace.tsx`)

- **No tabs.** The call reads top to bottom as one recap. Six tabs fragmented it; a single
  scroll with a jump list reads better.
- **Contents rail** ("On this call"): a quiet left-ruled list of the sections present, each
  with its count. It is the navigation. A click jumps to a section; a scroll-spy gives the
  section nearest the top a brand spine and ink text. Hidden below `lg`, where the sections
  simply stack.
- **The player drives.** The recording is a YouTube embed through the IFrame API, so the
  page can seek it. When the video is embeddable, every timestamp seeks it in place rather
  than opening a new tab, and the moment currently playing is washed in `--brand-soft` as
  the video runs. Only without an embed do timestamps fall back to a `?t=` deep link.
- **Sections, in reading order, each shown only when it has content:** TL;DR, Decisions,
  By EIP, Highlights (grouped by topic), Action items, Targets, Agenda, Transcript, Chat.
- **By EIP** is the view worth coming for: every proposal named on the call, and under it
  each moment it came up, labelled by where it came from, timestamped and seekable. Each
  EIP carries our own title and links to its proposal page, which an outside tracker cannot
  offer.
- **Agenda** reads `pm_agenda_eips`: the proposals scheduled, who raised each, and a tidied
  snippet.
- **Transcript and Chat** sit inside the flow as bounded scroll boxes, so a thousand-line
  transcript or chat never runs away with the page. Transcript lines are seekable and
  follow playback.

The server for all of this is `src/server/calls.ts`.

## 9. Contributors

- The section is named **Contributors** (the route stays `/people`).
- **Avatars fall back.** `contributor_scores.actor` mixes GitHub handles with git author
  names, so an avatar validates the handle and otherwise draws initials (`Avatar`,
  `avatar.tsx`). The same fallback covers every face on the site.
- **Rank by score, never lead with it.** A contribution score means little to a reader who
  does not know its formula, so the leaderboard and the profile headline the real counts
  (reviews, comments, pull requests, commits) and show the score small and muted, with a
  tooltip saying it is a weighted roll-up of that activity.
- **Roles are standing, not per-activity.** The scheduler tags activity rows with a role
  heuristically and over-reports editorship. The Editor and Reviewer badges are therefore
  gated on a governance roster in `src/data/eip-editors.ts`, the current EIP editors named
  in EIP-1 (not emeritus editors, not breakout leads). Author and Contributor stay derived
  from activity.

## 10. Data, caching and freshness

The experience depends on data being both fresh and resilient, so two rules hold across
every server module.

- **Never cache a failure.** Every read is wrapped in `cachedOr` (`src/lib/cache.ts`): it
  caches a success for 300s and, on a throw, returns the fallback for that one request and
  retries on the next. A database blip shows stale or empty data for a moment, never for
  five minutes.
- **Version a cache key when its shape changes.** A cached value outlives a deploy, so when
  its fields change, bump the key suffix (`v5-calls`, then `v5-calls-2`) to retire the old
  shape instead of serving it.

Reads go through a read-only `pg` pool (`query()` in `src/lib/db.ts`); pages are server
components with `revalidate = 300`. Some data is not in the database: a call's transcript
and chat are fetched from the ethereum/pm ACDbot archive, bounded to an 8s timeout, cached
for an hour and never on failure (`getCallArtifacts`).

## 11. Adding a page

1. Start with a masthead (`PageHead`, or the entity pattern) inside the shared layout. Do
   not render your own header or footer.
2. Put content in `.wrap`. Open each section with `SectionHead`.
3. Lists of proposals use `ProposalRow` inside `.card.ledger`.
4. Filters are `.chip` links that write to the URL, so the view can be shared.
5. Check it at 375px, 768px and 1280px, in both themes, before calling it done.

## 12. Research & technical deep dives

The research section (`/research`) publishes empirical investigations of upcoming protocol
changes, gas repricing, and edge-case execution failures.

- **Index (`/research`):** leads with headline visual metrics ("data as decoration"),
  replayed test metrics, and scope tags on pressable tiles (`.tile`).
- **Article detail (`/research/[slug]`):** starts with `PageHead` inside the shared layout,
  followed by `.wrap`. Do not center or constrain article bodies to a narrow column.
  Empirical investigations contain wide differential replay tables, invariant matrices,
  and ECharts benchmarks that require the full reference measure.
- **Section styling:** section dividers feature a 10px brand accent (`bg-[var(--brand)]`)
  leading into the hairline ink rule. Detailed rationale or reproducibility instructions
  are nested inside expandable `<More>` triggers.
- **Visual outcomes:** replayed transaction outcomes use semantic tokens consistently:
  `hard-break` is `--c-withdrawn` (red), `out-of-gas` is `--c-review` (amber), and
  `fixable` is `--c-final` (green).

## 13. Office Hours & editorial governance

The Office Hours hub (`/officehours`) coordinates EIP editing calls, the review board,
and maintainer activity across six tabs: `Overview`, `Board`, `PR Analytics`, `Editors`,
`Reviewers`, and `Calls`.

- **Embedded analytics:** `/officehours/editors` and `/officehours/reviewers` mount
  `AnalyticsLayout embedded`, reusing the shared time-range and repository controls while
  staying synchronized with `/analytics/editors` and `/analytics/reviewers`.
- **Unified leaderboard:** rankings are presented inside a single ruled container. Never
  stack redundant podium cards or duplicate view switchers above the graph. The card
  header houses the metric selector (`Reviews`, `PRs Touched`, `Turnaround`), the view
  switcher (`Graph` or `Table`), and CSV export. Top reviewers and editors carry medal
  glyphs (`🥇`, `🥈`, `🥉`) directly on the chart Y-axis.
- **Category specialization:** proposal tracks use canonical naming (`ERC`, `Core`,
  `Interface`, `Networking`, `Meta`, `Informational`, `RIP`) and fixed track colors.
  Category workload is explored through normalized 100% share bars, distinct PR review
  volume, or raw event counts.

## 14. Post-quantum security

The Post-Quantum section (`/pq`) tracks Ethereum's quantum-readiness roadmap, migration
phases, and signature schemes.

- **Comparative signature scale:** signature byte blow-up is visualized against the
  classical `secp256k1` baseline (64 B).
- **Roadmap & readiness:** proposals are tracked across four stages: Identified, Candidate,
  Formalized, and Scheduled. In-mempool aggregation (EIP-8288) is documented as the
  critical scalability dependency for post-quantum transaction throughput.

## 15. Phased transition strategy

To avoid risky big-bang rewrites, the design system transitions page by page using the
strangler-fig pattern:

1. **Additive foundation:** Ledger tokens live under `[data-ledger]`, coexisting with
   existing shadcn tokens and legacy layouts. Migrated pages add `data-ledger` to their
   root container.
2. **Component parity:** primitives are placed in `src/components/ledger/` and
   `@layer components` in `src/app/globals.css`.
3. **Rollout order:**
   - Phase 1: Research and deep dives (`/research`).
   - Phase 2: Post-quantum security (`/pq`) and maintainer analytics (`/analytics/*`, `/officehours/*`).
   - Phase 3: Standards, proposals, and upgrade trackers.
   - Phase 4: Homepage and global shell retirement of legacy CSS variables.
