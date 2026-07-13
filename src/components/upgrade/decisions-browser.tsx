'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Github, Video, ArrowRightLeft, Server, Star, Circle, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { callDisplayName, callSeriesBadgeClass, callSeriesShort } from '@/data/call-series';
import { EipLinkedText, DecisionTypeMarker, type KeyDecision } from '@/components/upgrade/key-decisions';
import {
  SeriesFilter,
  matchesSeries,
  DEFAULT_SERIES_FILTER,
  type SeriesFilterValue,
} from '@/components/upgrade/series-filter';

export interface DecisionCall {
  series: string;
  call_id: string | number;
  call_number: string | null;
  display_name: string | null;
  occurred_on: string;
  video_url: string | null;
  issue_number: number | null;
  key_decisions: unknown;
}

type DecisionType = KeyDecision['type'];

function parseDecisions(payload: unknown): KeyDecision[] {
  if (Array.isArray(payload)) return payload as KeyDecision[];
  if (payload && typeof payload === 'object' && 'key_decisions' in payload) {
    const inner = (payload as { key_decisions?: KeyDecision[] }).key_decisions;
    return Array.isArray(inner) ? inner : [];
  }
  return [];
}

const TYPE_FILTERS: Array<{ key: DecisionType; label: string; icon: typeof Circle }> = [
  { key: 'stage_change', label: 'Stage changes', icon: ArrowRightLeft },
  { key: 'devnet_inclusion', label: 'Devnet inclusion', icon: Server },
  { key: 'headliner_selected', label: 'Headliners', icon: Star },
  { key: 'other', label: 'Other', icon: Circle },
];

/**
 * Client browser for protocol decisions: colorful per-series tabs plus
 * decision-type filters over the per-call decision groups.
 */
const DECISION_TYPES = ['stage_change', 'devnet_inclusion', 'headliner_selected', 'other'] as const;

export function DecisionsBrowser({ calls }: { calls: DecisionCall[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise from the URL so shared links restore the exact filter state.
  const [series, setSeries] = useState<SeriesFilterValue>(() => {
    const g = searchParams.get('series');
    if (g === 'acd') return { group: 'acd', acd: searchParams.get('acd') ?? 'all' };
    if (g === 'breakouts') return { group: 'breakouts', acd: 'all' };
    return DEFAULT_SERIES_FILTER;
  });
  const [type, setType] = useState<DecisionType | 'all'>(() => {
    const t = searchParams.get('type');
    return (DECISION_TYPES as readonly string[]).includes(t ?? '') ? (t as DecisionType) : 'all';
  });
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');

  // Reflect the current filters into the URL (shareable, back-button friendly).
  const syncUrl = (next: {
    series?: SeriesFilterValue;
    type?: DecisionType | 'all';
    search?: string;
  }) => {
    const s = next.series ?? series;
    const t = next.type ?? type;
    const q = (next.search ?? search).trim();
    const params = new URLSearchParams();
    if (s.group !== 'all') params.set('series', s.group);
    if (s.group === 'acd' && s.acd !== 'all') params.set('acd', s.acd);
    if (t && t !== 'all') params.set('type', t);
    if (q) params.set('q', q);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const changeSeries = (v: SeriesFilterValue) => {
    setSeries(v);
    syncUrl({ series: v });
  };
  const changeType = (t: DecisionType | 'all') => {
    setType(t);
    syncUrl({ type: t });
  };
  const changeSearch = (v: string) => {
    setSearch(v);
    syncUrl({ search: v });
  };

  // Pre-parse decisions once per call.
  const parsed = useMemo(
    () => calls.map((call) => ({ call, decisions: parseDecisions(call.key_decisions) })),
    [calls]
  );

  // Series counts (only calls that actually have decisions).
  const seriesCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const { call, decisions } of parsed) {
      if (decisions.length) c[call.series] = (c[call.series] ?? 0) + 1;
    }
    return c;
  }, [parsed]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parsed
      .filter(({ call }) => matchesSeries(call.series, series))
      .map(({ call, decisions }) => {
        let ds = type === 'all' ? decisions : decisions.filter((d) => (d.type ?? 'other') === type);
        if (q) {
          const callMatches = `${callDisplayName(call)} ${call.series}`.toLowerCase().includes(q);
          if (!callMatches) {
            ds = ds.filter(
              (d) =>
                (d.original_text ?? '').toLowerCase().includes(q) ||
                (d.eips ?? []).some((e) => String(e).includes(q) || `eip-${e}`.includes(q))
            );
          }
        }
        return { call, decisions: ds };
      })
      .filter(({ decisions }) => decisions.length > 0);
  }, [parsed, series, type, search]);

  const totalDecisions = useMemo(
    () => groups.reduce((sum, g) => sum + g.decisions.length, 0),
    [groups]
  );

  const chip = (selected: boolean, activeClass?: string) =>
    cn(
      'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all',
      selected
        ? activeClass ?? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
    );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="space-y-2.5">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search decisions, EIP #, or call…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Series</span>
          <SeriesFilter value={series} onChange={changeSeries} counts={seriesCounts} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</span>
          <button type="button" onClick={() => changeType('all')} className={chip(type === 'all')}>
            All
          </button>
          {TYPE_FILTERS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => changeType(key)} className={chip(type === key)}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats line */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{totalDecisions}</span> decision
        {totalDecisions === 1 ? '' : 's'} across{' '}
        <span className="font-medium text-foreground">{groups.length}</span> call
        {groups.length === 1 ? '' : 's'}
      </p>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No decisions match these filters.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map(({ call, decisions }) => (
            <section key={`${call.series}-${call.call_id}`}>
              {/* Meeting header */}
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center self-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    callSeriesBadgeClass(call.series)
                  )}
                >
                  {callSeriesShort(call.series)}
                </span>
                <h2 className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  <Link href={`/upgrade/calls/${call.series}/${call.call_number ?? call.call_id}`} className="hover:underline">
                    {callDisplayName(call)}
                  </Link>
                </h2>
                <span className="text-xs text-muted-foreground">{call.occurred_on}</span>
                <span className="ml-auto flex items-center gap-3">
                  <Link
                    href={`/upgrade/calls/${call.series}/${call.call_number ?? call.call_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Details</span>
                  </Link>
                  {call.issue_number && (
                    <a
                      href={`https://github.com/ethereum/pm/issues/${call.issue_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Agenda</span>
                    </a>
                  )}
                </span>
              </div>

              {/* Clean arrow-prefixed decision lines */}
              <ul className="space-y-2 border-l border-border/60 pl-4">
                {decisions.map((decision, index) => (
                  <li key={index} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-px shrink-0 text-muted-foreground/50">→</span>
                    <span className="min-w-0 flex-1 text-foreground/90">
                      {decision.type && decision.type !== 'other' && (
                        <span className="mr-1.5 inline-flex translate-y-[-1px] align-middle">
                          <DecisionTypeMarker decision={decision} />
                        </span>
                      )}
                      <EipLinkedText text={decision.original_text} />
                      {decision.timestamp && (
                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/60">
                          {decision.timestamp}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
