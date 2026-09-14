'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Crosshair,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import type { MempoolMevStats, MevGranularity } from '@/server/orpc/procedures/mev';
import { CHART_AXIS, CHART_GRID, chartColor } from '@/lib/chart-colors';
import { AA_BRUSH, usdCompact } from '@/components/aa/chart-kit';
import { CopyAnchorButton } from '@/components/copy-anchor-button';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';

type Range = { months?: number; from?: string; to?: string };

const PRESETS: { key: string; label: string; months?: number; sinceDencun?: boolean }[] = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'Since Dencun', sinceDencun: true },
];

const DENCUN = '2024-03-13';

const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

const rangeKey = (r: Range) => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`;

/** Nice per-protocol display names for the DEX breakdown. */
const PROTO_LABEL: Record<string, string> = {
  uniswap_v2: 'Uniswap v2',
  uniswap_v3: 'Uniswap v3',
  uniswap_v4: 'Uniswap v4',
  sushiswap_v2: 'SushiSwap',
  pancakeswap_v2: 'PancakeSwap',
  curve: 'Curve',
  balancer: 'Balancer',
  dodo: 'DODO',
  other_v2: 'Other v2',
};
const protoLabel = (p: string) => PROTO_LABEL[p] ?? p.replace(/_/g, ' ');

export function MevAnalytics({ featured = false }: { featured?: boolean }) {
  const [preset, setPreset] = useState('6m');
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [mev, setMev] = useState<MempoolMevStats | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const range: Range = useMemo(() => {
    if (custom) return { from: custom.from, to: custom.to };
    const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[1];
    return p.sinceDencun ? { from: DENCUN } : { months: p.months };
  }, [preset, custom]);

  const dep = rangeKey(range);
  const loading = loadedKey !== dep;

  useEffect(() => {
    let cancelled = false;
    client.mev
      .getMempoolStats(range)
      .then((s) => {
        if (!cancelled) setMev(s?.available ? s : null);
      })
      .catch(() => {
        if (!cancelled) setMev(null);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(dep);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  const rangeLabel = useMemo(() => {
    if (custom) return `${custom.from} → ${custom.to}`;
    const p = PRESETS.find((x) => x.key === preset);
    return p?.sinceDencun ? 'since Dencun (Mar 2024)' : `last ${p?.label}`;
  }, [preset, custom]);

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Because today&apos;s mempool is unencrypted, searchers can inspect pending swaps and{' '}
        <strong className="text-foreground">sandwich</strong> victim trades (front-run + back-run).
        Lucid encrypts transactions until block execution to render sandwiching impossible. Figures
        below are a conservative on-chain floor across major DEXes, from Dencun onward.
      </p>

      {featured && (
        <TimeframeControl
          preset={preset}
          custom={custom}
          onPreset={(k) => {
            setCustom(null);
            setPreset(k);
          }}
          onCustom={setCustom}
          dataMin={mev?.dataMin || DENCUN}
          dataMax={mev?.dataMax || new Date().toISOString().slice(0, 10)}
        />
      )}

      {loading && !mev ? (
        <div className="py-10">
          <InlineBrandLoader size="sm" label="Loading mainnet MEV protection statistics..." />
        </div>
      ) : !mev ? (
        <p className="rounded-xl border border-border bg-muted/30 py-8 text-center text-xs text-muted-foreground">
          Live MEV statistics are temporarily unavailable.
        </p>
      ) : (
        <div className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
          {/* Range-scoped headline metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Crosshair} accent="text-rose-500" label="Sandwich Attacks" value={compactNum(mev.totalSandwiches)} sub={rangeLabel} />
            <Metric icon={Users} accent="text-orange-500" label="Unique Victims" value={compactNum(mev.uniqueVictims)} sub="swaps exploited" />
            <Metric icon={ShieldAlert} accent="text-amber-500" label="Extracted Value" value={usdCompact(mev.botProfitUsd)} sub="bot gross profit" />
            <Metric
              icon={TrendingUp}
              accent="text-violet-500"
              label="Blocks Sandwiched"
              value={mev.blocksSandwichedPct != null ? `${mev.blocksSandwichedPct}%` : '-'}
              sub="last 30 days"
            />
          </div>

          {featured
            ? mev.series.length > 1 && <MevCharts mev={mev} />
            : mev.series.length > 1 && (
                <Link
                  href="/lucid#lucid-mev"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> See the full MEV analytics on the Lucid hub
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
        </div>
      )}
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
                active ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground',
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
            custom ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground',
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
            className="rounded-md bg-violet-600 px-3 py-1 font-semibold text-white hover:bg-violet-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function MevCharts({ mev }: { mev: MempoolMevStats }) {
  const fmt = bucketFormatter(mev.granularity);
  const data = mev.series.map((w) => ({
    ...w,
    label: fmt(w.bucket),
    avgProfit: w.sandwiches > 0 ? Math.round(w.botProfitUsd / w.sandwiches) : 0,
  }));

  const protoData = mev.byProtocol.slice(0, 8).map((p) => ({ name: protoLabel(p.protocol), sandwiches: p.sandwiches }));
  const gLabel = mev.granularity === 'day' ? 'daily' : mev.granularity === 'week' ? 'weekly' : 'monthly';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          Mainnet MEV Extraction Analytics
        </h3>
        <span className="text-[11px] text-muted-foreground">{gLabel} · {data.length} buckets</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          id="lucid-sandwich-volume"
          title="Sandwich Attack Volume"
          unit="attacks"
          total={`${compactNum(mev.totalSandwiches)} total`}
          totalClass="text-foreground"
        >
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => compactNum(v)} />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [Number(v).toLocaleString(), 'Sandwich attacks']} />
            <Bar dataKey="sandwiches" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Brush dataKey="label" {...AA_BRUSH} tickFormatter={() => ''} />
          </BarChart>
        </ChartCard>

        <ChartCard
          id="lucid-bot-profit"
          title="Extracted Bot Gross Profit"
          unit="USD"
          total={`${usdCompact(mev.botProfitUsd)} total`}
          totalClass="text-emerald-500"
        >
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => usdCompact(v)} />
            <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [usdCompact(v), 'Bot profit (USD)']} />
            <Area type="monotone" dataKey="botProfitUsd" stroke="var(--chart-2)" strokeWidth={2} fill="url(#profitGrad)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Brush dataKey="label" {...AA_BRUSH} tickFormatter={() => ''} />
          </AreaChart>
        </ChartCard>

        <ChartCard
          id="lucid-victim-volume"
          title="Exploited Victim Trade Volume"
          unit="USD"
          total={`${usdCompact(mev.victimVolumeUsd)} total`}
          totalClass="text-amber-500"
        >
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="victimGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={52} tickFormatter={(v: number) => usdCompact(v)} />
            <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [usdCompact(v), 'Victim volume (USD)']} />
            <Area type="monotone" dataKey="victimUsd" stroke="var(--chart-4)" strokeWidth={2} fill="url(#victimGrad)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Brush dataKey="label" {...AA_BRUSH} tickFormatter={() => ''} />
          </AreaChart>
        </ChartCard>

        <ChartCard
          id="lucid-mev-bots"
          title="Active MEV Searcher Bots"
          unit="unique bots"
          total={`${compactNum(mev.uniqueBots)} unique`}
          totalClass="text-cyan-500"
        >
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={36} tickFormatter={(v: number) => String(v)} />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [Number(v).toLocaleString(), 'Active searcher bots']} />
            <Bar dataKey="activeBots" fill="var(--chart-5)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Brush dataKey="label" {...AA_BRUSH} tickFormatter={() => ''} />
          </BarChart>
        </ChartCard>

        <ChartCard
          id="lucid-avg-profit"
          title="Average Profit per Attack"
          unit="USD / attack"
          total={`${usdCompact(mev.totalSandwiches > 0 ? mev.botProfitUsd / mev.totalSandwiches : 0)} avg`}
          totalClass="text-violet-500"
        >
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => usdCompact(v)} />
            <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [usdCompact(v), 'Avg profit / attack']} />
            <Line type="monotone" dataKey="avgProfit" stroke="var(--chart-6)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Brush dataKey="label" {...AA_BRUSH} tickFormatter={() => ''} />
          </LineChart>
        </ChartCard>

        <ChartCard
          id="lucid-by-protocol"
          title="Sandwiches by DEX Protocol"
          unit="attacks · this range"
          total={`${protoData.length} venues`}
          totalClass="text-foreground"
        >
          <BarChart data={protoData} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={CHART_GRID} strokeDasharray="3 3" />
            <XAxis type="number" stroke={CHART_AXIS} tick={{ fontSize: 11 }} tickFormatter={(v: number) => compactNum(v)} />
            <YAxis type="category" dataKey="name" stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={90} />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} contentStyle={CHART_TOOLTIP} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number) => [Number(v).toLocaleString(), 'Sandwich attacks']} />
            <Bar dataKey="sandwiches" radius={[0, 3, 3, 0]} maxBarSize={20} isAnimationActive={false}>
              {protoData.map((_, i) => (
                <Cell key={i} fill={chartColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  id,
  title,
  unit,
  total,
  totalClass,
  children,
}: {
  id: string;
  title: string;
  unit: string;
  total: string;
  totalClass: string;
  children: React.ReactElement;
}) {
  return (
    <div id={id} className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground/70">{unit}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('font-mono text-xs font-bold', totalClass)}>{total}</span>
          <CopyAnchorButton anchor={id} />
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function bucketFormatter(g: MevGranularity): (day: string) => string {
  return (day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return day;
    const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
    if (g === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
}

function compactNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function Metric({
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
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <Icon className={cn('h-4 w-4', accent)} />
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
