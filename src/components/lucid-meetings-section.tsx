'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  ChevronDown,
  ListChecks,
  Play,
  ArrowUpRight,
  Video,
  Search,
  Calendar,
  Lock,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { InlineBrandLoader } from '@/components/inline-brand-loader';

type Tldr = {
  meeting?: string;
  decisions?: Array<{ decision?: string; timestamp?: string }>;
  highlights?: Record<string, unknown> | unknown[];
  action_items?: unknown;
} | null;

type Call = Awaited<ReturnType<typeof client.calls.listRecentCalls>>[number];

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

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

/** Encrypted Mempool working group calls section for the /lucid/calls page. */
export function LucidMeetingsSection() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    client.calls
      .listRecentCalls({ series: 'etm', limit: 100 })
      .then((rows) => {
        if (!cancelled) setCalls((rows as Call[]).slice().sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1)));
      })
      .catch(() => {
        if (!cancelled) setCalls([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCalls = useMemo(() => {
    if (!query.trim()) return calls;
    const q = query.toLowerCase();
    return calls.filter((c) => {
      const tldr = c.tldr as Tldr;
      const title = (tldr?.meeting || c.display_name || '').toLowerCase();
      const decisions = (tldr?.decisions ?? []).map((d) => d?.decision ?? '').join(' ').toLowerCase();
      return title.includes(q) || decisions.includes(q) || (c.call_number && c.call_number.includes(q));
    });
  }, [calls, query]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 py-16 text-center">
        <InlineBrandLoader size="md" label="Loading Encrypted Mempool working group calls..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <Video className="h-5 w-5 text-violet-500" />
              Encrypted Mempool Calls &amp; Decisions
            </h2>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400 border border-violet-500/20">
              ETM Series
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete meeting records, key consensus decisions, highlights, and recordings from the Encrypted Mempool Working Group.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions or calls..."
            className="w-full rounded-xl border border-border bg-card px-9 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
      </div>

      {filteredCalls.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-8 text-center text-xs text-muted-foreground">
          No calls matched your search query.
        </div>
      ) : (
        <ol className="relative ml-2 space-y-4 border-l-2 border-border/80 pl-6">
          {filteredCalls.map((c) => (
            <CallCard key={c.call_id} call={c} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CallCard({ call }: { call: Call }) {
  const tldr = call.tldr as Tldr;
  const num = call.call_number ?? call.call_id;
  const title = tldr?.meeting || call.display_name || `Encrypt The Mempool #${num}`;
  const decisions = (tldr?.decisions ?? []).map((d) => d?.decision).filter(Boolean) as string[];
  const highlightGroups = parseHighlights(tldr?.highlights);
  const actions = parseActionItems(tldr?.action_items).slice(0, 5);

  return (
    <li className="relative group">
      <span className="absolute -left-[31px] top-3 h-3.5 w-3.5 rounded-full bg-violet-500 ring-4 ring-background transition-transform group-hover:scale-125" aria-hidden />
      <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-4 transition-all duration-200 hover:border-violet-500/40 hover:bg-card/90">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-violet-500" />
              {formatDate(call.occurred_on)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {call.video_url && (
              <a
                href={call.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-violet-500/40 hover:text-violet-500 transition-colors"
              >
                <Play className="h-3.5 w-3.5 text-violet-500" />
                Watch Recording
              </a>
            )}
            <Link
              href={`/calls/etm/${num}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              Full Summary &amp; Transcript
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {decisions.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
              Key Consensus Decisions
            </p>
            <ul className="space-y-1.5">
              {decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {highlightGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meeting Highlights</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {highlightGroups.map((g, gi) => (
                <div key={gi} className="rounded-xl border border-border/80 bg-background/50 p-3">
                  {g.topic && <p className="text-xs font-semibold text-foreground mb-1.5">{g.topic}</p>}
                  <ul className="space-y-1">
                    {g.items.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-500" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Action Items
            </p>
            <ul className="space-y-1">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}
