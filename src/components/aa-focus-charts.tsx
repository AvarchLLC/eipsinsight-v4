'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { client } from '@/lib/orpc';
import { ChartWatermark } from '@/components/chart-watermark';
import type { AaUsageStats, AaValueSeries } from '@/server/orpc/procedures/aa';

const C7702 = 'var(--chart-1)'; // blue
const C4337 = 'var(--chart-4)'; // amber
const CACCT = 'var(--chart-2)'; // green
const CVALUE = 'var(--chart-5)'; // value / usd

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

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}
function fmtCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(n);
}
function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}
function fmtMonth(b: string): string {
  const d = new Date(`${b}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? b
    : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

function ChartCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mb-2 text-[12px] leading-relaxed text-muted-foreground">{desc}</p>
      <div className="relative h-[240px] w-full">
        <ChartWatermark position="center" />
        {children}
      </div>
    </div>
  );
}

/**
 * Focused usage charts for the EIP-7702 sub-tab.
 * `mode="7702"` → live 7702 usage (transactions, accounts, value moved).
 * `mode="demand"` → combined AA demand (7702 + 4337), used on proposal pages
 * for not-yet-live native AA (EIP-8141) to show the market it would serve.
 */
export function AaFocusCharts({ mode = '7702' }: { mode?: '7702' | 'demand' }) {
  const [stats, setStats] = useState<AaUsageStats | null>(null);
  const [value, setValue] = useState<AaValueSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.aa.getUsageStats({ granularity: 'month' }).catch(() => null),
      mode === '7702'
        ? client.aa.getValueSeries({ granularity: 'month' }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([s, v]) => {
        if (cancelled) return;
        setStats(s);
        setValue(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const txSeries = useMemo(
    () =>
      (stats?.series ?? []).map((s) => ({
        label: fmtMonth(s.bucket),
        aa7702: s.aa7702,
        aa4337: s.aa4337,
        combined: s.aa7702 + s.aa4337,
        accounts7702: s.accounts7702,
        share7702Pct: s.share7702Pct,
      })),
    [stats],
  );

  const valSeries = useMemo(
    () =>
      (value?.series ?? []).map((v) => ({
        label: fmtMonth(v.bucket),
        value7702Usd: v.value7702Usd,
      })),
    [value],
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Loading on-chain charts…
      </div>
    );
  }

  if (!stats?.available || txSeries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-[12px] leading-relaxed text-muted-foreground">
        On-chain usage data is temporarily unavailable. Full adoption charts are on the{' '}
        <a href="/aa" className="text-primary hover:underline">
          Dashboard
        </a>{' '}
        tab.
      </div>
    );
  }

  if (mode === 'demand') {
    // Not-live proposal: show the AA demand (7702 + 4337) native AA would serve.
    const latest = txSeries[txSeries.length - 1];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="AA transactions / mo (latest)" value={fmtInt(latest?.combined ?? 0)} />
          <Stat label="EIP-7702 (type 4)" value={fmtInt(latest?.aa7702 ?? 0)} accent={C7702} />
          <Stat label="ERC-4337 (EntryPoint)" value={fmtInt(latest?.aa4337 ?? 0)} accent={C4337} />
        </div>
        <ChartCard
          title="Account-abstraction demand today"
          desc="Combined EIP-7702 + ERC-4337 transactions per month — the existing AA activity that native, in-protocol AA (EIP-8141) is designed to serve. Not EIP-8141's own usage; it is not live yet."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={txSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C7702} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={C7702} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={44} />
              <Tooltip
                contentStyle={TT_CONTENT}
                labelStyle={TT_LABEL}
                itemStyle={TT_ITEM}
                formatter={(v: number) => [fmtInt(v), 'AA transactions']}
              />
              <Area
                type="monotone"
                dataKey="combined"
                stroke={C7702}
                strokeWidth={2}
                fill="url(#gDemand)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // mode === '7702'
  const total7702 = stats.total7702;
  const latest = txSeries[txSeries.length - 1];
  const hasValue = valSeries.some((v) => v.value7702Usd > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total 7702 transactions" value={fmtInt(total7702)} accent={C7702} />
        <Stat label="Latest month" value={fmtInt(latest?.aa7702 ?? 0)} />
        <Stat label="Unique accounts (latest mo)" value={fmtInt(latest?.accounts7702 ?? 0)} accent={CACCT} />
        <Stat label="Share of all txs (latest)" value={`${latest?.share7702Pct ?? 0}%`} />
      </div>

      <ChartCard
        title="EIP-7702 transactions per month"
        desc="Type-4 (Set EOA code) transactions on mainnet each month since the Pectra upgrade."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={txSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="g7702tx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C7702} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C7702} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={44} />
            <Tooltip
              contentStyle={TT_CONTENT}
              labelStyle={TT_LABEL}
              itemStyle={TT_ITEM}
              formatter={(v: number) => [fmtInt(v), 'EIP-7702 txs']}
            />
            <Area type="monotone" dataKey="aa7702" stroke={C7702} strokeWidth={2} fill="url(#g7702tx)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Unique EIP-7702 accounts per month"
        desc="Distinct wallets (from_address) that sent at least one 7702 transaction that month — a breadth-of-adoption signal, not raw volume."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={txSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="g7702acct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CACCT} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CACCT} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmtCompact} width={44} />
            <Tooltip
              contentStyle={TT_CONTENT}
              labelStyle={TT_LABEL}
              itemStyle={TT_ITEM}
              formatter={(v: number) => [fmtInt(v), 'Unique accounts']}
            />
            <Area type="monotone" dataKey="accounts7702" stroke={CACCT} strokeWidth={2} fill="url(#g7702acct)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {hasValue && (
        <ChartCard
          title="Value moved via EIP-7702 per month"
          desc="USD value of token transfers (USDC, USDT, DAI, WETH) that occurred inside 7702 transactions each month. Measures economic throughput, not just transaction count."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={valSeries} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="g7702val" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CVALUE} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CVALUE} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmtUsd} width={52} />
              <Tooltip
                contentStyle={TT_CONTENT}
                labelStyle={TT_LABEL}
                itemStyle={TT_ITEM}
                formatter={(v: number) => [fmtUsd(v), 'Value moved']}
              />
              <Area type="monotone" dataKey="value7702Usd" stroke={CVALUE} strokeWidth={2} fill="url(#g7702val)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
