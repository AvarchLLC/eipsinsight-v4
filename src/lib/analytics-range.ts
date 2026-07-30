/**
 * Shared resolver for the analytics/insights time-range filter.
 *
 * The analytics data is monthly-granularity, so a "last N days" preset resolves
 * to the calendar month(s) that window actually touches — never an arbitrary
 * month count. Previously every page hardcoded its own mapping (7d→1mo on one
 * page, 7d→3mo on another, none handling 15d), so the labels didn't match the
 * data and the filters were inconsistent between sections. Route every page
 * through here instead.
 */

export type TimeRange =
  | '7d'
  | '15d'
  | '30d'
  | '90d'
  | '1y'
  | 'this_month'
  | 'all'
  | 'custom';

/** Number of days a preset covers, or null for non-day presets. */
export function rangeDays(range: TimeRange): number | null {
  switch (range) {
    case '7d':
      return 7;
    case '15d':
      return 15;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return null;
  }
}

function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDiff(fromYm: string, toYm: string): number {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Resolve a preset to an inclusive `{ from, to }` month window (YYYY-MM).
 * `all` → open window; `custom` → the provided months.
 */
export function rangeToMonthWindow(
  range: TimeRange,
  customFromMonth?: string,
  customToMonth?: string,
  now: Date = new Date()
): { from?: string; to?: string } {
  const to = ym(now);
  if (range === 'all') return { from: undefined, to: undefined };
  if (range === 'custom') {
    return { from: customFromMonth || undefined, to: customToMonth || undefined };
  }
  if (range === 'this_month') return { from: to, to };

  const days = rangeDays(range) ?? 365;
  const fromDate = new Date(now);
  fromDate.setDate(now.getDate() - days);
  return { from: ym(fromDate), to };
}

/**
 * Number of calendar months a preset touches (for consumers that take a
 * "months back" count rather than a month window). `all`/`custom` → undefined.
 */
export function rangeToMonthsBack(
  range: TimeRange,
  now: Date = new Date()
): number | undefined {
  if (range === 'all' || range === 'custom') return undefined;
  if (range === 'this_month') return 1;
  const { from, to } = rangeToMonthWindow(range, undefined, undefined, now);
  if (!from || !to) return undefined;
  return monthDiff(from, to) + 1;
}
