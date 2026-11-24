'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ArrowRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { client } from '@/lib/orpc';
import type { AdoptionOverview, AdoptionLeaderboard, AdoptionRow, Window } from '@/server/orpc/procedures/adoption';

const MONO = 'var(--font-mono, ui-monospace, monospace)';

const compact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${n}`;
};
const fmt = (n: number) => n.toLocaleString();

const WINDOWS: { key: Window; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

const CONF_COLOR: Record<string, string> = {
  high: 'var(--brand)',
  medium: 'var(--c-review)',
  low: 'var(--ink-faint)',
};

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="mono text-sm font-semibold text-[var(--brand-strong)]">{n}</span>
        <h2 className="text-[1.9rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)] sm:text-[2.3rem]">{title}</h2>
      </div>
    </div>
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
    <div className="relative max-w-[32rem]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a standard — e.g. ERC-4626, vault, 721"
        className="w-full rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand)]"
      />
      {matches.length > 0 ? (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--paper)] shadow-lg">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/adoption/${m.id}`}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-[14px] hover:bg-[var(--surface-2)]"
            >
              <span className="font-medium text-[var(--ink)]">{m.eip} <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">{m.name}</span></span>
              {m.ranked ? <ArrowRight className="h-3.5 w-3.5 text-[var(--brand-strong)]" /> : <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">soon</span>}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ v, k }: { v: string; k: string }) {
  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <div className="mono text-[2rem] font-bold leading-none tabular-nums text-[var(--ink)]">{v}</div>
      <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{k}</div>
    </div>
  );
}

function AdoptionChart({ rows }: { rows: AdoptionRow[] }) {
  const data = useMemo(() => rows.map((r) => ({ eip: r.eip, active: r.active, conf: r.confidence })), [rows]);
  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--paper)] p-4 sm:p-5">
      <p className="mb-1 text-[15px] font-medium text-[var(--ink)]">Active implementing contracts</p>
      <p className="mb-4 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">distinct implementing contracts active in the window</p>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 44, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="eip" width={72} tick={{ fill: 'var(--ink)', fontSize: 12, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', fontSize: 12 }}
            labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
            formatter={(val: number) => [`${fmt(val)} active`, '']}
          />
          <Bar dataKey="active" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.eip} fill={CONF_COLOR[d.conf] ?? 'var(--brand)'} />)}
            <LabelList dataKey="active" position="right" fill="var(--ink-muted)" fontSize={11} fontFamily={MONO} formatter={(v: number) => compact(v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
  const [loading, setLoading] = useState(false);
  // Only trust a server-rendered payload that actually came back available — a
  // transient failure (e.g. the dev server rendered during a cold start) must
  // not be cached as final, or the page would show "unavailable" for the whole
  // ISR window. An empty cache forces a fresh client fetch that self-heals.
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

  // Overview totals (30-day) shown in the metric cards. Derive from a dedicated
  // 30d fetch so they stay correct regardless of the active-window toggle, and
  // so they recover if the server-rendered overview came back unavailable.
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

  const rows = lb.rows;
  const liveOk = totals.available || lb.available;
  const deferred = overview.catalog.filter((c) => !c.ranked);

  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight · On-chain adoption"
        title="Ethereum Standards Adoption"
        lead={
          <>
            Which <span className="accent">EIPs and ERCs</span> are actually implemented and used on-chain, measured{' '}
            <span className="font-medium text-[var(--ink)]">directly from on-chain activity</span>.
          </>
        }
      >
        <span className="mono text-xs">{overview.coverage.network}</span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">Since Dencun · {overview.coverage.fromDate}</span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">{overview.standardsRanked} ranked / {overview.standardsTracked} tracked</span>
      </PageHead>

      <div className="wrap py-8 sm:py-12">
        {/* 01 — overview */}
        <section className="mt-2">
          <SectionHead n="01" title="Adoption overview" />
          {!liveOk ? (
            <p className="mb-6 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[14px] text-[var(--ink-muted)]">
              Live on-chain data is loading. The tracked-standards catalog and methodology below still apply.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard v={`${overview.standardsRanked}`} k="standards ranked on-chain" />
            <MetricCard v={totals.available ? compact(totals.total) : '—'} k="detected contract implementations" />
            <MetricCard v={totals.available ? compact(totals.active) : '—'} k="active contracts (30 days)" />
            <MetricCard v={`${overview.networks}`} k="networks covered" />
          </div>
          <p className="mt-3 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
            counts are distinct contracts per standard, summed across standards (one contract can implement several) · a conservative floor within coverage
          </p>
        </section>

        {/* 02 — leaderboard */}
        <section className="mt-16">
          <SectionHead n="02" title="Top standards on-chain" />

          <div className="mb-6">
            <SearchJump catalog={overview.catalog} />
          </div>

          {/* window toggle */}
          <div className="mb-6 flex items-center gap-2">
            <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">Active window</span>
            <div className="inline-flex rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWindow(w.key)}
                  className={cn(
                    'rounded-[calc(var(--l-radius)-2px)] px-3 py-1 mono text-[12px] font-semibold transition-colors',
                    window === w.key ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            {loading ? <span className="mono text-[11px] text-[var(--ink-faint)]">updating…</span> : null}
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
            <AdoptionChart rows={rows} />

            {/* table */}
            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)]">
              <table className="w-full min-w-[460px] text-[14px]">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    <th className="w-8 px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Standard</th>
                    <th className="px-3 py-2 font-semibold text-right">Contracts</th>
                    <th className="px-3 py-2 font-semibold text-right">Active</th>
                    <th className="px-3 py-2 font-semibold text-right">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-[var(--border)]/60">
                      <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-[var(--ink-faint)]">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={`/adoption/${r.id}`} className="inline-flex items-center gap-1 font-medium text-[var(--ink)] hover:text-[var(--brand-strong)] hover:underline">
                          {r.eip}<ArrowRight className="h-3 w-3 opacity-50" />
                        </Link>
                        <div className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">{r.name}</div>
                      </td>
                      <td className="px-3 py-2.5 mono tabular-nums text-right text-[var(--ink-muted)]">{compact(r.contracts)}</td>
                      <td className="px-3 py-2.5 mono tabular-nums text-right font-semibold text-[var(--ink)]">{compact(r.active)}</td>
                      <td className="px-3 py-2.5 mono tabular-nums text-right text-[var(--ink-muted)]">{compact(r.events)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
            Contracts = distinct implementing contracts detected (all-time, within coverage) · Active / Events = within the selected window
          </p>
        </section>

        {/* 03 — tracked catalog */}
        <section className="mt-16">
          <SectionHead n="03" title="Tracked standards" />
          <p className="mb-6 max-w-[52rem] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            The {overview.standardsRanked} standards above are ranked from on-chain activity. These are also tracked and will be added
            to the ranking as coverage expands.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deferred.map((c) => (
              <div key={c.id} className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <a href={c.specUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ink)] hover:text-[var(--brand-strong)] hover:underline">{c.eip}</a>
                  <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">soon</span>
                </div>
                <div className="mt-0.5 mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">{c.name}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{c.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
          {overview.coverage.network} · since Dencun ({overview.coverage.fromDate}) · updated {new Date(lb.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
