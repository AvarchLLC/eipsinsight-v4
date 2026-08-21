'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
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
  ShieldCheck,
  TrendingUp,
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
    desc: 'Project hub - coordinating the encrypted-mempool effort with core builders.',
  },
  {
    label: 'Ethereum Magicians - EIP-8184: Lucid',
    href: 'https://ethereum-magicians.org/t/eip-8184-lucid-encrypted-mempool/28017',
    desc: 'Official EIP-8184 standards discussion thread.',
  },
  {
    label: 'ethresear.ch - Lucid Design Writeup',
    href: 'https://ethresear.ch/t/lucid-encrypted-mempool-with-distributed-payload-propagation/24042',
    desc: 'Architecture writeup for distributed payload propagation.',
  },
];

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function textOf(item: unknown, fields: string[]): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    for (const f of fields) if (typeof o[f] === 'string' && o[f]) return o[f] as string;
  }
  return '';
}

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

export function LucidProposalSection() {
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
    <div className="space-y-8">
      {/* 1. Working Group Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card/80 to-card/60 p-6 backdrop-blur-md shadow-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Lock className="h-3.5 w-3.5" />
            Encrypted Mempool Working Group
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Coordinated with <strong className="text-foreground">encryptedmempool.org</strong>
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Lucid Protocol Context & Working Group Tracker
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-4xl">
          Lucid (EIP-8184) introduces an encrypted mempool for Ethereum — encrypting user transactions until they are included in a block so builders and relays cannot front-run, sandwich, or censor them.
        </p>

        {/* Working Group Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <Metric icon={Video} accent="text-violet-500" label="WG Meetings" value={loading ? '...' : String(stats.meetings)} />
          <Metric icon={CheckSquare} accent="text-emerald-500" label="Decisions Logged" value={loading ? '...' : String(stats.decisions)} />
          <Metric icon={CalendarClock} accent="text-amber-500" label="Latest Meeting" value={stats.latest ? formatDate(stats.latest) : '...'} />
          <Metric icon={ShieldCheck} accent="text-cyan-500" label="Primary Defense" value="Sandwich Immunity" />
        </div>

        {/* Resources Grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          {RESOURCES.map((r) => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 rounded-xl border border-border/80 bg-background/80 p-3.5 transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
            >
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-violet-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{r.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{r.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </motion.div>

      {/* 2. Live MEV Protection Metrics Section */}
      <section id="lucid-mev" data-sidebar-label="MEV Protection Metrics" className="scroll-mt-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md shadow-xs"
        >
          <SectionHeader
            icon={ShieldAlert}
            title="The MEV Harm EIP-8184 Neutralises"
            action={
              <span className="text-xs text-muted-foreground">
                Mainnet Sandwich Index · source <strong className="text-foreground">BlobLens</strong>
              </span>
            }
          />
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Because today&apos;s mempool is unencrypted, searchers can inspect pending swaps and <strong className="text-foreground">sandwich</strong> victim trades (front-running & back-running). Lucid encrypts transactions until block execution to render sandwiching impossible.
          </p>

          {mev ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  icon={Crosshair}
                  accent="text-rose-500"
                  label="Sandwich Attacks"
                  value={compactNum(mev.totalSandwiches)}
                  sub="detected post-Dencun"
                />
                <Metric
                  icon={Users}
                  accent="text-orange-500"
                  label="Unique Victims"
                  value={compactNum(mev.uniqueVictims)}
                  sub="swaps exploited"
                />
                <Metric
                  icon={ShieldAlert}
                  accent="text-amber-500"
                  label="Extracted Value"
                  value={compactUsd(mev.botProfitUsd)}
                  sub="bot gross profit"
                />
                <Metric
                  icon={TrendingUp}
                  accent="text-violet-500"
                  label="Blocks Sandwiched"
                  value={mev.blocksSandwichedPct != null ? `${mev.blocksSandwichedPct}%` : '-'}
                  sub="last 30 days"
                />
              </div>

              {mev.weekly.length > 1 && <MevWeeklyChart mev={mev} />}
            </div>
          ) : (
            <div className="py-8">
              <InlineBrandLoader size="sm" label="Loading mainnet MEV protection statistics..." />
            </div>
          )}
        </motion.div>
      </section>

      {/* 3. Working Group Meetings & Decisions Section */}
      <section id="lucid-meetings" data-sidebar-label="Working Group Decisions" className="scroll-mt-28">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md shadow-xs"
        >
          <SectionHeader
            icon={ListChecks}
            title="Working Group Meetings & Consensus Decisions"
            action={
              <Link
                href="/calls?series=etm"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                All ETM Calls
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          {loading ? (
            <div className="py-12">
              <InlineBrandLoader size="sm" label="Loading Encrypt The Mempool call logs..." />
            </div>
          ) : calls.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No meeting logs synced yet.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-border/60 pl-5 mt-4">
              {calls.slice(0, 6).map((call) => (
                <MeetingCard key={call.call_id} call={call} />
              ))}
            </ol>
          )}
        </motion.div>
      </section>
    </div>
  );
}

function MeetingCard({ call }: { call: Call }) {
  const tldr = call.tldr;
  const title = tldr?.meeting || call.display_name || `Encrypt The Mempool #${call.call_number ?? ''}`;
  const decisions = (tldr?.decisions ?? []).map((d) => d?.decision).filter(Boolean) as string[];
  const highlightGroups = parseHighlights(tldr?.highlights);
  const actions = parseActionItems(tldr?.action_items).slice(0, 5);
  const callHref = `/calls/etm/${call.call_number ?? call.call_id}`;

  return (
    <li className="relative">
      <span className="absolute -left-[25px] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" aria-hidden />
      <div className="rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(call.occurred_on)}</p>
          </div>
          <div className="flex items-center gap-2">
            {call.video_url && (
              <a
                href={call.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Play className="h-3 w-3" />
                Recording
              </a>
            )}
            <Link
              href={callHref}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
            >
              Summary
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {decisions.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-3 w-3" />
              Key Decisions
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
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Highlights</p>
            <div className="space-y-2">
              {highlightGroups.map((g, gi) => (
                <div key={gi}>
                  {g.topic && (
                    <p className="text-[11px] font-semibold text-foreground/80">{g.topic}</p>
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
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Action Items
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

const CHART_TOOLTIP = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--background)',
  fontSize: '12px',
} as const;

type WeekPoint = MempoolMevStats['weekly'][number] & { label: string };

function MevWeeklyChart({ mev }: { mev: MempoolMevStats }) {
  const data: WeekPoint[] = mev.weekly.map((w) => ({ ...w, label: weekLabel(w.week) }));
  const hasProfit = data.some((d) => d.botProfitUsd > 0);
  const valueKey: 'botProfitUsd' | 'victimUsd' = hasProfit ? 'botProfitUsd' : 'victimUsd';
  const valueLabel = hasProfit ? 'Value extracted (bot profit)' : 'Victim volume';

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Weekly Sandwich Attacks
        </p>
        <div className="h-52 w-full">
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

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {valueLabel} · Weekly (USD)
        </p>
        <div className="h-52 w-full">
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
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
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
