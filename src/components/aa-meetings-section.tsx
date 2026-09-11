'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, ChevronDown, ListChecks, Play, ArrowUpRight } from 'lucide-react';
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

const PREVIEW_COUNT = 2;

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

/** Native Account Abstraction breakout meetings, rich cards with a show-more. */
export function AaMeetingsSection() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.calls
      .listRecentCalls({ series: 'aa', limit: 50 })
      .then((rows) => { if (!cancelled) setCalls(rows); })
      .catch(() => { if (!cancelled) setCalls([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => (showAll ? calls : calls.slice(0, PREVIEW_COUNT)),
    [calls, showAll],
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 py-12">
        <InlineBrandLoader size="sm" label="Loading meetings…" />
      </div>
    );
  }
  if (calls.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          <ListChecks className="h-5 w-5 text-primary" />
          Meetings &amp; Consensus Decisions
        </h2>
        <Link href="/calls?series=aa" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          All AA Calls <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="ml-1 space-y-3 border-l border-border pl-6">
        {visible.map((c) => (
          <MeetingCard key={c.call_id} call={c} />
        ))}
      </ul>

      {calls.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="ml-7 inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40"
        >
          {showAll ? 'Show fewer' : `Show ${calls.length - PREVIEW_COUNT} more`}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
        </button>
      )}
    </section>
  );
}

function MeetingCard({ call }: { call: Call }) {
  const tldr = call.tldr as Tldr;
  const num = call.call_number ?? call.call_id;
  const title = tldr?.meeting || call.display_name || `Native Account Abstraction #${num}`;
  const decisions = (tldr?.decisions ?? []).map((d) => d?.decision).filter(Boolean) as string[];
  const highlightGroups = parseHighlights(tldr?.highlights);
  const actions = parseActionItems(tldr?.action_items).slice(0, 5);

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
              href={`/calls/aa/${num}`}
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
                  {g.topic && <p className="text-[11px] font-semibold text-foreground/80">{g.topic}</p>}
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
