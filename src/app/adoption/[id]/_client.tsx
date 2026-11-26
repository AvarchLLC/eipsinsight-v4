'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, ArrowLeft, Download } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { client } from '@/lib/orpc';
import type { StandardDetail, AdoptionTrend, Window } from '@/server/orpc/procedures/adoption';
import type { ProposalMeta } from './page';

// EIP status → ledger status colour.
const STATUS_COLOR: Record<string, string> = {
  Final: 'var(--c-final)',
  Living: 'var(--c-final)',
  'Last Call': 'var(--c-lastcall)',
  Review: 'var(--c-review)',
  Draft: 'var(--c-review)',
  Stagnant: 'var(--c-withdrawn)',
  Withdrawn: 'var(--c-withdrawn)',
};

function StandardizationPanel({ proposal }: { proposal: NonNullable<ProposalMeta> }) {
  const color = STATUS_COLOR[proposal.status] ?? 'var(--ink-muted)';
  const facts: { k: string; v: ReactNode }[] = [
    { k: 'Status', v: (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold" style={{ color }}>{proposal.status}</span>
      </span>
    ) },
    { k: 'Created', v: proposal.created ?? '—' },
    { k: 'Type', v: [proposal.type, proposal.category].filter(Boolean).join(' · ') || '—' },
    { k: 'Authors', v: proposal.authors.length ? `${proposal.authors.length} author${proposal.authors.length === 1 ? '' : 's'}` : '—' },
  ];
  return (
    <div className="mb-10 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.3rem] leading-tight text-[var(--ink)] [font-family:var(--font-instrument-serif)]">Standardization</h2>
        <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">the proposal behind the adoption</span>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.k}>
            <div className="text-[15px] text-[var(--ink)]">{f.v}</div>
            <div className="mt-1 mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">{f.k}</div>
          </div>
        ))}
      </div>
      {proposal.authors.length ? (
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--ink-muted)]">
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">Authors · </span>
          {proposal.authors.join(', ')}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Link href={`/${proposal.repo}/${proposal.number}`} className="inline-flex items-center gap-1 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline">
          Proposal on EIPsInsight <ArrowLeft className="h-3 w-3 rotate-180" />
        </Link>
        {proposal.discussions_to ? (
          <a href={proposal.discussions_to} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mono text-[11px] text-[var(--brand-strong)] hover:underline">
            Discussion <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        {proposal.requires.length ? (
          <span className="mono text-[11px] text-[var(--ink-muted)]">
            Requires {proposal.requires.map((r, i) => (
              <span key={r}>
                {i > 0 ? ', ' : ''}
                <a href={`/${proposal.repo}/${r}`} className="text-[var(--brand-strong)] hover:underline">{r}</a>
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const MONO = 'var(--font-mono, ui-monospace, monospace)';
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(mo) - 1]} '${y.slice(2)}`;
};
const compactAxis = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1000)}k` : `${n}`);
const compactUsd = (n: number): string => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
};

function TrendChart({ id, eip, isTx }: { id: string; eip: string; isTx: boolean }) {
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
              {m === 'active' ? (isTx ? 'Accounts' : 'Contracts') : (isTx ? 'Txs' : 'Events')}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--paper)] p-4 sm:p-5">
        <p className="mb-4 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
          {metric === 'active'
            ? `distinct ${eip} ${isTx ? 'accounts' : 'contracts'} active each month`
            : `${eip} ${isTx ? 'authorization txs' : 'events'} each month`}
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
  { key: '365d', label: '1 year' },
];

function MetricCard({ v, k }: { v: string; k: string }) {
  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <div className="mono text-[2rem] font-bold leading-none tabular-nums text-[var(--ink)]">{v}</div>
      <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{k}</div>
    </div>
  );
}

export function StandardDetailView({ initial, proposal }: { initial: StandardDetail; proposal: ProposalMeta }) {
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
  const isTx = meta?.kind === 'txtype'; // transaction feature (e.g. EIP-7702): accounts, not contracts
  const unit = isTx ? 'accounts' : 'contracts';
  const showValue = initial.id === 'erc-20'; // USD value moved is an ERC-20 metric

  // Value moved (USD) — ba-data-only, priced tokens (stablecoins + ETH). Lazy.
  const [value, setValue] = useState<{ usd: number | null; tokens: number; loading: boolean }>({ usd: null, tokens: 0, loading: false });
  useEffect(() => {
    if (!showValue) return;
    let cancelled = false;
    setValue((v) => ({ ...v, loading: true }));
    client.adoption
      .valueMoved({ window })
      .then((r) => !cancelled && setValue({ usd: r.available ? r.usd : null, tokens: r.tokens, loading: false }))
      .catch(() => !cancelled && setValue((v) => ({ ...v, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [showValue, window]);

  // Unique users — lazy (heavier than the core metrics), only for contract standards.
  const [users, setUsers] = useState<{ v: number | null; loading: boolean }>({ v: null, loading: false });
  useEffect(() => {
    if (isTx || notRanked) return;
    let cancelled = false;
    setUsers({ v: null, loading: true });
    client.adoption
      .users({ id: initial.id, window })
      .then((r) => !cancelled && setUsers({ v: r.available && r.applicable ? r.users : null, loading: false }))
      .catch(() => !cancelled && setUsers({ v: null, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [initial.id, window, isTx, notRanked]);

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
        {proposal ? <StandardizationPanel proposal={proposal} /> : null}
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
            <div className={cn('grid grid-cols-2 gap-4', isTx ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
              <MetricCard v={d.available ? compact(d.metrics.contracts) : '—'} k={isTx ? 'delegating accounts (all-time)' : 'detected contracts (all-time)'} />
              <MetricCard v={d.available ? compact(d.metrics.active) : '—'} k={`active ${unit} (${window})`} />
              <MetricCard v={d.available ? compact(d.metrics.events) : '—'} k={isTx ? `authorization txs (${window})` : `events (${window})`} />
              {!isTx ? (
                <MetricCard v={users.loading ? '…' : users.v != null ? compact(users.v) : '—'} k={`unique users (${window})`} />
              ) : null}
            </div>
            {!d.available ? (
              <p className="mt-3 mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">live on-chain data is loading…</p>
            ) : null}

            {/* value moved (USD) — ba-data-only, priced tokens */}
            {showValue ? (
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <span className="mono text-[1.8rem] font-bold leading-none tabular-nums text-[var(--ink)]">
                  {value.loading ? '…' : value.usd != null ? compactUsd(value.usd) : '—'}
                </span>
                <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">value moved ({window})</span>
                <span className="mono text-[10px] text-[var(--ink-faint)]">
                  · across {value.tokens} major priced tokens (stablecoins + ETH) · a conservative floor, long-tail tokens excluded
                </span>
              </div>
            ) : null}

            {/* adoption over time */}
            {meta ? <TrendChart id={initial.id} eip={meta.eip} isTx={isTx} /> : null}

            {/* directory */}
            <div className="mt-12">
              <div className="mb-3 flex items-center">
                <span className="h-px w-10 bg-[var(--brand)]" />
                <span className="h-px flex-1 bg-[var(--ink)]" />
              </div>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[1.6rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">{isTx ? 'Account directory' : 'Contract directory'}</h2>
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
              <p className="mb-5 text-[14px] text-[var(--ink-muted)]">The most active {meta?.eip} {isTx ? 'accounts' : 'contracts'} in the window, each on Etherscan. The CSV export includes up to 500.</p>

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
