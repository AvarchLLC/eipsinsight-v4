'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ArrowLeft, Download } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { client } from '@/lib/orpc';
import type { StandardDetail, AdoptionTrend, Window } from '@/server/orpc/procedures/adoption';

const MONO = 'var(--font-mono, ui-monospace, monospace)';
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(mo) - 1]} '${y.slice(2)}`;
};
const compactAxis = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1000)}k` : `${n}`);

function TrendChart({ id, eip }: { id: string; eip: string }) {
  const [trend, setTrend] = useState<AdoptionTrend | null>(null);
  const [metric, setMetric] = useState<'active' | 'events'>('active');
  useEffect(() => {
    let cancelled = false;
    client.adoption.trend({ id }).then((r) => !cancelled && setTrend(r));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const data = useMemo(() => (trend?.series ?? []).map((p) => ({ label: monthLabel(p.month), value: p[metric] })), [trend, metric]);
  const loading = trend === null;
  const empty = !loading && (!trend?.available || data.length === 0);

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.6rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">Adoption over time</h2>
        <div className="inline-flex rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          {(['active', 'events'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                'rounded-[calc(var(--l-radius)-2px)] px-3 py-1 mono text-[11px] font-semibold uppercase tracking-wider transition-colors',
                metric === m ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
              )}
            >
              {m === 'active' ? 'Contracts' : 'Events'}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--paper)] p-4 sm:p-5">
        <p className="mb-4 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
          {metric === 'active' ? `distinct ${eip} contracts active each month` : `${eip} events each month`}
        </p>
        {loading ? (
          <div className="flex h-[240px] items-center justify-center mono text-[12px] text-[var(--ink-faint)]">building chart…</div>
        ) : empty ? (
          <div className="flex h-[240px] items-center justify-center mono text-[12px] text-[var(--ink-faint)]">trend data unavailable right now.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: 'var(--ink-muted)', fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={compactAxis} width={40} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', fontSize: 12 }}
                labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                formatter={(v: number) => [v.toLocaleString(), metric === 'active' ? 'active contracts' : 'events']}
                cursor={{ stroke: 'var(--brand)', strokeWidth: 1, opacity: 0.4 }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} fill="url(#gTrend)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const compact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${n}`;
};
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const addrUrl = (a: string) => `https://etherscan.io/address/${a}`;
const whenLabel = (s: string) => (s ? s.slice(0, 16).replace(' ', ' · ') : '—');

const WINDOWS: { key: Window; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
];

function MetricCard({ v, k }: { v: string; k: string }) {
  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <div className="mono text-[2rem] font-bold leading-none tabular-nums text-[var(--ink)]">{v}</div>
      <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{k}</div>
    </div>
  );
}

