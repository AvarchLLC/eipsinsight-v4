'use client';

import { cn } from '@/lib/utils';
import { callSeriesShort } from '@/data/call-series';

/** AllCoreDevs series — everything else is treated as a "Breakout". */
export const ACD_SERIES = ['acdc', 'acde', 'acdt'] as const;
export const isAcdSeries = (series: string) => (ACD_SERIES as readonly string[]).includes(series);

export type SeriesGroup = 'all' | 'acd' | 'breakouts';

export interface SeriesFilterValue {
  group: SeriesGroup;
  /** Only meaningful when group === 'acd': 'all' | 'acdc' | 'acde' | 'acdt'. */
  acd: string;
}

export const DEFAULT_SERIES_FILTER: SeriesFilterValue = { group: 'all', acd: 'all' };

/** Does a call's series pass the current grouped filter? */
export function matchesSeries(series: string, f: SeriesFilterValue): boolean {
  if (f.group === 'all') return true;
  if (f.group === 'acd') return isAcdSeries(series) && (f.acd === 'all' || series === f.acd);
  return !isAcdSeries(series); // breakouts
}

/**
 * Grouped series filter: All · ACD · Breakouts, with a dropdown to narrow ACD
 * down to ACDC / ACDE / ACDT. Replaces the long flat list of per-series pills.
 */
export function SeriesFilter({
  value,
  onChange,
  counts,
}: {
  value: SeriesFilterValue;
  onChange: (v: SeriesFilterValue) => void;
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const acdTotal = ACD_SERIES.reduce((a, s) => a + (counts[s] ?? 0), 0);
  const breakoutTotal = total - acdTotal;

  const pill = (selected: boolean) =>
    cn(
      'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all',
      selected
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => onChange({ group: 'all', acd: 'all' })} className={pill(value.group === 'all')}>
        All <span className="text-[10px] opacity-70">{total}</span>
      </button>
      <button type="button" onClick={() => onChange({ group: 'acd', acd: 'all' })} className={pill(value.group === 'acd')}>
        ACD <span className="text-[10px] opacity-70">{acdTotal}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'breakouts', acd: 'all' })}
        className={pill(value.group === 'breakouts')}
      >
        Breakouts <span className="text-[10px] opacity-70">{breakoutTotal}</span>
      </button>

      {value.group === 'acd' && (
        <select
          value={value.acd}
          onChange={(e) => onChange({ group: 'acd', acd: e.target.value })}
          className="h-7 rounded-full border border-primary/40 bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
          aria-label="Filter AllCoreDevs series"
        >
          <option value="all">All ACD</option>
          {ACD_SERIES.map((s) => (
            <option key={s} value={s}>
              {callSeriesShort(s)} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
