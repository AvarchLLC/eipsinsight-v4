/**
 * The single source of truth for chart colours.
 *
 * Every colour here is a `var(--…)` reference to a design token defined in
 * globals.css, so charts are automatically theme-aware (light/dark) and every
 * section uses the exact same palette. Previously each chart hardcoded its own
 * hex values (~43 distinct, with casing duplicates), so "series 1 blue" looked
 * slightly different on every page and grids/axes didn't follow the theme.
 *
 * Recharts (and most chart libs) accept `var(--token)` anywhere a colour string
 * is expected — `stroke`, `fill`, `color`, gradient stops, etc.
 *
 * For status/stage semantics (Draft/Final, PFI/DFI…) keep using the canonical
 * helpers in `proposal-status.ts` / `upgrade-stages.ts` — don't reinvent them.
 */

/** Categorical series palette. Cycle through these for multi-series charts. */
export const CHART_SERIES = [
  'var(--chart-1)', // blue
  'var(--chart-2)', // green
  'var(--chart-3)', // cyan
  'var(--chart-4)', // amber
  'var(--chart-5)', // magenta
  'var(--chart-6)', // violet
  'var(--chart-7)', // red
  'var(--chart-8)', // slate
] as const;

/** Nth categorical colour, wrapping around the palette. */
export function chartColor(index: number): string {
  return CHART_SERIES[((index % CHART_SERIES.length) + CHART_SERIES.length) % CHART_SERIES.length];
}

/** Semantic colours for up/down/neutral and the brand accent. */
export const CHART_SEMANTIC = {
  positive: 'var(--chart-2)', // green
  negative: 'var(--chart-7)', // red
  neutral: 'var(--chart-8)', // slate
  accent: 'var(--primary)',
} as const;

/**
 * Neutral chrome colours — axes, gridlines, tick labels. These map to the same
 * foreground/border tokens the rest of the UI uses, so charts match the page in
 * both themes instead of a fixed slate that only looked right in one.
 */
export const CHART_AXIS = 'var(--muted-foreground)';
export const CHART_GRID = 'var(--border)';
export const CHART_LABEL = 'var(--foreground)';
