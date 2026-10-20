'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, Crosshair, Droplets, Layers } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { DexImpact } from '@/server/orpc/procedures/mev';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';

type Range = { months?: number; from?: string; to?: string };
const DENCUN = '2024-03-13';
const PRESETS: { key: string; label: string; months?: number; sinceDencun?: boolean }[] = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'Since Dencun', sinceDencun: true },
];
const rangeKey = (r: Range) => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`;

const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

// Well-known mainnet tokens, so pairs read as symbols instead of addresses.
const TOKEN_SYMBOLS: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x6982508145454ce325ddbe47a25d4ec3d2311933': 'PEPE',
};
const PROTO_LABEL: Record<string, string> = {
  uniswap_v2: 'Uniswap v2',
  uniswap_v3: 'Uniswap v3',
  uniswap_v4: 'Uniswap v4',
  sushiswap: 'SushiSwap',
  pancakeswap: 'PancakeSwap',
  curve: 'Curve',
  balancer: 'Balancer',
  dodo: 'DODO',
};
const PROTO_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#84cc16', '#3b82f6'];

const protoLabel = (p: string) => PROTO_LABEL[p] ?? p.replace(/_/g, ' ');
const tokenLabel = (a: string) => TOKEN_SYMBOLS[a?.toLowerCase()] ?? (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '?');
const addr = (a: string) => (a ? `${a.slice(0, 8)}…${a.slice(-4)}` : '—');
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`);

export function DexImpactView() {
  const [preset, setPreset] = useState('6m');
  const [data, setData] = useState<DexImpact | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const range: Range = useMemo(() => {
    const p = PRESETS.find((x) => x.key === preset) ?? PRESETS[1];
    return p.sinceDencun ? { from: DENCUN } : { months: p.months };
  }, [preset]);
  const dep = rangeKey(range);

  useEffect(() => {
    let cancelled = false;
    client.mev
      .getDexImpact(range)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedKey(dep);
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

  return (
    <div className="space-y-5">
      <section>
        <h2 className="dec-title text-lg font-bold tracking-tight text-foreground sm:text-xl">DEX Impact</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Who runs the sandwich bots and which pools they hit. This is the concrete MEV surface that{' '}
          <span className="font-medium text-foreground">Lucid (EIP-8184)</span> removes: by encrypting transactions
          until block execution, searchers can no longer read a pending swap to front-run it. Figures are a conservative
          on-chain floor across the major DEX families, from Dencun onward.
        </p>
      </section>

      {/* Timeframe */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timeframe</span>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                preset === p.key ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60">
          <InlineBrandLoader />
        </div>
      ) : !data.available ? (
        <div className="rounded-xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
          DEX impact data is not available right now.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Crosshair} accent="text-rose-500" label="Sandwich attacks" value={compact(data.totalSandwiches)} />
            <Kpi icon={Bot} accent="text-orange-500" label="Active bots" value={compact(data.uniqueBots)} />
            <Kpi icon={Layers} accent="text-violet-500" label="DEX protocols hit" value={`${data.protocols.length}`} />
            <Kpi icon={Droplets} accent="text-cyan-500" label="Pools attacked" value={compact(data.protocols.reduce((s, p) => s + p.pools, 0))} />
          </div>

          {/* Protocol breakdown */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
              <Layers className="h-4 w-4 text-primary" /> DEXes hit by sandwich bots
            </h3>
            <p className="mb-2 text-[11px] text-muted-foreground">Sandwich attacks detected per DEX protocol over the window.</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.protocols.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v))} />
                  <YAxis type="category" dataKey="protocol" tickFormatter={protoLabel} tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={92} />
                  <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={protoLabel} formatter={(v: number) => [compact(Number(v)), 'attacks']} />
                  <Bar dataKey="attacks" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {data.protocols.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PROTO_COLORS[i % PROTO_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bot leaderboard */}
            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              <div className="border-b border-border px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                  <Bot className="h-4 w-4 text-primary" /> Top sandwich bots
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Ranked by attacks; reach shown as pools and DEXes touched.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 text-left font-semibold">Bot</th>
                      <th className="px-3 py-2 text-right font-semibold">Attacks</th>
                      <th className="px-3 py-2 text-right font-semibold">Pools</th>
                      <th className="px-4 py-2 text-right font-semibold">DEXes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.bots.map((b) => (
                      <tr key={b.bot} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-2">
                          <a
                            href={`https://etherscan.io/address/${b.bot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {addr(b.bot)}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">{compact(b.attacks)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">{compact(b.pools)}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">{b.protocols}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top targeted pools */}
            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              <div className="border-b border-border px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                  <Droplets className="h-4 w-4 text-primary" /> Most-targeted pools
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Liquidity pools where the most sandwiches land.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 text-left font-semibold">Pool</th>
                      <th className="px-3 py-2 text-left font-semibold">Pair</th>
                      <th className="px-3 py-2 text-left font-semibold">DEX</th>
                      <th className="px-4 py-2 text-right font-semibold">Attacks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.pools.map((p) => (
                      <tr key={p.pool} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-2">
                          <a
                            href={`https://etherscan.io/address/${p.pool}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {addr(p.pool)}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">
                          {p.token0 || p.token1 ? `${tokenLabel(p.token0)} / ${tokenLabel(p.token1)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{protoLabel(p.protocol)}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-foreground">{compact(p.attacks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Source: <span className="font-medium text-foreground">BlobLens</span> sandwich index (from Dencun), across
            Uniswap v2/v3/v4, SushiSwap, Curve, DODO, Balancer and PancakeSwap — a conservative floor vs full-history
            sources. Every row here is order flow a searcher could read in the public mempool; an encrypted mempool
            removes the visibility these attacks depend on.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  accent,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', accent)} /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
    </div>
  );
}
