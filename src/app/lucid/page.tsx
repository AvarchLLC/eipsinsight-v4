'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  CheckSquare,
  Crosshair,
  ExternalLink,
  FileText,
  Lock,
  ListChecks,
  Play,
  ShieldAlert,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { client } from '@/lib/orpc';
import type { MempoolMevStats } from '@/server/orpc/procedures/mev';
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from '@/lib/chart-colors';
import { cn } from '@/lib/utils';
import { InlineBrandLoader } from '@/components/inline-brand-loader';

/**
 * Dedicated tracker for Lucid (EIP-8184) - Ethereum's encrypted mempool effort,
 * built with encryptedmempool.org. Pulls the "Encrypt The Mempool" (ETM) working
 * group call summaries/decisions we already ingest, alongside the EIP and the
 * research threads. Route aliases /mempool and /encrypted-mempool redirect here.
 */

type Tldr = {
  meeting?: string;
  targets?: unknown;
  decisions?: Array<{ decision?: string; timestamp?: string }>;
  highlights?: Record<string, unknown> | unknown[];
  action_items?: unknown;
} | null;

type Call = {
  call_id: string;
  call_number: string | null;
  occurred_on: string;
  video_url: string | null;
  has_transcript: boolean;
  display_name: string | null;
  tldr: Tldr;
};

const RESOURCES = [
  {
    label: 'encryptedmempool.org',
    href: 'https://encryptedmempool.org/',
    desc: 'Project hub - the partner site coordinating the encrypted-mempool effort.',
  },
  {
    label: 'EIP-8184 - LUCID encrypted mempool',
    href: 'https://eips.ethereum.org/EIPS/eip-8184',
    desc: 'The specification (Draft, Core / Standards Track).',
  },
  {
    label: 'Ethereum Magicians - EIP-8184: Lucid',
    href: 'https://ethereum-magicians.org/t/eip-8184-lucid-encrypted-mempool/28017',
    desc: 'Standards discussion thread.',
  },
  {
    label: 'ethresear.ch - Lucid: encrypted mempool with distributed payload propagation',
    href: 'https://ethresear.ch/t/lucid-encrypted-mempool-with-distributed-payload-propagation/24042',
    desc: 'The design & research writeup.',
  },
];

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pull the display text out of a string or an object, trying `fields` in order. */
function textOf(item: unknown, fields: string[]): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    for (const f of fields) if (typeof o[f] === 'string' && o[f]) return o[f] as string;
  }
  return '';
}

/**
 * Highlights are an object of topic → array of {highlight, timestamp}. Group by
 * topic and pull the highlight text so we render readable bullets, not raw JSON.
 */
function parseHighlights(value: unknown): Array<{ topic: string; items: string[] }> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const groups: Array<{ topic: string; items: string[] }> = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const arr = Array.isArray(v) ? v : [v];
      const items = arr.map((it) => textOf(it, ['highlight', 'text', 'point', 'decision'])).filter(Boolean);
      if (items.length) groups.push({ topic: humanize(k), items });
    }
    return groups;
  }
  if (Array.isArray(value)) {
    const items = value.map((it) => textOf(it, ['highlight', 'text', 'point'])).filter(Boolean);
    return items.length ? [{ topic: '', items }] : [];
  }
  return [];
}

/** Action items are [{owner, action, timestamp}] - render "action - owner". */
function parseActionItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((it) => {
      const action = textOf(it, ['action', 'item', 'text', 'decision']);
      const owner = it && typeof it === 'object' ? String((it as Record<string, unknown>).owner ?? '') : '';
      return action ? (owner ? `${action} - ${owner}` : action) : '';
    })
    .filter(Boolean);
}

