'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { BlobOverview, BlobGranularity } from '@/server/orpc/procedures/blob';

export type Range = { months?: number; from?: string; to?: string };

export const DENCUN = '2024-03-13';

export const PRESETS: { key: string; label: string; days?: number; months?: number; sinceDencun?: boolean }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', months: 1 },
  { key: '90d', label: '90D', months: 3 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'Since Dencun', sinceDencun: true },
];

export const FORKS: { date: string; label: string }[] = [
  { date: '2024-03-13', label: 'Dencun' },
  { date: '2025-05-07', label: 'Pectra' },
  { date: '2025-12-03', label: 'Fusaka' },
];

export const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

export const ROLLUP_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

export const rangeKey = (r: Range) => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`;

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export function presetToRange(preset: string, custom: { from: string; to: string } | null): Range {
  if (custom) return { from: custom.from, to: custom.to };
  const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[1];
  if (p.sinceDencun) return { from: DENCUN };
  if (p.days) return { from: daysAgo(p.days) };
  return { months: p.months };
}

export function bucketFormatter(g: BlobGranularity): (v: string) => string {
  return (v: string) => {
    const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return v;
    if (g === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
}

export const compactNum = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
};

/** Match fork dates to the nearest series bucket so ReferenceLines land on a tick. */
export function forkMarkers(series: BlobOverview['series'], from: string, to: string) {
  if (series.length === 0) return [];
  const buckets = series.map((s) => ({ raw: s.bucket, t: Date.parse(`${s.bucket.slice(0, 10)}T00:00:00Z`) }));
  return FORKS.filter((f) => f.date >= from && f.date <= to).map((f) => {
    const ft = Date.parse(`${f.date}T00:00:00Z`);
    let best = buckets[0];
    for (const b of buckets) if (Math.abs(b.t - ft) < Math.abs(best.t - ft)) best = b;
    return { x: best.raw, label: f.label };
  });
}

/* ───────────────────────────── L2 icon ───────────────────────────── */

const L2_ALIASES: Record<string, string> = {
  'op mainnet': 'op-mainnet',
  'arbitrum one': 'arbitrum',
  'x layer': 'xlayer',
  'world chain': 'world',
  'metal l2': 'metal',
  'zksync era': 'zksync-era',
  'polygon zkevm': 'polygonzkevm',
  'polygon pos': 'polygon-pos',
  'bnb smart chain': 'bsc',
};

export function l2IconSrc(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (!key || key === 'unknown') return null;
  const file = L2_ALIASES[key] ?? key.replace(/[^a-z0-9]+/g, '');
  return `/l2/icons/${file}.png`;
}

/** Rollup icon with a graceful colored-dot fallback when no logo exists. */
export function L2Icon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  const [failed, setFailed] = useState(false);
  const src = l2IconSrc(name);
  if (!src || failed) {
    return (
      <span
        className="inline-block shrink-0 rounded-full"
        style={{ width: size, height: size, background: color ?? 'var(--muted-foreground)' }}
        aria-hidden
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/* ───────────────────────────── shared UI ───────────────────────────── */

export function Metric({
  icon: Icon,
  accent,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', accent)} /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function ChartCard({
  title,
  sub,
  icon: Icon,
  children,
  info,
}: {
  title: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  info?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      {info && <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{info}</p>}
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

export function TimeframeControl({
  preset,
  custom,
  onPreset,
  onCustom,
  dataMin,
  dataMax,
}: {
  preset: string;
  custom: { from: string; to: string } | null;
  onPreset: (k: string) => void;
  onCustom: (c: { from: string; to: string }) => void;
  dataMin: string;
  dataMax: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(custom?.from ?? dataMin);
  const [to, setTo] = useState(custom?.to ?? dataMax);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timeframe</span>
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 text-xs">
        {PRESETS.map((p) => {
          const active = !custom && preset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onPreset(p.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'rounded-lg px-3 py-1.5 font-medium transition-colors',
            custom ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {custom ? `${custom.from} → ${custom.to}` : 'Custom…'}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 p-2 text-xs shadow-sm">
          <input
            type="date"
            value={from}
            min={dataMin}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={dataMax}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          />
          <button
            onClick={() => {
              if (from && to && from <= to) {
                onCustom({ from, to });
                setOpen(false);
              }
            }}
            className="rounded-md bg-primary px-3 py-1 font-semibold text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