export function StandardDetailView({ initial }: { initial: StandardDetail }) {
  const [window, setWindow] = useState<Window>(initial.window);
  const [d, setD] = useState<StandardDetail>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Self-heal: always fetch on window change, and recover if the server
    // payload arrived unavailable (cold start / transient blip).
    if (window === initial.window && d.available && d.window === window) return;
    let cancelled = false;
    setLoading(true);
    client.adoption
      .standard({ id: initial.id, window })
      .then((res) => !cancelled && setD(res))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [window, initial.id, initial.window, d.available, d.window]);

  const meta = d.meta ?? initial.meta;
  const notRanked = d.found && !d.ranked;

  const [downloading, setDownloading] = useState(false);
  const downloadCsv = async () => {
    if (!meta) return;
    setDownloading(true);
    try {
      const exp = await client.adoption.directory({ id: initial.id, window, limit: 500 });
      const pageUrl = `https://eipsinsight.com/adoption/${initial.id}`;
      const header = [
        `# EIPsInsight — Ethereum Standards Adoption`,
        `# Standard: ${meta.eip} (${meta.name})`,
        `# Window: ${exp.window} · Coverage: ${exp.coverage.network} since ${exp.coverage.fromDate}`,
        `# Source: ${pageUrl}`,
        `# Generated: ${exp.generatedAt}`,
        `rank,address,events,last_active,etherscan`,
      ];
      const body = exp.rows.map(
        (r, i) => `${i + 1},${r.address},${r.events},${r.lastActive},https://etherscan.io/address/${r.address}`,
      );
      const csv = [...header, ...body].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `eipsinsight-${initial.id}-contracts-${exp.window}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow={`EIPsInsight · On-chain adoption${meta ? ` · ${meta.category}` : ''}`}
        title={meta ? `${meta.eip} — ${meta.name}` : 'Standard'}
        lead={meta ? <>{meta.blurb}</> : undefined}
      >
        <Link href="/adoption" className="inline-flex items-center gap-1 mono text-xs text-[var(--brand-strong)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> All standards
        </Link>
        {meta ? (
          <>
            <span className="text-[var(--border-strong)]">·</span>
            <a href={meta.specUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mono text-xs text-[var(--brand-strong)] hover:underline">
              Specification <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : null}
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">{d.coverage.network} · since {d.coverage.fromDate}</span>
      </PageHead>

      <div className="wrap py-8 sm:py-12">
        {notRanked ? (
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
              <span className="font-medium text-[var(--ink)]">{meta?.eip}</span> is tracked, and on-chain adoption metrics for it are
              coming soon. Explore the standards that are measured today on the{' '}
              <Link href="/adoption" className="text-[var(--brand-strong)] hover:underline">adoption dashboard</Link>.
            </p>
          </div>
        ) : (
          <>
            {/* window toggle */}
            <div className="mb-6 flex items-center gap-2">
              <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">Window</span>
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

            {/* metrics */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetricCard v={d.available ? compact(d.metrics.contracts) : '—'} k="detected contracts (all-time)" />
              <MetricCard v={d.available ? compact(d.metrics.active) : '—'} k={`active contracts (${window})`} />
              <MetricCard v={d.available ? compact(d.metrics.events) : '—'} k={`events (${window})`} />
            </div>
            {!d.available ? (
              <p className="mt-3 mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">live on-chain data is loading…</p>
            ) : null}

            {/* adoption over time */}
            {meta ? <TrendChart id={initial.id} eip={meta.eip} /> : null}

            {/* directory */}
            <div className="mt-12">
              <div className="mb-3 flex items-center">
                <span className="h-px w-10 bg-[var(--brand)]" />
                <span className="h-px flex-1 bg-[var(--ink)]" />
              </div>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[1.6rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">Contract directory</h2>
                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={downloading || !d.available}
                  className="inline-flex items-center gap-1.5 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)] hover:border-[var(--brand)] disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloading ? 'Preparing…' : 'Download CSV'}
                </button>
              </div>
              <p className="mb-5 text-[14px] text-[var(--ink-muted)]">The most active {meta?.eip} contracts in the window, each on Etherscan. The CSV export includes up to 500.</p>

              <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)]">
                <table className="w-full min-w-[520px] text-[14px]">
                  <thead>
                    <tr className="bg-[var(--surface-2)] text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                      <th className="w-8 px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Contract</th>
                      <th className="px-3 py-2 font-semibold text-right">Events ({window})</th>
                      <th className="px-3 py-2 font-semibold text-right">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.directory.map((c, i) => (
                      <tr key={c.address} className="border-t border-[var(--border)]/60">
                        <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-[var(--ink-faint)]">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <a href={addrUrl(c.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mono text-[12px] text-[var(--brand-strong)] hover:underline">
                            {short(c.address)}<ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-3 py-2.5 mono tabular-nums text-right text-[var(--ink)]">{compact(c.events)}</td>
                        <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-right text-[var(--ink-muted)]">{whenLabel(c.lastActive)}</td>
                      </tr>
                    ))}
                    {d.available && d.directory.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center mono text-[12px] text-[var(--ink-faint)]">No activity in this window.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <p className="mt-12 mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
          {d.coverage.network} · since Dencun ({d.coverage.fromDate}) · updated {new Date(d.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
