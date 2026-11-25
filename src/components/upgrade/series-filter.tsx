'use client';

import { cn } from '@/lib/utils';
import { callSeriesShort } from '@/data/call-series';

/** AllCoreDevs series (incl. the ACDT-CL breakout) — everything else is a "Breakout". */
export const ACD_SERIES = ['acdc', 'acde', 'acdt', 'acdtcl'] as const;
export const isAcdSeries = (series: string) => (ACD_SERIES as readonly string[]).includes(series);

export type SeriesGroup = 'all' | 'acd' | 'breakouts' | 'ethproofs' | 'eipip' | 'eipoh';

export interface SeriesFilterValue {
  group: SeriesGroup;
  /** Only meaningful when group === 'acd': 'all' | 'acdc' | 'acde' | 'acdt' | 'acdtcl'. */
  acd: string;
}

export const DEFAULT_SERIES_FILTER: SeriesFilterValue = { group: 'all', acd: 'all' };

/** Does a call's series pass the current grouped filter? */
export function matchesSeries(series: string, f: SeriesFilterValue): boolean {
  if (f.group === 'all') return true;
  if (f.group === 'acd') return isAcdSeries(series) && (f.acd === 'all' || series === f.acd);
  if (f.group === 'ethproofs') return series === 'ethproofs';
  if (f.group === 'eipip') return series === 'eipip';
  if (f.group === 'eipoh') return series === 'eipoh';
  // breakouts: everything that isn't ACD, EthProofs, or an editorial call series.
  return !isAcdSeries(series) && series !== 'ethproofs' && series !== 'eipip' && series !== 'eipoh';
}

/**
 * Grouped series filter: All · ACD · Breakouts · EthProof, with a dropdown to narrow ACD
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
  const ethproofsTotal = counts['ethproofs'] ?? 0;
  const eipipTotal = counts['eipip'] ?? 0;
  const eipohTotal = counts['eipoh'] ?? 0;
  const breakoutTotal = total - acdTotal - ethproofsTotal - eipipTotal - eipohTotal;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange({ group: 'all', acd: 'all' })}
        data-active={value.group === 'all'}
        className="chip cursor-pointer"
      >
        All <span className="font-mono text-[10px] opacity-75">{total}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'acd', acd: 'all' })}
        data-active={value.group === 'acd'}
        className="chip cursor-pointer"
      >
        ACD <span className="font-mono text-[10px] opacity-75">{acdTotal}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'breakouts', acd: 'all' })}
        data-active={value.group === 'breakouts'}
        className="chip cursor-pointer"
      >
        Breakouts <span className="font-mono text-[10px] opacity-75">{breakoutTotal}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'ethproofs', acd: 'all' })}
        data-active={value.group === 'ethproofs'}
        className="chip cursor-pointer"
      >
        EthProof <span className="font-mono text-[10px] opacity-75">{ethproofsTotal}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'eipip', acd: 'all' })}
        data-active={value.group === 'eipip'}
        className="chip cursor-pointer"
      >
        EIPIP <span className="font-mono text-[10px] opacity-75">{eipipTotal}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange({ group: 'eipoh', acd: 'all' })}
        data-active={value.group === 'eipoh'}
        className="chip cursor-pointer"
      >
        EIP OH <span className="font-mono text-[10px] opacity-75">{eipohTotal}</span>
      </button>

      {value.group === 'acd' && (
        <select
          value={value.acd}
          onChange={(e) => onChange({ group: 'acd', acd: e.target.value })}
          className="h-[1.9rem] rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--ink)] outline-none hover:border-[var(--ink)] focus:border-[var(--ink)] cursor-pointer"
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
