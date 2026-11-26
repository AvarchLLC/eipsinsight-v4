'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowRight, Download, ExternalLink, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { SectionHead } from '@/components/ledger/section-head';
import { LedgerBadge } from '@/components/ledger/badge';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { chartTooltip } from '@/lib/chart-theme';
import { client } from '@/lib/orpc';
import { toast } from 'sonner';
import type {
  AdoptionOverview,
  AdoptionLeaderboard,
  AdoptionRow,
  AddressLookup,
  UsdBreakdownResult,
  ValueMoved,
  Window,
} from '@/server/orpc/procedures/adoption';

const compact = (n: number): string => {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${n}`;
};
const fmt = (n: number) => n.toLocaleString();

const WINDOWS: { key: Window; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '365d', label: '1y' },
  { key: 'all', label: 'All' },
];

type SortKey = 'active' | 'contracts' | 'events' | 'growthPct';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'events', label: 'Events' },
  { key: 'growthPct', label: 'Growth' },
];

const CONF_HEX: Record<string, string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#64748b',
};

function TrendArrow({ pct }: { pct: number }) {
  const up = pct >= 5;
  const down = pct <= -5;
  const color = up ? '#10b981' : down ? '#ef4444' : 'var(--ink-faint)';
  const glyph = up ? '↑' : down ? '↓' : '→';
  return (
    <span className="font-mono text-xs font-semibold tabular-nums" style={{ color }}>
      {glyph} {pct > 0 ? '+' : ''}
      {pct}%
    </span>
  );
}

function SearchJump({ catalog }: { catalog: AdoptionOverview['catalog'] }) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return catalog
      .filter((c) => c.eip.toLowerCase().includes(t) || c.name.toLowerCase().includes(t) || c.id.includes(t))
      .slice(0, 6);
  }, [q, catalog]);

  return (
    <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Jump to standard — e.g. ERC-4626, 721..."
        className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)]"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--l-radius)] border border-[var(--ink)] bg-[var(--surface)] shadow-[var(--shadow-overlay)]">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/adoption/${m.id}`}
              className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5 text-xs last:border-0 hover:bg-[var(--surface-2)]"
            >
              <span className="font-medium text-[var(--ink)]">
                <span className="font-mono font-semibold text-[var(--brand-strong)]">{m.eip}</span>{' '}
                <span className="text-[var(--ink-muted)]">{m.name}</span>
              </span>
              {m.ranked ? (
                <ArrowRight className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
              ) : (
                <span className="font-mono text-[10px] uppercase text-[var(--ink-faint)]">soon</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const whenLabel = (s: string) => (s ? s.slice(0, 10) : '—');

function ContractLookup() {
  const [addr, setAddr] = useState('');
  const [res, setRes] = useState<AddressLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runAddress = (raw: string) => {
    const a = raw.trim();
    if (!ADDR_RE.test(a)) {
      setErr('Enter a valid 0x… address (42 characters).');
      setRes(null);
      return;
    }
    setErr(null);
    setLoading(true);
    client.adoption
      .contract({ address: a })
      .then((r) => setRes(r))
      .catch(() => setErr('Lookup failed. Try again.'))
      .finally(() => setLoading(false));
  };

  const run = () => runAddress(addr);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('address')?.trim() ?? '';
    if (ADDR_RE.test(q)) {
      setAddr(q);
      runAddress(q);
    }
  }, []);

  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Paste a contract address — 0x…"
          spellCheck={false}
          className="h-10 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)]"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="btn btn-primary h-10 shrink-0 px-5 text-xs font-semibold disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Detect Standards'}
        </button>
      </div>
      {err && <p className="mt-2 font-mono text-xs text-[#ef4444]">{err}</p>}

      {res && (
        <div className="mt-4 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2.5">
            <a
              href={`https://etherscan.io/address/${res.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--brand-strong)] hover:underline"
            >
              {short(res.address)}
              <ExternalLink className="h-3 w-3" />
            </a>
            {res.available && res.isContract && (
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                {res.matches.length} standard{res.matches.length === 1 ? '' : 's'} detected
                {res.otherSignatures > 0
                  ? ` · ${res.otherSignatures} other signature${res.otherSignatures === 1 ? '' : 's'}`
                  : ''}
              </span>
            )}
          </div>

          {!res.available ? (
            <p className="text-xs text-[var(--ink-muted)]">Live on-chain data is loading. Try again in a moment.</p>
          ) : !res.isContract ? (
            <p className="text-xs text-[var(--ink-muted)]">
              No on-chain event activity found for this address within coverage. It may be an EOA or inactive since Dencun.
            </p>
          ) : res.matches.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              This contract is active ({res.otherSignatures} other event signatures) but implements none of the tracked standards.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {res.matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/adoption/${m.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink)] hover:text-[var(--brand-strong)] hover:underline"
                    >
                      <span className="font-mono font-semibold">{m.eip}</span>
                      <span className="text-[var(--ink-muted)]">{m.name}</span>
                    </Link>
                    <div className="font-mono text-[11px] text-[var(--ink-faint)]">last active {whenLabel(m.lastActive)}</div>
                  </div>
                  <LedgerBadge token={m.confidence === 'high' ? 'final' : 'interface'} className="text-[10px]">
                    {m.confidence === 'high' ? 'Confirmed' : 'Detected'}
                  </LedgerBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdoptionChart({
  rows,
  sortKey,
  windowLabel,
}: {
  rows: (AdoptionRow & { isTxFeature?: boolean })[];
  sortKey: SortKey;
  windowLabel: string;
}) {
  const [logScale, setLogScale] = useState(false);

  const metricLabel =
    sortKey === 'contracts'
      ? 'Detected Contracts'
      : sortKey === 'events'
        ? `Events (${windowLabel})`
        : sortKey === 'growthPct'
          ? '3m Momentum (%)'
          : `Active Contracts (${windowLabel})`;

  const option = useMemo(() => {
    const ordered = [...rows].reverse();
    const values = ordered.map((r) => {
      const val = r[sortKey];
      return logScale && sortKey !== 'growthPct' ? Math.max(1, val) : val;
    });

    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          if (!p) return '';
          const raw = ordered.find((r) => r.eip === p.name)?.[sortKey] ?? p.value;
          return `${p.name}: <b>${sortKey === 'growthPct' ? `${raw > 0 ? '+' : ''}${raw}%` : fmt(raw)}</b>`;
        },
      }),
      grid: { top: 12, left: 78, right: 48, bottom: 20 },
      xAxis: {
        type: logScale && sortKey !== 'growthPct' ? 'log' : 'value',
        axisLabel: {
          color: 'var(--ink-faint)',
          fontSize: 10,
          formatter: (v: number) => (sortKey === 'growthPct' ? `${v}%` : compact(v)),
        },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: ordered.map((r) => r.eip),
        axisLabel: { color: 'var(--ink)', fontSize: 11, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: metricLabel,
          type: 'bar',
          data: ordered.map((r, idx) => ({
            value: values[idx],
            itemStyle: {
              color: r.isTxFeature
                ? '#6366f1'
                : sortKey === 'growthPct'
                  ? r.growthPct >= 0
                    ? '#10b981'
                    : '#ef4444'
                  : CONF_HEX[r.confidence] ?? '#10b981',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: 'var(--ink)',
            fontSize: 11,
            fontWeight: 600,
            formatter: (p: { dataIndex: number }) => {
              const r = ordered[p.dataIndex];
              if (!r) return '';
              const raw = r[sortKey];
              return sortKey === 'growthPct' ? `${raw > 0 ? '+' : ''}${raw}%` : compact(raw);
            },
          },
        },
      ],
    };
  }, [rows, sortKey, logScale, metricLabel]);

  return (
    <div className="flex flex-col justify-between rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div>
            <p className="eyebrow">VISUAL DISTRIBUTION</p>
            <h3 className="t-h3">{metricLabel}</h3>
          </div>
          {sortKey !== 'growthPct' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-active={!logScale}
                onClick={() => setLogScale(false)}
                className="chip"
              >
                Linear
              </button>
              <button
                type="button"
                data-active={logScale}
                onClick={() => setLogScale(true)}
                className="chip"
              >
                Log
              </button>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No on-chain ranking rows available yet.
          </div>
        ) : (
          <div className="relative w-full" style={{ height: Math.max(280, rows.length * 36) }}>
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} notMerge />
            <ChartWatermark />
          </div>
        )}
      </div>
      <ChartFooter />
    </div>
  );
}

function UsdBreakdownChart({
  data,
  loading,
  windowLabel,
}: {
  data: UsdBreakdownResult | null;
  loading: boolean;
  windowLabel: string;
}) {
  const rows = data?.rows ?? [];
  const top = rows.slice(0, 12);
  const option = useMemo(() => {
    const rev = [...top].reverse();
    return {
      grid: { left: 96, right: 24, top: 16, bottom: 28 },
      tooltip: {
        ...chartTooltip({ trigger: 'axis' }),
        axisPointer: { type: 'shadow' },
        formatter: (params: { dataIndex: number }[]) => {
          const r = rev[params[0]?.dataIndex ?? 0];
          if (!r) return '';
          return `<b>${r.symbol}</b> (Tier ${r.tier})<br/>Volume: $${compact(r.usd)}<br/>Transfers: ${fmt(r.transfers)}`;
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#71717a',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          formatter: (v: number) => `$${compact(v)}`,
        },
        splitLine: { lineStyle: { color: 'rgba(128,128,128,0.12)' } },
      },
      yAxis: {
        type: 'category',
        data: rev.map((r) => r.symbol),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'var(--ink)', fontSize: 11, fontFamily: 'var(--font-mono)' },
      },
      series: [
        {
          type: 'bar',
          data: rev.map((r) => ({
            value: r.usd,
            itemStyle: {
              color: r.tier === 1 ? '#10b981' : '#0ea5e9',
              borderRadius: [0, 3, 3, 0],
            },
          })),
          barMaxWidth: 18,
        },
      ],
    };
  }, [top]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--ink-faint)]">
        Computing USD token breakdown…
      </div>
    );
  }

  if (!data?.available || rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--ink-faint)]">
        No priced ERC-20 transfer volume available for this window.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">Top Priced ERC-20 Tokens by USD Volume ({windowLabel})</p>
          <p className="font-mono text-xs font-semibold text-[var(--ink)]">Total: ${compact(data.totalUsd)}</p>
        </div>
        <div className="relative h-72 w-full">
          <ChartWatermark />
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
        </div>
        <ChartFooter />
      </div>

      <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[500px] text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="w-10 px-4 py-3 text-left eyebrow">#</th>
              <th className="px-4 py-3 text-left eyebrow">Token</th>
              <th className="px-4 py-3 text-left eyebrow">Pricing Tier</th>
              <th className="px-4 py-3 text-right eyebrow">USD Value Moved</th>
              <th className="px-4 py-3 text-right eyebrow">Transfers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r, i) => (
              <tr key={r.address} className="transition-colors hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">{i + 1}</td>
                <td className="px-4 py-3">
                  <a
                    href={`https://etherscan.io/token/${r.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                  >
                    {r.symbol}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-4 py-3">
                  <LedgerBadge token={r.tier === 1 ? 'final' : 'interface'} className="text-[10px]">
                    {r.tier === 1 ? 'Tier 1 Anchor' : 'Tier 2 DEX'}
                  </LedgerBadge>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                  ${compact(r.usd)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                  {compact(r.transfers)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdoptionDashboard({
  overview,
  initialLeaderboard,
}: {
  overview: AdoptionOverview;
  initialLeaderboard: AdoptionLeaderboard;
}) {
  const [window, setWindow] = useState<Window>(initialLeaderboard.window);
  const [lb, setLb] = useState<AdoptionLeaderboard>(initialLeaderboard);
  const [valueMoved, setValueMoved] = useState<ValueMoved | null>(null);
  const [loading, setLoading] = useState(false);

  const cache = useMemo(() => {
    const m = new Map<Window, AdoptionLeaderboard>();
    if (initialLeaderboard.available) m.set(initialLeaderboard.window, initialLeaderboard);
    return m;
  }, [initialLeaderboard]);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(window);
    if (cached) {
      setLb(cached);
      return;
    }
    setLoading(true);
    client.adoption
      .leaderboard({ window })
      .then((res) => {
        if (cancelled) return;
        if (res.available) cache.set(window, res);
        setLb(res);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [window, cache]);

  const [totals, setTotals] = useState<{ total: number; active: number; available: boolean }>(
    overview.available
      ? { total: overview.totalImplementations, active: overview.activeContracts30d, available: true }
      : { total: 0, active: 0, available: false },
  );
  useEffect(() => {
    if (totals.available) return;
    let cancelled = false;
    client.adoption.leaderboard({ window: '30d' }).then((res) => {
      if (cancelled || !res.available) return;
      setTotals({
        total: res.rows.reduce((s, r) => s + r.contracts, 0),
        active: res.rows.reduce((s, r) => s + r.active, 0),
        available: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [totals.available]);

  useEffect(() => {
    let cancelled = false;
    client.adoption
      .valueMoved({ window })
      .then((res) => {
        if (!cancelled) setValueMoved(res);
      })
      .catch(() => {
        if (!cancelled) setValueMoved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const [sort, setSort] = useState<SortKey>('active');
  const [view, setView] = useState<'implementations' | 'usd'>('implementations');
  const [usdData, setUsdData] = useState<UsdBreakdownResult | null>(null);
  const [usdLoading, setUsdLoading] = useState(false);

  useEffect(() => {
    if (view !== 'usd') return;
    let cancelled = false;
    setUsdLoading(true);
    client.adoption
      .usdBreakdown({ window })
      .then((res) => {
        if (!cancelled) setUsdData(res);
      })
      .catch(() => {
        if (!cancelled) setUsdData(null);
      })
      .finally(() => {
        if (!cancelled) setUsdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, window]);
  const rows = useMemo(() => [...lb.rows].sort((a, b) => b[sort] - a[sort]), [lb.rows, sort]);
  // Chart also includes transaction features (e.g. EIP-7702) so the graph shows
  // the full adoption landscape, not just contract standards. Mapped to the
  // active metric (accounts) and flagged so the bar can be coloured distinctly.
  const chartRows = useMemo<(AdoptionRow & { isTxFeature?: boolean })[]>(() => {
    const tx: (AdoptionRow & { isTxFeature?: boolean })[] = lb.txFeatures.map((f) => ({
      id: f.id, eip: f.eip, name: f.name, category: 'Accounts' as AdoptionRow['category'], blurb: f.blurb,
      specUrl: f.specUrl, confidence: 'high', evidence: '', contracts: f.accounts, active: f.accounts,
      events: f.txs, growthPct: 0, isTxFeature: true,
    }));
    return [...lb.rows, ...tx].sort((a, b) => b[sort] - a[sort]);
  }, [lb.rows, lb.txFeatures, sort]);
  const liveOk = totals.available || lb.available;
  const deferred = overview.catalog.filter((c) => !c.ranked);

  const exportLeaderboardCSV = () => {
    if (!rows.length) return toast.error('No rows to export');
    const headers = ['Rank', 'Standard', 'Name', 'Confidence', 'Contracts (All-time)', `Active (${window})`, `Events (${window})`, '3m Trend (%)'];
    const csvRows = rows.map((r, i) => [
      String(i + 1),
      r.eip,
      r.name,
      r.confidence,
      String(r.contracts),
      String(r.active),
      String(r.events),
      String(r.growthPct),
    ]);
    const csv = [
      headers.join(','),
      ...csvRows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `standards-adoption-${window}.csv`;
    a.click();
    toast.success('Exported adoption leaderboard CSV');
  };

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)] pb-16">
      <PageHead
        eyebrow="ON-CHAIN EVIDENCE"
        title="Ethereum Standards Adoption"
        lead={
          <>
            Which <span className="accent">EIPs and ERCs</span> are implemented and actively used on-chain, measured from archive event evidence.
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[var(--ink-muted)]">
          <span>{overview.coverage.network}</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>Since Dencun ({overview.coverage.fromDate})</span>
          <span className="text-[var(--border-strong)]">·</span>
          <span>
            <strong className="text-[var(--ink)]">{overview.standardsRanked}</strong> ranked / {overview.standardsTracked} tracked
          </span>
        </div>
      </PageHead>

      <div className="wrap space-y-12 py-8">
        {!liveOk && (
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--ink-muted)]">
            Live on-chain index is warming up. The tracked-standards catalog and lookup remain active.
          </div>
        )}

        {/* Ruled KPI Strip */}
        <div className="grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <p className="eyebrow">Standards Ranked</p>
            <p className="t-figure mt-2 text-2xl sm:text-3xl">{overview.standardsRanked}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Measured on-chain</p>
          </div>
          <div className="px-5 py-4">
            <p className="eyebrow">Detected Contracts</p>
            <p className="t-figure mt-2 text-2xl sm:text-3xl">{totals.available ? compact(totals.total) : '—'}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Distinct implementations</p>
          </div>
          <div className="px-5 py-4">
            <p className="eyebrow">Active Contracts (30d)</p>
            <p className="t-figure mt-2 text-2xl sm:text-3xl">{totals.available ? compact(totals.active) : '—'}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Emitted events recently</p>
          </div>
          <div className="px-5 py-4">
            <p className="eyebrow">ERC-20 Value Moved ({window})</p>
            <p className="t-figure mt-2 text-2xl sm:text-3xl">
              {valueMoved?.available ? `$${compact(valueMoved.usd)}` : '—'}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {valueMoved?.available
                ? `${valueMoved.tokens} priced tokens · Tier ${valueMoved.tier ?? 1}`
                : 'Computing USD floor…'}
            </p>
          </div>
        </div>

        {/* 01 — On-Chain Leaderboard & Distribution */}
        <section className="space-y-5">
          <SectionHead
            index="01"
            eyebrow="ON-CHAIN LEADERBOARD"
            title="Top Standards by Usage"
            action={
              <button
                type="button"
                onClick={exportLeaderboardCSV}
                title="Export adoption leaderboard CSV"
                aria-label="Export adoption leaderboard CSV"
                className="btn btn-primary h-8 w-8 shrink-0 p-0"
              >
                <Download className="h-4 w-4" />
              </button>
            }
          />

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
            <SearchJump catalog={overview.catalog} />

            <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1">Window:</span>
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  data-active={window === w.key}
                  onClick={() => setWindow(w.key)}
                  className="chip font-mono"
                >
                  {w.label}
                </button>
              ))}
            </div>

            <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="eyebrow mr-1">View:</span>
              <button
                type="button"
                data-active={view === 'implementations'}
                onClick={() => setView('implementations')}
                className="chip"
              >
                Implementations
              </button>
              <button
                type="button"
                data-active={view === 'usd'}
                onClick={() => setView('usd')}
                className="chip"
              >
                USD Value
              </button>
            </div>

            {view === 'implementations' && (
              <>
                <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="eyebrow mr-1">Sort:</span>
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      data-active={sort === s.key}
                      onClick={() => setSort(s.key)}
                      className="chip"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(loading || usdLoading) && <span className="ml-auto font-mono text-[11px] text-[var(--ink-faint)]">updating…</span>}
          </div>

          {view === 'usd' ? (
            <UsdBreakdownChart
              data={usdData}
              loading={usdLoading}
              windowLabel={WINDOWS.find((w) => w.key === window)?.label ?? window}
            />
          ) : (
            <div className="space-y-6">
            <div>
              <AdoptionChart
                rows={chartRows}
                sortKey={sort}
                windowLabel={WINDOWS.find((w) => w.key === window)?.label ?? window}
              />
              {lb.txFeatures.length > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  <span style={{ color: '#6366f1' }}>■</span> transaction features (e.g. EIP-7702) shown by accounts, not contracts
                </p>
              )}
            </div>

            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full min-w-[500px] text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="w-10 px-4 py-3 text-left eyebrow">#</th>
                    <th className="px-4 py-3 text-left eyebrow">Standard</th>
                    <th className="px-4 py-3 text-right eyebrow">Contracts</th>
                    <th className="px-4 py-3 text-right eyebrow">Active</th>
                    <th className="px-4 py-3 text-right eyebrow">Events</th>
                    <th className="px-4 py-3 text-right eyebrow">3m Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r, i) => (
                    <tr key={r.id} className="transition-colors hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">#{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/adoption/${r.id}`}
                          className="inline-flex items-center gap-1.5 font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                        >
                          {r.eip}
                          <ArrowRight className="h-3 w-3 opacity-60" />
                        </Link>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-muted)]">{r.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                        {compact(r.contracts)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                        {compact(r.active)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                        {compact(r.events)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <TrendArrow pct={r.growthPct} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-[var(--ink-muted)]">
                        No ranked standards available for this window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {lb.txFeatures.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="eyebrow">Transaction Features (Ranked by Accounts · {window})</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lb.txFeatures.map((f) => (
                  <Link
                    key={f.id}
                    href={`/adoption/${f.id}`}
                    className="tile flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <LedgerBadge token="core" className="text-[10px]">{f.eip}</LedgerBadge>
                        <span className="font-medium text-xs text-[var(--ink)]">{f.name}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-[var(--ink-muted)]">{f.blurb}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="t-figure text-xl">{compact(f.accounts)}</div>
                      <div className="eyebrow mt-0.5">accounts</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 02 — Explore by Contract */}
        <section id="lookup" className="space-y-4 scroll-mt-24">
          <SectionHead
            index="02"
            eyebrow="REVERSE LOOKUP"
            title="Inspect Any Contract Address"
            description="Paste an Ethereum address to detect implemented standards from on-chain event signatures."
          />
          <ContractLookup />
        </section>

        {/* 03 — Tracked Catalog */}
        {deferred.length > 0 && (
          <section className="space-y-4">
            <SectionHead
              index="03"
              eyebrow="COMING NEXT"
              title="Tracked Standards Catalog"
              description="Standards indexed in our pipeline and queued for live archive ranking."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deferred.map((c) => (
                <a
                  key={c.id}
                  href={c.specUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tile flex flex-col justify-between p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--brand-strong)]">{c.eip}</span>
                      <LedgerBadge token="draft" className="text-[9px]">
                        {c.deferredReason ?? 'Queued'}
                      </LedgerBadge>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[var(--ink)]">{c.name}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">{c.blurb}</p>
                    <p className="mt-2 font-mono text-[10px] text-[var(--ink-faint)]">{c.evidence}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-[var(--ink-faint)]">
                    <span>Specification</span>
                    <ArrowRight className="tile-arrow h-3 w-3" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 04 — Methodology & FAQ */}
        <section className="space-y-4">
          <SectionHead
            index="04"
            eyebrow="METHODOLOGY & FAQ"
            title="Why This Page"
            description="Measuring which Ethereum standards achieve real on-chain adoption beyond specification status."
            action={
              <Link
                href="/about"
                className="btn h-8 px-3 text-xs font-medium"
              >
                Methodology &amp; Docs
              </Link>
            }
          />
          <div className="divide-y divide-[var(--border)] rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
            <details className="group p-4" open>
              <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--ink)]">
                Why measure on-chain standards adoption?
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Proposal status alone does not show whether a standard is actually used in production. Tracking
                implementing contracts, active callers, transaction-type adoption, and USD volume connects Ethereum
                governance directly to measurable mainnet usage.
              </p>
            </details>
            <details className="group p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--ink)]">
                How are standards detected on-chain?
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Contract standards are matched by canonical event signatures (`Transfer`, `ApprovalForAll`,
                `Deposit`, `UserOperationEvent`, `AccountCreated`) or calldata selectors (`permit()` for ERC-2612).
                Protocol features like EIP-7702 are measured by transaction type (`tx_type = 4`) rather than contract
                deployments.
              </p>
            </details>
            <details className="group p-4">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--ink)]">
                How is ERC-20 USD value moved calculated?
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Tier 1 anchors major USD stablecoins and ETH-pegged tokens (`USDC`, `USDT`, `DAI`, `WETH`, `stETH`,
                etc.). Tier 2 derives median USD-per-raw-unit prices from Uniswap V2 and V3 swap pools for the top
                500 active ERC-20 tokens.
              </p>
            </details>
          </div>
        </section>

        <p className="border-t border-[var(--border)] pt-4 font-mono text-[11px] text-[var(--ink-faint)]">
          {overview.coverage.network} · since Dencun ({overview.coverage.fromDate}) · updated{' '}
          {new Date(lb.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
