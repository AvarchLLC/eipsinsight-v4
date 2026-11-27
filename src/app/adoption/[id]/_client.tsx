'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
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
  StandardDetail,
  AdoptionTrend,
  ValueMoved,
  Window,
} from '@/server/orpc/procedures/adoption';
import type { ProposalMeta } from './page';

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(mo) - 1]} '${y.slice(2)}`;
};
const compactAxis = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1000)}k` : `${n}`;
const compactUsd = (n: number): string => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
};
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
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '365d', label: '1y' },
  { key: 'all', label: 'All' },
];

const evidenceLabel = (id: string, isTx: boolean, kind?: string): string => {
  if (id === 'erc-20') return 'Transfer (no tokenId)';
  if (id === 'erc-721') return 'Transfer (indexed tokenId)';
  if (id === 'erc-2612' || kind === 'calldata') return 'permit() calldata';
  if (id === 'eip-7702') return 'tx_type = 4';
  if (id === 'eip-1559') return 'tx_type = 2';
  if (id === 'eip-4844') return 'tx_type = 3';
  if (id === 'eip-2930') return 'tx_type = 1';
  if (id === 'eip-7002') return 'system contract 0x00000961…7002';
  if (id === 'eip-7251') return 'system contract 0x0000bbdd…7251';
  if (id === 'eip-4788') return 'system contract 0x000f3df6…ac02';
  if (isTx || kind === 'txtype') return 'tx_type';
  return 'Event signature';
};

function StandardizationPanel({ proposal }: { proposal: NonNullable<ProposalMeta> }) {
  return (
    <section className="space-y-4">
      <SectionHead
        index="01"
        eyebrow="SPECIFICATION"
        title="Standardization"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${proposal.repo}/${proposal.number}`}
              className="btn h-8 px-3 text-xs font-medium"
            >
              View Proposal
            </Link>
            {proposal.discussions_to && (
              <a
                href={proposal.discussions_to}
                target="_blank"
                rel="noopener noreferrer"
                className="btn h-8 px-3 text-xs font-medium"
              >
                <span>Discussion</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        }
      />

      <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <p className="eyebrow mb-2">Status</p>
            <LedgerBadge token={proposal.status}>{proposal.status}</LedgerBadge>
          </div>
          <div>
            <p className="eyebrow mb-2">Created</p>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">{proposal.created ?? '—'}</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Type &amp; Category</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {proposal.category && (
                <LedgerBadge token={proposal.category} className="text-[10px]">
                  {proposal.category}
                </LedgerBadge>
              )}
              {proposal.type && (
                <span className="font-mono text-xs text-[var(--ink-muted)]">{proposal.type}</span>
              )}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Authors</p>
            <p className="font-mono text-sm font-semibold text-[var(--ink)]">
              {proposal.authors.length ? `${proposal.authors.length} author${proposal.authors.length === 1 ? '' : 's'}` : '—'}
            </p>
          </div>
        </div>

        {(proposal.authors.length > 0 || proposal.requires.length > 0) && (
          <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-3.5 text-xs text-[var(--ink-muted)]">
            {proposal.authors.length > 0 && (
              <p className="leading-relaxed">
                <span className="eyebrow mr-2">Authors:</span>
                {proposal.authors.join(', ')}
              </p>
            )}
            {proposal.requires.length > 0 && (
              <p className="font-mono">
                <span className="eyebrow mr-2">Requires:</span>
                {proposal.requires.map((r, i) => (
                  <span key={r}>
                    {i > 0 ? ', ' : ''}
                    <Link href={`/${proposal.repo}/${r}`} className="text-[var(--brand-strong)] hover:underline">
                      #{r}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TrendChart({
  id,
  eip,
  isTx,
  index,
}: {
  id: string;
  eip: string;
  isTx: boolean;
  index: string;
}) {
  const [trend, setTrend] = useState<AdoptionTrend | null>(null);
  const [metric, setMetric] = useState<'active' | 'events'>('active');

  useEffect(() => {
    let cancelled = false;
    client.adoption.trend({ id }).then((r) => !cancelled && setTrend(r));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const series = trend?.series ?? [];
  const loading = trend === null;
  const empty = !loading && (!trend?.available || series.length === 0);

  const option = useMemo(() => {
    const labels = series.map((p) => monthLabel(p.month));
    const values = series.map((p) => p[metric]);
    return {
      backgroundColor: 'transparent',
      tooltip: chartTooltip({
        trigger: 'axis',
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          if (!p) return '';
          const unitLabel = metric === 'active' ? (isTx ? 'active accounts' : 'active contracts') : isTx ? 'txs' : 'events';
          return `${p.name}: <b>${Number(p.value).toLocaleString()}</b> ${unitLabel}`;
        },
      }),
      grid: { top: 18, left: 48, right: 20, bottom: 28 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: 'var(--ink-faint)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'var(--border)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--ink-faint)',
          fontSize: 11,
          formatter: (v: number) => compactAxis(v),
        },
        splitLine: { lineStyle: { color: 'var(--border)', type: 'dashed' } },
      },
      series: [
        {
          name: metric === 'active' ? (isTx ? 'Accounts' : 'Contracts') : isTx ? 'Txs' : 'Events',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: values,
          lineStyle: { width: 2.5, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [series, metric, isTx]);

  return (
    <section className="space-y-4">
      <SectionHead
        index={index}
        eyebrow="MONTHLY SERIES"
        title="Adoption Over Time"
        action={
          <div className="flex items-center gap-1.5">
            {(['active', 'events'] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-active={metric === m}
                onClick={() => setMetric(m)}
                className="chip"
              >
                {m === 'active' ? (isTx ? 'Accounts' : 'Contracts') : isTx ? 'Txs' : 'Events'}
              </button>
            ))}
          </div>
        }
      />

      <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="eyebrow mb-3">
          {metric === 'active'
            ? `Distinct ${eip} ${isTx ? 'accounts' : 'contracts'} active each month`
            : `${eip} ${isTx ? 'authorization txs' : 'events'} per month`}
        </p>

        {loading ? (
          <div className="flex h-[280px] items-center justify-center font-mono text-xs text-[var(--ink-faint)]">
            building chart…
          </div>
        ) : empty ? (
          <div className="flex h-[280px] items-center justify-center font-mono text-xs text-[var(--ink-faint)]">
            trend data unavailable right now.
          </div>
        ) : (
          <div className="relative h-[280px] w-full">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} notMerge />
            <ChartWatermark />
          </div>
        )}
        <ChartFooter />
      </div>
    </section>
  );
}

export function StandardDetailView({
  initial,
  proposal,
}: {
  initial: StandardDetail;
  proposal: ProposalMeta;
}) {
  const [window, setWindow] = useState<Window>(initial.window);
  const [d, setD] = useState<StandardDetail>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  const isTx = meta?.kind === 'txtype';
  const unit = isTx ? 'accounts' : 'contracts';
  const showValue = initial.id === 'erc-20';

  const [value, setValue] = useState<{
    usd: number | null;
    tokens: number;
    tier?: 1 | 2;
    loading: boolean;
  }>({ usd: null, tokens: 0, loading: false });

  useEffect(() => {
    if (!showValue) return;
    let cancelled = false;
    setValue((v) => ({ ...v, loading: true }));
    client.adoption
      .valueMoved({ window })
      .then((r: ValueMoved) =>
        !cancelled &&
        setValue({
          usd: r.available ? r.usd : null,
          tokens: r.tokens,
          tier: r.tier,
          loading: false,
        }),
      )
      .catch(() => !cancelled && setValue((v) => ({ ...v, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [showValue, window]);

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
      toast.success(`Exported ${exp.rows.length} ${unit}`);
    } finally {
      setDownloading(false);
    }
  };

  const trendIdx = proposal ? '02' : '01';
  const dirIdx = proposal ? '03' : '02';

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)] pb-16">
      <PageHead
        eyebrow={`ON-CHAIN ADOPTION${meta ? ` · ${meta.category.toUpperCase()}` : ''}`}
        title={meta ? `${meta.eip} — ${meta.name}` : 'Standard'}
        lead={meta ? <>{meta.blurb}</> : undefined}
      >
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-[var(--ink-muted)]">
          <Link href="/adoption" className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> All standards
          </Link>
          {meta && (
            <>
              <span className="text-[var(--border-strong)]">·</span>
              <a
                href={meta.specUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
              >
                Specification <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          <span className="text-[var(--border-strong)]">·</span>
          <span>
            {d.coverage.network} · since {d.coverage.fromDate}
          </span>
        </div>
      </PageHead>

      <div className="wrap space-y-12 py-8">
        {proposal && <StandardizationPanel proposal={proposal} />}

        {notRanked ? (
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink)]">{meta?.eip}</span> is tracked and on-chain metrics are queued. View live ranked standards on the{' '}
            <Link href="/adoption" className="text-[var(--brand-strong)] hover:underline">
              adoption dashboard
            </Link>
            .
          </div>
        ) : (
          <>
            {/* Window Toggle + Ruled KPI Strip */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
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
                {loading && <span className="ml-2 font-mono text-[11px] text-[var(--ink-faint)]">updating…</span>}
              </div>

              <div
                className={cn(
                  'grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] sm:divide-x sm:divide-y-0',
                  showValue ? 'sm:grid-cols-5' : isTx ? 'sm:grid-cols-3' : 'sm:grid-cols-4',
                )}
              >
                <div className="px-5 py-4">
                  <p className="eyebrow">{isTx ? 'Delegating Accounts' : 'Detected Contracts'}</p>
                  <p className="t-figure mt-2 text-2xl sm:text-3xl">{d.available ? compact(d.metrics.contracts) : '—'}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">All-time within coverage</p>
                </div>
                <div className="px-5 py-4">
                  <p className="eyebrow">Active {unit} ({window})</p>
                  <p className="t-figure mt-2 text-2xl sm:text-3xl">{d.available ? compact(d.metrics.active) : '—'}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">Distinct active in window</p>
                </div>
                <div className="px-5 py-4">
                  <p className="eyebrow">{isTx ? `Auth Txs (${window})` : `Events (${window})`}</p>
                  <p className="t-figure mt-2 text-2xl sm:text-3xl">{d.available ? compact(d.metrics.events) : '—'}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">On-chain log volume</p>
                </div>
                {!isTx && (
                  <div className="px-5 py-4">
                    <p className="eyebrow">Unique Users ({window})</p>
                    <p className="t-figure mt-2 text-2xl sm:text-3xl">
                      {users.loading ? '…' : users.v != null ? compact(users.v) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">Distinct EOA callers</p>
                  </div>
                )}
                {showValue && (
                  <div className="px-5 py-4">
                    <p className="eyebrow">Value Moved ({window})</p>
                    <p className="t-figure mt-2 text-2xl sm:text-3xl">
                      {value.loading ? '…' : value.usd != null ? compactUsd(value.usd) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {value.tokens > 0 ? `${value.tokens} tokens · Tier ${value.tier ?? 1}` : 'USD volume'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Adoption Over Time */}
            {meta && <TrendChart id={initial.id} eip={meta.eip} isTx={isTx} index={trendIdx} />}

            {/* Directory Table */}
            <section className="space-y-4">
              <SectionHead
                index={dirIdx}
                eyebrow="ON-CHAIN DIRECTORY"
                title={isTx ? 'Account Directory' : 'Contract Directory'}
                description={`Most active ${meta?.eip ?? ''} ${unit} in the selected window. Export includes up to 500 addresses.`}
                action={
                  <button
                    type="button"
                    onClick={downloadCsv}
                    disabled={downloading || !d.available}
                    title={downloading ? 'Preparing CSV…' : 'Export directory CSV (up to 500)'}
                    aria-label="Export directory CSV"
                    className="btn btn-primary h-8 w-8 shrink-0 p-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full min-w-[600px] text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="w-12 px-4 py-3 text-left eyebrow">#</th>
                      <th className="px-4 py-3 text-left eyebrow">{isTx ? 'Account' : 'Contract'}</th>
                      <th className="px-4 py-3 text-left eyebrow">Evidence</th>
                      <th className="px-4 py-3 text-right eyebrow">Events ({window})</th>
                      <th className="px-4 py-3 text-right eyebrow">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {d.directory.map((c, i) => (
                      <tr key={c.address} className="transition-colors hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-3 font-mono text-[var(--ink-faint)]">#{i + 1}</td>
                        <td className="px-4 py-3">
                          <a
                            href={addrUrl(c.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                          >
                            {short(c.address)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <LedgerBadge token={isTx ? 'eip' : 'erc'} className="font-mono text-[10px]">
                            {evidenceLabel(initial.id, isTx, meta?.kind)}
                          </LedgerBadge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[var(--ink)]">
                          {compact(c.events)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                          {whenLabel(c.lastActive)}
                        </td>
                      </tr>
                    ))}
                    {d.available && d.directory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center font-mono text-xs text-[var(--ink-faint)]">
                          No activity in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <p className="border-t border-[var(--border)] pt-4 font-mono text-[11px] text-[var(--ink-faint)]">
          {d.coverage.network} · since Dencun ({d.coverage.fromDate}) · updated{' '}
          {new Date(d.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
        </p>
      </div>
    </div>
  );
}
