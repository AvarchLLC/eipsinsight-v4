'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, Fingerprint, Wallet, TrendingUp, Info } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { AaUsageStats } from '@/server/orpc/procedures/aa';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { cn } from '@/lib/utils';
import { InlineBrandLoader } from '@/components/inline-brand-loader';

const C7702 = 'var(--chart-1)'; // blue
const C4337 = 'var(--chart-4)'; // amber

/** The account-abstraction proposal family, with on-chain measurability noted. */
const AA_FAMILY: Array<{ id: string; href: string; name: string; status: string; live: boolean }> = [
  { id: 'EIP-7702', href: '/eip/7702', name: 'Set EOA account code', status: 'Live · Pectra', live: true },
  { id: 'ERC-4337', href: '/erc/4337', name: 'Account Abstraction (EntryPoint)', status: 'Live · off-protocol', live: true },
  { id: 'EIP-7701', href: '/eip/7701', name: 'Native Account Abstraction', status: 'Draft', live: false },
  { id: 'EIP-8141', href: '/eip/8141', name: 'Frames (native AA)', status: 'Proposed · Hegota', live: false },
  { id: 'EIP-8130', href: '/eip/8130', name: 'AA for L2s', status: 'Draft', live: false },
  { id: 'EIP-5792', href: '/eip/5792', name: 'Wallet Call API', status: 'Wallet RPC', live: false },
  { id: 'EIP-3074', href: '/eip/3074', name: 'AUTH / AUTHCALL', status: 'Superseded by 7702', live: false },
  { id: 'EIP-2938', href: '/eip/2938', name: 'Account Abstraction', status: 'Withdrawn', live: false },
];

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}
function fmtWeek(w: string): string {
  // w is yyyy-mm-dd (start of week)
  const d = new Date(`${w}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? w : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function AccountAbstractionSection() {
  const [stats, setStats] = useState<AaUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.aa
      .getUsageStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartData = useMemo(
    () => (stats?.weekly ?? []).map((w) => ({ ...w, label: fmtWeek(w.week) })),
    [stats],
  );

  const leader = useMemo(() => {
    if (!stats) return null;
    if (stats.total7702 === stats.total4337) return null;
    return stats.total7702 > stats.total4337 ? 'EIP-7702' : 'ERC-4337';
  }, [stats]);

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

          {/* Weekly trend: 7702 vs 4337 */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Weekly transactions · last 26 weeks</h3>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: C7702 }} /> EIP-7702</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: C4337 }} /> ERC-4337</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g7702" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C7702} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C7702} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="g4337" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C4337} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C4337} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={20} />
                  <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip
                    contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    formatter={(v: number, name: string) => [fmtInt(v), name === 'aa7702' ? 'EIP-7702' : 'ERC-4337']}
                  />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="aa7702" stroke={C7702} strokeWidth={2} fill="url(#g7702)" />
                  <Area type="monotone" dataKey="aa4337" stroke={C4337} strokeWidth={2} fill="url(#g4337)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AA proposal family */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">The account-abstraction proposal family</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AA_FAMILY.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className="group flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2 transition-colors hover:border-primary/40"
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', p.live ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                  <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary">{p.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{p.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{p.status}</span>
                </Link>
              ))}
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
