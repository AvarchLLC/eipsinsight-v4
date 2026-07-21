/**
 * Shared ECharts theming wired to the app's CSS design tokens.
 *
 * Charts used to hardcode a Tailwind slate palette (`rgba(15,23,42,.96)` and
 * friends). Slate carries a blue hue, so those tooltips read as navy against the
 * app's neutral near-black surfaces — and the dark-only ones stayed dark in light
 * mode. Driving the chrome from `var(--popover)` / `var(--border)` instead keeps
 * tooltips identical to every other panel and makes them follow the theme toggle
 * with no `isDark` branching at the call site.
 */

/** Token references for use inside `formatter` HTML strings. */
export const CHART_TOOLTIP_FG = 'var(--popover-foreground)';
export const CHART_TOOLTIP_MUTED = 'var(--muted-foreground)';
export const CHART_TOOLTIP_BORDER = 'var(--border)';

/**
 * ECharts writes its own inline styles onto the tooltip element and appends
 * `extraCssText` after them, so these declarations need `!important` to win the
 * cascade. Verified against the live DOM — without it, ECharts' inline
 * `background-color` and `color` take precedence.
 */
const TOOLTIP_CSS = [
  'background: var(--popover) !important',
  'color: var(--popover-foreground) !important',
  'border: 1px solid var(--border) !important',
  'border-radius: var(--radius) !important',
  'box-shadow: 0 12px 32px rgb(0 0 0 / 0.28) !important',
  'padding: 10px 12px !important',
].join('; ');

/**
 * Themed tooltip config. Spread-merge friendly:
 *
 *   tooltip: chartTooltip({ trigger: 'item', formatter: … })
 *
 * Pass `minWidth` for tooltips that would otherwise jitter as values change.
 */
export function chartTooltip<T extends Record<string, unknown>>(
  overrides?: T,
  options?: { minWidth?: number }
) {
  const minWidth = options?.minWidth;
  return {
    // Zeroed so the CSS variables in extraCssText own the chrome entirely.
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    textStyle: { fontSize: 12 },
    extraCssText: minWidth ? `${TOOLTIP_CSS}; min-width: ${minWidth}px` : TOOLTIP_CSS,
    ...overrides,
  };
}

/**
 * One `label — value` line for custom tooltip `formatter` output, with an optional
 * colour dot. Keeps multi-series tooltips visually identical across charts.
 */
export function chartTooltipRow(
  label: string,
  value: string | number,
  dotColor?: string
): string {
  const dot = dotColor
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${dotColor}"></span>`
    : '';
  return (
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:11px;margin-top:4px">` +
      `<span style="display:inline-flex;align-items:center;gap:6px">${dot}` +
        `<span style="color:${CHART_TOOLTIP_MUTED}">${label}</span>` +
      `</span>` +
      `<span style="font-weight:700;color:${CHART_TOOLTIP_FG};font-variant-numeric:tabular-nums">${value}</span>` +
    `</div>`
  );
}

/** Muted eyebrow used as the first line of a custom tooltip (usually the axis value). */
export function chartTooltipTitle(text: string): string {
  return `<div style="font-weight:600;font-size:11px;letter-spacing:0.02em;color:${CHART_TOOLTIP_MUTED}">${text}</div>`;
}