export default function LucidPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [mev, setMev] = useState<MempoolMevStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.calls
      .listRecentCalls({ series: 'etm', limit: 50 })
      .then((rows) => {
        if (!cancelled) setCalls((rows as Call[]).slice().sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    client.mev
      .getMempoolStats()
      .then((s) => {
        if (!cancelled && s?.available) setMev(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const decisions = calls.reduce((n, c) => n + (c.tldr?.decisions?.length ?? 0), 0);
    return {
      meetings: calls.length,
      latest: calls[0]?.occurred_on ?? null,
      decisions,
    };
  }, [calls]);

  return (
    <div className="page-shell space-y-10 py-8">
      {/* Hero */}
      <header>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
          <Lock className="h-3.5 w-3.5" />
          Encrypted Mempool · Working Group
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="dec-title persona-title text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Lucid
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              An encrypted mempool for Ethereum - encrypting transactions until they&apos;re included
              so builders and relays can&apos;t reorder or censor them, mitigating harmful MEV.
              Tracked here with <strong className="text-foreground">encryptedmempool.org</strong>:
              every working-group meeting, decision, and the live spec in one place.
            </p>
          </div>
          <Link
            href="/eip/8184"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60"
          >
            <FileText className="h-4 w-4 text-primary" />
            EIP-8184
            <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              Draft · Core
            </span>
          </Link>
        </div>
      </header>

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Video} accent="text-violet-500" label="WG meetings" value={loading ? '-' : String(stats.meetings)} />
        <Metric icon={CheckSquare} accent="text-emerald-500" label="Decisions logged" value={loading ? '-' : String(stats.decisions)} />
        <Metric icon={CalendarClock} accent="text-amber-500" label="Latest meeting" value={stats.latest ? formatDate(stats.latest) : '-'} />
        <Metric icon={FileText} accent="text-blue-500" label="EIP status" value="Draft" sub="Core · Standards Track" />
      </section>

      {/* Resources */}
      <section>
        <SectionHeader icon={Sparkles} title="Resources" />
        <div className="grid gap-3 sm:grid-cols-2">
          {RESOURCES.map((r) => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
            >
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* The MEV problem Lucid targets - live data from BlobLens */}
      {mev && <MevSection mev={mev} />}

      {/* Meeting summaries */}
      <section>
        <SectionHeader
          icon={ListChecks}
          title="Meeting summaries & decisions"
          action={
            <Link
              href="/calls?series=etm"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All ETM calls
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {loading ? (
          <div className="rounded-xl border border-border bg-card/60 py-14">
            <InlineBrandLoader size="sm" label="Loading working-group meetings…" />
          </div>
        ) : calls.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
            No meetings synced yet.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-5">
            {calls.map((call) => (
              <MeetingCard key={call.call_id} call={call} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MeetingCard({ call }: { call: Call }) {
  const tldr = call.tldr;
  const title = tldr?.meeting || call.display_name || `Encrypt The Mempool #${call.call_number ?? ''}`;
  const decisions = (tldr?.decisions ?? []).map((d) => d?.decision).filter(Boolean) as string[];
  const highlightGroups = parseHighlights(tldr?.highlights);
  const actions = parseActionItems(tldr?.action_items).slice(0, 8);
  const callHref = `/calls/etm/${call.call_number ?? call.call_id}`;

  return (
    <li className="relative">
      <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" aria-hidden />
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(call.occurred_on)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {call.video_url && (
              <a
                href={call.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Play className="h-3 w-3" />
                Recording
              </a>
            )}
            <Link
              href={callHref}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/60"
            >
              Full summary
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {decisions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-3 w-3" />
              Decisions
            </p>
            <ul className="space-y-1">
              {decisions.map((d, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/90">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {highlightGroups.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Highlights</p>
            <div className="space-y-2">
              {highlightGroups.map((g, gi) => (
                <div key={gi}>
                  {g.topic && (
                    <p className="text-[11px] font-medium text-foreground/80">{g.topic}</p>
                  )}
                  <ul className="space-y-1">
                    {g.items.map((h, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-border" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Action items
            </p>
            <ul className="space-y-1">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * The live MEV picture that motivates the working group: how much harmful MEV is
 * being extracted on mainnet today (sandwich attacks), which is exactly what an
 * encrypted mempool is designed to neutralise. Data: BlobLens sandwich index.
 */
function MevSection({ mev }: { mev: MempoolMevStats }) {
  const pct = mev.blocksSandwichedPct;
  return (
    <section>
      <SectionHeader
        icon={ShieldAlert}
        title="The MEV Lucid is built to stop"
        action={
          <span className="text-[11px] text-muted-foreground">
            Sandwich attacks on mainnet · source{' '}
            <span className="font-medium text-foreground">BlobLens</span>
          </span>
        }
      />
      <p className="mb-4 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
        Because today&apos;s mempool is public, searchers can see pending swaps and{' '}
        <strong className="text-foreground">sandwich</strong> them - front-running and back-running a
        victim&apos;s trade to skim value. This is the harm an encrypted mempool removes at the source.
        Measured since the Dencun upgrade (EIP-4844) across five major DEXs:
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Crosshair}
          accent="text-rose-500"
          label="Sandwich attacks"
          value={compactNum(mev.totalSandwiches)}
          sub="detected since Dencun"
        />
        <Metric
          icon={Users}
          accent="text-orange-500"
          label="Unique victims"
          value={compactNum(mev.uniqueVictims)}
          sub="distinct swaps sandwiched"
        />
        <Metric
          icon={ShieldAlert}
          accent="text-amber-500"
          label="Value extracted"
          value={compactUsd(mev.botProfitUsd)}
          sub="bot gross profit (BlobLens est.)"
        />
        <Metric
          icon={Crosshair}
          accent="text-violet-500"
          label="Blocks sandwiched"
          value={pct != null ? `${pct}%` : '-'}
          sub="of all blocks · last 30 days"
        />
      </div>

      {mev.weekly.length > 1 && <MevWeeklyChart mev={mev} />}

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
        BlobLens indexes the post-EIP-4844 era across Uniswap v2/v3, SushiSwap, Curve and DODO, so these
        are a conservative floor versus full-history sources. Dollar figures are gross, before gas.
      </p>
    </section>
  );
}

type WeekPoint = MempoolMevStats['weekly'][number] & { label: string };

/**
 * The chart the working group actually reasons about: weekly sandwich frequency
 * (bars, left axis) against the dollar value extracted (line, right axis). The
 * two together show the "MEV payoff variance" the group debates - weeks where a
 * few large extractions dwarf a normal week of activity, i.e. exactly the payoff
 * distribution Lucid's key-reveal penalty has to deter.
 */
const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

function MevWeeklyChart({ mev }: { mev: MempoolMevStats }) {
  const data: WeekPoint[] = mev.weekly.map((w) => ({ ...w, label: weekLabel(w.week) }));
  // Prefer bot profit; fall back to victim volume when the profit series is flat.
  const hasProfit = data.some((d) => d.botProfitUsd > 0);
  const valueKey: 'botProfitUsd' | 'victimUsd' = hasProfit ? 'botProfitUsd' : 'victimUsd';
  const valueLabel = hasProfit ? 'Value extracted (bot profit)' : 'Victim volume';

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {/* Frequency - how often the mempool is exploited */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Weekly sandwich attacks
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={40} tickFormatter={(v: number) => compactNum(v)} />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                contentStyle={CHART_TOOLTIP}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                formatter={(value: number) => [Number(value).toLocaleString(), 'Attacks']}
              />
              <Bar dataKey="sandwiches" fill={CHART_SERIES[6]} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payoff - the value being extracted (the "MEV payoff variance" the WG debates) */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {valueLabel} · weekly (USD)
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mevValueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES[3]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_SERIES[3]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={CHART_AXIS} tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke={CHART_AXIS} tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => compactUsd(v)} />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                formatter={(value: number) => [compactUsd(value), valueLabel]}
              />
              <Area
                type="monotone"
                dataKey={valueKey}
                stroke={CHART_SERIES[3]}
                strokeWidth={2}
                fill="url(#mevValueFill)"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground lg:col-span-2">
        {mev.uniqueBots.toLocaleString()} distinct sandwich bots · {compactNum(mev.uniquePools)} pools targeted · last 26 weeks.
        The gap between a normal week and the spikes is the &ldquo;MEV payoff variance&rdquo; the working group weighs when
        judging whether Lucid&apos;s key-reveal penalty is a strong enough deterrent.
      </p>
    </div>
  );
}

function weekLabel(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(day)) return day;
  return new Date(`${day.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function compactNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function compactUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
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

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function formatDate(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
