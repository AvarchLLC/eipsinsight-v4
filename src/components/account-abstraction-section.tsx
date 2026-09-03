'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, Fingerprint, Wallet, TrendingUp, Info, CalendarRange } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { AaUsageStats, AaValueSeries } from '@/server/orpc/procedures/aa';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { ChartWatermark } from '@/components/chart-watermark';
import { cn } from '@/lib/utils';

const C7702 = 'var(--chart-1)'; // blue
const C4337 = 'var(--chart-4)'; // amber
const CACCT = 'var(--chart-2)'; // green — unique accounts

// Solid, high-contrast tooltip so it reads over the chart (was faint/transparent).
const TT_CONTENT = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--foreground)',
} as const;
const TT_ITEM = { color: 'var(--foreground)' } as const;
const TT_LABEL = { color: 'var(--foreground)', fontWeight: 600 } as const;
// ERC-4337 EntryPoint versions
const CEP06 = 'var(--chart-8)'; // slate (oldest)
const CEP07 = 'var(--chart-4)'; // amber
const CEP08 = 'var(--chart-6)'; // violet (newest)

type Granularity = 'day' | 'week' | 'month';

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}
function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}
function fmtBucket(b: string, g: Granularity): string {
  const d = new Date(`${b}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return b;
  return g === 'month'
    ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
const todayISO = () => new Date().toISOString().slice(0, 10);
function startOfWeekISO(): string {
  const d = new Date();
  const back = (d.getUTCDay() + 6) % 7; // Monday-based
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
function startOfMonthISO(offset = 0): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offset, 1);
  return d.toISOString().slice(0, 10);
}
function endOfMonthISO(offset = 0): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offset + 1, 0);
  return d.toISOString().slice(0, 10);
}

type Preset = 'week' | 'month' | 'lastmonth' | 'monthly' | 'custom';
const PRESETS: Array<{ id: Exclude<Preset, 'custom'>; label: string; granularity: Granularity; from?: string; to?: string }> = [
  { id: 'week', label: 'This week', granularity: 'day', from: startOfWeekISO(), to: todayISO() },
  { id: 'month', label: 'This month', granularity: 'day', from: startOfMonthISO(), to: todayISO() },
  { id: 'lastmonth', label: 'Last month', granularity: 'day', from: startOfMonthISO(-1), to: endOfMonthISO(-1) },
  { id: 'monthly', label: 'Monthly', granularity: 'month' },
];

export function AccountAbstractionSection() {
  const [stats, setStats] = useState<AaUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Timeline controls: monthly by default; presets for week/month/last-month,
  // plus a custom range with a day/week/month granularity toggle.
  const [preset, setPreset] = useState<Preset>('monthly');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id);
    setGranularity(p.granularity);
    setFrom(p.from ?? '');
    setTo(p.to ?? '');
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.aa
      .getUsageStats({ granularity, ...(from ? { from } : {}), ...(to ? { to } : {}) })
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [granularity, from, to]);

  const chartData = useMemo(
    () => (stats?.series ?? []).map((s) => ({ ...s, label: fmtBucket(s.bucket, stats?.granularity ?? 'month') })),
    [stats],
  );
  const rangeLabel = stats
    ? `${stats.granularity} · ${fmtDay(stats.from)} – ${fmtDay(stats.to)}`
    : '';

  const leader = useMemo(() => {
    if (!stats) return null;
    if (stats.total7702 === stats.total4337) return null;
    return stats.total7702 > stats.total4337 ? 'EIP-7702' : 'ERC-4337';
  }, [stats]);

  // Combined trend card: Volume (counts), Value (USD moved), Share (% of all txs
  // with a pie view of the whole-transaction distribution at the latest point).
  const [view, setView] = useState<'volume' | 'value' | 'share'>('volume');
  const [shareMode, setShareMode] = useState<'trend' | 'pie'>('trend');

  const [valueSeries, setValueSeries] = useState<AaValueSeries | null>(null);
  useEffect(() => {
    let cancelled = false;
    client.aa
      .getValueSeries({ granularity, ...(from ? { from } : {}), ...(to ? { to } : {}) })
      .then((v) => { if (!cancelled) setValueSeries(v); })
      .catch(() => { if (!cancelled) setValueSeries(null); });
    return () => { cancelled = true; };
  }, [granularity, from, to]);

  const valueData = useMemo(
    () => (valueSeries?.series ?? []).map((v) => ({ ...v, label: fmtBucket(v.bucket, valueSeries?.granularity ?? 'month') })),
    [valueSeries],
  );

  // Pie shows the AA split (7702 vs 4337) — legible. AA is ~1% of all txs, so a
  // whole-network pie would be a single grey slice; that share goes in the caption.
  const pieData = useMemo(() => {
    const last = stats?.series?.[stats.series.length - 1];
    if (!last) return [];
    return [
      { name: 'EIP-7702', value: last.aa7702, color: C7702 },
      { name: 'ERC-4337', value: last.aa4337, color: C4337 },
    ].filter((d) => d.value > 0);
  }, [stats]);
  const pieAaSharePct = useMemo(() => {
    const last = stats?.series?.[stats.series.length - 1];
    if (!last || last.share7702Pct <= 0) return null;
    const total = last.aa7702 / (last.share7702Pct / 100);
    return total > 0 ? Math.round(((last.aa7702 + last.aa4337) / total) * 1000) / 10 : null;
  }, [stats]);
  const pieBucketLabel = stats?.series?.length ? fmtBucket(stats.series[stats.series.length - 1].bucket, stats.granularity) : '';

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <Boxes className="h-5 w-5 text-primary" />
            Account Abstraction usage on mainnet
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            The two account-abstraction mechanisms live on Ethereum today, measured directly on-chain: EIP-7702 (Set EOA
            code, transaction type 4) and ERC-4337 (EntryPoint transactions). Counts come from mainnet transactions.
          </p>
        </div>
        {stats?.lastDay && (
          <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">
            through {stats.lastDay}
          </span>
        )}
      </div>

      {/* Timeline controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2.5 text-xs">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Timeline</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={cn('rounded-full border px-2.5 py-1', preset === p.id ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => { setPreset('custom'); if (!from) setFrom(startOfMonthISO()); if (!to) setTo(todayISO()); }}
          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1', preset === 'custom' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
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
        {rangeLabel && <span className="ml-auto text-[11px] text-muted-foreground">{rangeLabel}</span>}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card/60 py-16">
          <InlineBrandLoader size="md" label="Loading account-abstraction usage…" />
        </div>
      ) : !stats?.available ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          On-chain usage data is temporarily unavailable.
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Fingerprint className="h-4 w-4" />}
              accent={C7702}
              label="EIP-7702 transactions"
              value={fmtInt(stats.total7702)}
              sub={`since ${stats.since7702}`}
              leading={leader === 'EIP-7702'}
            />
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              accent={C4337}
              label="ERC-4337 EntryPoint txs"
              value={fmtInt(stats.total4337)}
              sub="v0.6 / v0.7 / v0.8"
              leading={leader === 'ERC-4337'}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              accent="var(--chart-2)"
              label="Most used since Pectra"
              value={leader ?? 'Tied'}
              sub={leader ? `${fmtInt(Math.abs(stats.total7702 - stats.total4337))} txs ahead` : ''}
            />
          </div>

          {/* Combined trend card: Volume vs Share (+ pie for distribution) */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
                <button onClick={() => setView('volume')} className={cn('rounded-md px-2.5 py-1 font-medium', view === 'volume' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Volume</button>
                <button onClick={() => setView('value')} className={cn('rounded-md px-2.5 py-1 font-medium', view === 'value' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Value</button>
                <button onClick={() => setView('share')} className={cn('rounded-md px-2.5 py-1 font-medium', view === 'share' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Tx share</button>
              </div>
              {view === 'volume' || view === 'value' ? (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: C7702 }} /> EIP-7702</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: C4337 }} /> ERC-4337</span>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5 text-[11px]">
                  <button onClick={() => setShareMode('trend')} className={cn('rounded-md px-2 py-0.5', shareMode === 'trend' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Trend</button>
                  <button onClick={() => setShareMode('pie')} className={cn('rounded-md px-2 py-0.5', shareMode === 'pie' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Distribution</button>
                </div>
              )}
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {view === 'volume'
                ? 'How many transactions each mechanism handled per period.'
                : view === 'value'
                  ? 'USD value moved inside AA transactions (stablecoins + WETH transfers). The outer tx value is ~0, so this measures the real economic flow.'
                  : shareMode === 'trend'
                    ? 'EIP-7702 as a percent of all mainnet transactions over time.'
                    : `EIP-7702 vs ERC-4337 split of account-abstraction transactions in ${pieBucketLabel}${pieAaSharePct != null ? ` — AA is ${pieAaSharePct}% of all mainnet transactions` : ''}.`}
            </p>
            <div className="relative h-[300px] w-full">
              <ChartWatermark position="center" />
              <ResponsiveContainer width="100%" height="100%">
                {view === 'volume' ? (
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g7702" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C7702} stopOpacity={0.35} /><stop offset="100%" stopColor={C7702} stopOpacity={0.02} /></linearGradient>
                      <linearGradient id="g4337" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C4337} stopOpacity={0.35} /><stop offset="100%" stopColor={C4337} stopOpacity={0.02} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={20} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number, name: string) => [fmtInt(v), name === 'aa7702' ? 'EIP-7702' : 'ERC-4337']} />
                    <Area type="monotone" dataKey="aa7702" stroke={C7702} strokeWidth={2} fill="url(#g7702)" />
                    <Area type="monotone" dataKey="aa4337" stroke={C4337} strokeWidth={2} fill="url(#g4337)" />
                  </AreaChart>
                ) : view === 'value' ? (
                  valueData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">USD value data is being computed. Check back shortly.</div>
                  ) : (
                  <AreaChart data={valueData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gv7702" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C7702} stopOpacity={0.35} /><stop offset="100%" stopColor={C7702} stopOpacity={0.02} /></linearGradient>
                      <linearGradient id="gv4337" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C4337} stopOpacity={0.35} /><stop offset="100%" stopColor={C4337} stopOpacity={0.02} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={20} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmtUsd(v)} />
                    <Tooltip contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number, name: string) => [fmtUsd(v), name === 'value7702Usd' ? 'EIP-7702 value' : 'ERC-4337 value']} />
                    <Area type="monotone" dataKey="value7702Usd" stackId="val" stroke={C7702} strokeWidth={2} fill="url(#gv7702)" />
                    <Area type="monotone" dataKey="value4337Usd" stackId="val" stroke={C4337} strokeWidth={2} fill="url(#gv4337)" />
                  </AreaChart>
                  )
                ) : shareMode === 'trend' ? (
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gShare" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C7702} stopOpacity={0.35} /><stop offset="100%" stopColor={C7702} stopOpacity={0.02} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={20} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={TT_CONTENT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v}%`, 'EIP-7702 share']} />
                    <Area type="monotone" dataKey="share7702Pct" stroke={C7702} strokeWidth={2} fill="url(#gShare)" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Tooltip contentStyle={TT_CONTENT} itemStyle={TT_ITEM} formatter={(v: number, n: string) => [fmtInt(v), n]} />
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} isAnimationActive={false}>
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unique 7702 accounts per week + EntryPoint version split, side by side */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Unique EIP-7702 accounts</h3>
              <p className="mb-2 text-[11px] text-muted-foreground">
                How many <span className="text-foreground">different wallets</span> used 7702 each week (adoption breadth). The
                trend above counts total transactions, so a few busy accounts can lift it; this counts distinct addresses.
              </p>
              <div className="relative h-[220px] w-full">
                <ChartWatermark position="center" />
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={24} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip
                      contentStyle={TT_CONTENT}
                      labelStyle={TT_LABEL}
                      itemStyle={TT_ITEM}
                      formatter={(v: number) => [fmtInt(v), 'unique accounts']}
                    />
                    <Bar dataKey="accounts7702" fill={CACCT} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">ERC-4337 EntryPoint versions</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: CEP06 }} /> v0.6</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: CEP07 }} /> v0.7</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: CEP08 }} /> v0.8</span>
                </div>
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                ERC-4337 ships as a smart-contract called the <span className="text-foreground">EntryPoint</span>, released in
                versions v0.6, v0.7 and v0.8. This shows how usage is moving to the newer releases (higher = more adopted).
              </p>
              <div className="relative h-[220px] w-full">
                <ChartWatermark position="center" />
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={24} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip
                      contentStyle={TT_CONTENT}
                      labelStyle={TT_LABEL}
                      itemStyle={TT_ITEM}
                      formatter={(v: number, name: string) => [fmtInt(v), name === 'ep06' ? 'v0.6' : name === 'ep07' ? 'v0.7' : 'v0.8']}
                    />
                    <Area type="monotone" dataKey="ep06" stackId="ep" stroke={CEP06} fill={CEP06} fillOpacity={0.5} />
                    <Area type="monotone" dataKey="ep07" stackId="ep" stroke={CEP07} fill={CEP07} fillOpacity={0.5} />
                    <Area type="monotone" dataKey="ep08" stackId="ep" stroke={CEP08} fill={CEP08} fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Methodology / caveats */}
          <div className="flex gap-2.5 rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>
              EIP-7702 is counted as transaction type 4; ERC-4337 as transactions sent to the canonical EntryPoint
              contracts (v0.6, v0.7, v0.8), which counts bundler transactions rather than individual UserOperations.
              USD value transacted is not shown yet: AA transactions move value in inner calls and UserOperations, not
              the top-level transaction value, so it needs trace-level data (planned). Source: {stats.source}.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({
  icon,
  accent,
  label,
  value,
  sub,
  leading,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  value: string;
  sub?: string;
  leading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}>
          {icon}
        </span>
        {leading && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
            leading
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}
