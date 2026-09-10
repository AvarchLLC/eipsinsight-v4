'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NetRange } from '@/components/aa/chart-kit';

export type Granularity = 'day' | 'week' | 'month';

type TimeframeValue = {
  /** For the monthly rollup (ecosystem) charts. */
  range: NetRange;
  /** For the usage / race section (day|week|month capable). */
  from?: string;
  to?: string;
  granularity: Granularity;
};

const Ctx = createContext<TimeframeValue | null>(null);

/** Read the shared page-level timeframe. */
export function useAaTimeframe(): TimeframeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAaTimeframe must be used within <AaTimeframeProvider>');
  return v;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
// First day of the month that is (months-1) before the current month.
const startISO = (months: number) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - (months - 1));
  return d.toISOString().slice(0, 10);
};
// Months since Dencun (2024-03), so the preset always reaches the earliest data.
const monthsSinceDencun = () => {
  const n = new Date();
  return (n.getUTCFullYear() - 2024) * 12 + (n.getUTCMonth() + 1 - 3) + 1;
};

type PresetId = '6m' | '1y' | '2y' | 'dencun' | 'custom';
const PRESETS: { id: Exclude<PresetId, 'custom'>; label: string; months: number }[] = [
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: '2y', label: '2Y', months: 24 },
  { id: 'dencun', label: 'Since Dencun', months: monthsSinceDencun() },
];

/**
 * One page-level timeframe for the whole /aa dashboard: presets or a custom date
 * range with day/week/month granularity, shared by both the usage section and the
 * ecosystem charts so there is a single control instead of one per section.
 */
export function AaTimeframeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<PresetId>('2y');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const value = useMemo<TimeframeValue>(() => {
    if (preset === 'custom' && from && to) {
      return { range: { from, to }, from, to, granularity };
    }
    const months = PRESETS.find((p) => p.id === preset)?.months ?? 24;
    // Presets keep both sections on the same window, monthly.
    return { range: { months }, from: startISO(months), to: todayISO(), granularity: 'month' };
  }, [preset, from, to, granularity]);

  return (
    <Ctx.Provider value={value}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2.5 text-xs">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Timeframe</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 font-medium transition-colors',
              preset === p.id ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => {
            setPreset('custom');
            if (!from) setFrom(startISO(24));
            if (!to) setTo(todayISO());
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors',
            preset === 'custom' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarRange className="h-3.5 w-3.5" /> Custom
        </button>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <input type="date" value={from} max={to || todayISO()} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground" />
            <span className="text-muted-foreground">to</span>
            <input type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-border bg-muted/40 px-2 text-foreground" />
            <div className="ml-1 inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5">
              {(['day', 'week', 'month'] as Granularity[]).map((g) => (
                <button key={g} onClick={() => setGranularity(g)} className={cn('rounded px-2 py-0.5 capitalize', granularity === g ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">Applies to every chart on this page</span>
      </div>

      {children}
    </Ctx.Provider>
  );
}
