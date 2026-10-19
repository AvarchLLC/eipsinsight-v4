'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, Database, DollarSign, Fuel, Gauge, Layers, Radio, TrendingUp } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { BlobOverview, BlobGranularity } from '@/server/orpc/procedures/blob';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { usdCompact } from '@/components/aa/chart-kit';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';

type Range = { months?: number; from?: string; to?: string };

const DENCUN = '2024-03-13';

const PRESETS: { key: string; label: string; days?: number; months?: number; sinceDencun?: boolean }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', months: 1 },
  { key: '90d', label: '90D', months: 3 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'Since Dencun', sinceDencun: true },
];

// Network upgrades that reshaped the blob market.
const FORKS: { date: string; label: string }[] = [
  { date: '2024-03-13', label: 'Dencun' },
  { date: '2025-05-07', label: 'Pectra' },
  { date: '2025-12-03', label: 'Fusaka' },
];

const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

const rangeKey = (r: Range) => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

function bucketFormatter(g: BlobGranularity): (v: string) => string {
  return (v: string) => {
    const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return v;
    if (g === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
}

const compactNum = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
};

// Match a fork date to the nearest series bucket so ReferenceLines land on a tick.
function forkMarkers(series: BlobOverview['series'], from: string, to: string) {
  if (series.length === 0) return [];
  const buckets = series.map((s) => ({ raw: s.bucket, t: Date.parse(`${s.bucket.slice(0, 10)}T00:00:00Z`) }));
  return FORKS.filter((f) => f.date >= from && f.date <= to)
    .map((f) => {
      const ft = Date.parse(`${f.date}T00:00:00Z`);
      let best = buckets[0];
      for (const b of buckets) if (Math.abs(b.t - ft) < Math.abs(best.t - ft)) best = b;
      return { x: best.raw, label: f.label };
    });
}

const ROLLUP_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'];

export function BlobConsole() {
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [data, setData] = useState<BlobOverview | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const range: Range = useMemo(() => {
    if (custom) return { from: custom.from, to: custom.to };
    const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[1];
    if (p.sinceDencun) return { from: DENCUN };
    if (p.days) return { from: daysAgo(p.days) };
    return { months: p.months };
  }, [preset, custom]);

  const dep = rangeKey(range);
  useEffect(() => {
    let cancelled = false;
    client.blob
      .getOverview(range)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoadedKey(dep);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  const loading = !data || loadedKey !== dep;

  if (data && !data.available && !loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
        Live blob metrics are not available right now. The data source (BlobLens) may be unreachable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeframeControl
          preset={preset}
          custom={custom}
          onPreset={(k) => {
            setCustom(null);
            setPreset(k);
          }}
          onCustom={setCustom}
          dataMin={data?.dataMin || DENCUN}
          dataMax={data?.dataMax || new Date().toISOString().slice(0, 10)}
        />
        {data?.available && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Radio className="h-3 w-3 animate-pulse text-emerald-500" /> last 24h
            </span>
            <span>
              fee <span className="font-mono font-semibold text-foreground">{data.nowFeeGwei.toFixed(4)}</span> gwei
            </span>
            <span>
              <span className="font-mono font-semibold text-foreground">{data.nowBlobsPerBlock.toFixed(2)}</span> blobs/block
            </span>
            <span>
              <span className="font-mono font-semibold text-foreground">{data.nowUtilPct.toFixed(0)}%</span> util
            </span>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60">
          <InlineBrandLoader />
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric icon={Boxes} accent="text-blue-500" label="Total blobs" value={compactNum(data.totalBlobs)} />
            <Metric icon={Database} accent="text-violet-500" label="DA data" value={`${compactNum(data.totalDataGb)} GB`} />
            <Metric icon={DollarSign} accent="text-emerald-500" label="DA spend" value={usdCompact(data.totalDaSpendUsd)} />
            <Metric icon={Layers} accent="text-cyan-500" label="Avg blobs/block" value={data.avgBlobsPerBlock.toFixed(2)} />
            <Metric icon={Fuel} accent="text-amber-500" label="Avg blob fee" value={`${data.avgFeeGwei.toFixed(4)}`} sub="gwei" />
            <Metric icon={Gauge} accent="text-rose-500" label="Avg utilization" value={`${data.avgUtilPct.toFixed(0)}%`} />
          </div>

          {/* Time series */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Blob throughput" sub="blobs per bucket" icon={TrendingUp}>
              <TrendChart data={data} kind="volume" />
            </ChartCard>
            <ChartCard title="Blob base fee" sub="gwei, avg per bucket" icon={Fuel}>
              <TrendChart data={data} kind="fee" />
            </ChartCard>
            <ChartCard title="Blob utilization" sub="% of max blobs per block" icon={Gauge}>
              <TrendChart data={data} kind="util" />
            </ChartCard>
            <ChartCard title="Cost per blob" sub="USD, avg per bucket" icon={DollarSign}>
              <TrendChart data={data} kind="cost" />
            </ChartCard>
          </div>

          {/* Rollup breakdown */}
          <RollupBreakdown data={data} />

          <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Source: <span className="font-medium text-foreground">BlobLens</span> ClickHouse index, from the Dencun
            activation (EIP-4844, Mar 13 2024) to head. One blob carries 128&nbsp;KiB of data; DA spend prices the blob
            base fee by the daily ETH/USD rate. Rollup labels cover known batcher addresses; unlabeled batchers appear as
            &quot;Unknown&quot;. Fee &amp; cost figures exclude a corrupted source window (early 2026) where the recorded blob
            base fee is implausibly high; throughput and utilization use all blocks.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  accent,
  label,
  value,
  sub,
}: {
  icon: typeof Boxes;
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

function ChartCard({
  title,
  sub,
  icon: Icon,
  children,
}: {
  title: string;
  sub: string;
  icon: typeof Boxes;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

function TrendChart({ data, kind }: { data: BlobOverview; kind: 'volume' | 'fee' | 'util' | 'cost' }) {
  const fmt = bucketFormatter(data.granularity);
  const markers = forkMarkers(data.series, data.from, data.to);
  // Recharts reads reference elements from its *direct* children; a Fragment can
  // hide ReferenceLines from that scan, so pass a flat array instead.
  const common = [
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />,
    <XAxis
      key="x"
      dataKey="bucket"
      tickFormatter={fmt}
      tick={{ fill: CHART_AXIS, fontSize: 10 }}
      tickLine={false}
      axisLine={false}
      minTickGap={28}
    />,
    <Tooltip key="tip" contentStyle={CHART_TOOLTIP} labelFormatter={(v) => fmt(String(v))} />,
    ...markers.map((m) => (
      <ReferenceLine
        key={m.label}
        x={m.x}
        stroke="var(--muted-foreground)"
        strokeDasharray="3 3"
        strokeOpacity={0.6}
        label={{ value: m.label, position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 9 }}
      />
    )),
  ];

  if (kind === 'volume') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="blobVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => compactNum(Number(v))} />
          <Area type="monotone" dataKey="blobs" name="Blobs" stroke="#3b82f6" fill="url(#blobVol)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'fee') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => Number(v).toFixed(3)} />
          <Line type="monotone" dataKey="feeGwei" name="Base fee (gwei)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'util') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="blobUtil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={40} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Area type="monotone" dataKey="utilPct" name="Utilization %" stroke="#f43f5e" fill="url(#blobUtil)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        {common}
        <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
        <Line type="monotone" dataKey="costUsdPerBlob" name="Cost / blob (USD)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RollupBreakdown({ data }: { data: BlobOverview }) {
  const top = data.rollups.slice(0, 10);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Layers className="h-4 w-4 text-primary" /> DA share by rollup
          </h3>
          <span className="text-[11px] text-muted-foreground">% of blobs posted</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="rollup" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={88} />
              <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => [`${v}%`, 'share']} />
              <Bar dataKey="sharePct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {top.map((_, i) => (
                  <Cell key={i} fill={ROLLUP_COLORS[i % ROLLUP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Boxes className="h-4 w-4 text-primary" /> Rollup leaderboard
          </h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Rollup</th>
                <th className="px-3 py-2 text-right font-semibold">Blobs</th>
                <th className="px-3 py-2 text-right font-semibold">Data</th>
                <th className="px-4 py-2 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.rollups.map((r, i) => (
                <tr key={r.rollup} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ROLLUP_COLORS[i % ROLLUP_COLORS.length] }} />
                      <span className="font-medium text-foreground">{r.rollup}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{compactNum(r.blobs)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{compactNum(r.dataGb)} GB</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-foreground">{r.sharePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TimeframeControl({
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
