'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';
import { SectionHead } from '@/components/ledger/section-head';
import { LedgerBadge } from '@/components/ledger/badge';
import { callSeriesShort } from '@/data/call-series';
import { isExcludedEditor } from '@/data/eip-contributor-roles';
import { cn } from '@/lib/utils';

type WeeklyData = Awaited<ReturnType<typeof client.dashboard.getWeeklyRecap>>;

type RecapFilter = 'all' | 'new_proposals' | 'status_changes' | 'merged_prs' | 'editor_activity' | 'calls_devnets' | 'last_call';

interface WeeklyRecapSectionProps {
  sectionTitleClass?: string;
  sectionSubtitleClass?: string;
}

function formatDate(isoString?: string | null) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(isoString?: string | null) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getProposalPath(category: string | null, number: number) {
  const cat = category?.toLowerCase();
  const folder = cat === 'erc' ? 'erc' : cat === 'rip' ? 'rip' : 'eip';
  return `/${folder}/${number}`;
}

function normalizeRepoSegment(repoName?: string | null): string {
  if (!repoName) return 'eips';
  let x = repoName.toLowerCase();
  if (x.includes('/')) {
    const parts = x.split('/');
    x = parts[parts.length - 1];
  }
  if (x === 'erc' || x === 'ercs') return 'ercs';
  if (x === 'rip' || x === 'rips') return 'rips';
  return 'eips';
}

function getAvatarUrl(actor?: string | null) {
  if (!actor || actor === 'system') return 'https://github.com/ethereum.png';
  const clean = actor.replace(/^@/, '').trim();
  return `https://github.com/${clean}.png`;
}

function extractTldrSummary(tldr: unknown): string {
  if (!tldr) return '';
  if (typeof tldr === 'string') return tldr;
  if (typeof tldr === 'object' && tldr !== null) {
    const obj = tldr as Record<string, unknown>;
    if (typeof obj.summary === 'string') return obj.summary;
    if (typeof obj.overview === 'string') return obj.overview;
    if (typeof obj.tldr === 'string') return obj.tldr;
    if (typeof obj.description === 'string') return obj.description;
    if (typeof obj.text === 'string') return obj.text;
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val.length > 5) return val;
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') return val[0];
    }
  }
  return '';
}

export function WeeklyRecapSection({ sectionTitleClass, sectionSubtitleClass }: WeeklyRecapSectionProps) {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<RecapFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);

  const INITIAL_LIMIT = 6;

  const fetchRecap = async () => {
    setLoading(true);
    try {
      const res = await client.dashboard.getWeeklyRecap({ days: 7 });
      setData(res);
    } catch (err) {
      console.error('Failed to load public weekly recap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecap();
  }, []);

  // Combine items for rendering
  const items = React.useMemo(() => {
    if (!data) return [];
    const list: Array<{
      id: string;
      kind: 'new_proposal' | 'status_change' | 'merged_pr' | 'editor_activity' | 'call' | 'devnet' | 'last_call';
      title: string;
      subtitle?: string;
      actor?: string | null;
      badgeText: string;
      badgeVariant?: string;
      dateIso: string | null;
      href: string;
      externalHref?: string;
      details?: React.ReactNode;
    }> = [];

    // New proposals
    data.newProposals.forEach((p) => {
      list.push({
        id: `new-${p.number}`,
        kind: 'new_proposal',
        title: `${p.category || 'EIP'}-${p.number}: ${p.title}`,
        subtitle: `Newly proposed ${p.category || 'EIP'} standard`,
        badgeText: p.status,
        badgeVariant: 'emerald',
        dateIso: p.createdAt,
        href: getProposalPath(p.category, p.number),
      });
    });

    // Status changes
    data.statusChanges.forEach((sc) => {
      list.push({
        id: `sc-${sc.number}-${sc.to}`,
        kind: 'status_change',
        title: `${sc.category || 'EIP'}-${sc.number}: ${sc.title}`,
        subtitle: `Status transition from ${sc.from || 'Draft'} to ${sc.to}`,
        badgeText: `${sc.from || 'Draft'} ➔ ${sc.to}`,
        badgeVariant: 'amber',
        dateIso: sc.changedAt,
        href: getProposalPath(sc.category, sc.number),
      });
    });

    // Merged PRs
    data.mergedPRs.forEach((pr) => {
      const repoPath = normalizeRepoSegment(pr.repoName);
      list.push({
        id: `pr-${pr.repoName}-${pr.number}`,
        kind: 'merged_pr',
        title: `PR #${pr.number}: ${pr.title}`,
        subtitle: `Merged by @${pr.author} in ${pr.repoName}`,
        actor: pr.author,
        badgeText: 'Merged PR',
        badgeVariant: 'sky',
        dateIso: pr.mergedAt,
        href: `/pr/${repoPath}/${pr.number}`,
        externalHref: pr.repoName ? `https://github.com/${pr.repoName}/pull/${pr.number}` : undefined,
      });
    });

    // Editor Actions
    if (data.editorActions) {
      data.editorActions
        .filter((ea) => !isExcludedEditor(ea.editor))
        .forEach((ea) => {
          const repoPath = normalizeRepoSegment(ea.repoName);
          list.push({
            id: `editor-${ea.repoName}-${ea.number}-${ea.editor}-${ea.actedAt}`,
            kind: 'editor_activity',
            title: `PR #${ea.number}: ${ea.title || 'Editor Activity'}`,
            subtitle: `Editor @${ea.editor} (${ea.eventType}) in ${ea.repoName}`,
            actor: ea.editor,
            badgeText: `Editor ${ea.eventType}`,
            badgeVariant: 'indigo',
            dateIso: ea.actedAt,
            href: `/pr/${repoPath}/${ea.number}`,
            externalHref: ea.eventUrl || undefined,
          });
        });
    }

    // Recent calls
    data.recentCalls.forEach((c) => {
      const shortName = callSeriesShort(c.series);
      const callTitle = c.displayName || `${shortName} #${c.number ?? ''}`;
      const summaryText = extractTldrSummary(c.tldr);
      list.push({
        id: `call-${c.series}-${c.number}`,
        kind: 'call',
        title: callTitle,
        subtitle: summaryText || 'Core Developer Meeting',
        badgeText: `${shortName} Call`,
        badgeVariant: 'purple',
        dateIso: c.occurredOn,
        href: `/upgrade/calls/${c.series.toLowerCase()}/${c.number || ''}`,
        details: c.keyDecisions && Array.isArray(c.keyDecisions) ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Key Decisions:</span>
            <ul className="list-disc pl-4 space-y-0.5">
              {(c.keyDecisions as string[]).map((dec, i) => (
                <li key={i}>{dec}</li>
              ))}
            </ul>
          </div>
        ) : undefined,
      });
    });

    // Devnets (exclude BAL devnets as requested)
    (data.devnets || [])
      .filter((d) => {
        const series = (d.series || '').toLowerCase();
        const title = (d.title || '').toLowerCase();
        const id = (d.id || '').toLowerCase();
        return !series.includes('bal') && !title.includes('bal') && !id.includes('bal');
      })
      .forEach((d) => {
        list.push({
          id: `devnet-${d.id}`,
          kind: 'devnet',
          title: `${d.series.toUpperCase()} Devnet ${d.number}: ${d.title}`,
          subtitle: d.active ? 'Active Devnet progression' : 'Closed Devnet',
          badgeText: d.active ? 'Active Devnet' : 'Closed Devnet',
          badgeVariant: d.active ? 'emerald' : 'slate',
          dateIso: d.scrapedAt,
          href: `/upgrade/devnets/${d.id}`,
        });
      });

    // Last Call EIPs
    data.lastCallEIPs.forEach((lc) => {
      list.push({
        id: `lastcall-${lc.number}`,
        kind: 'last_call',
        title: `EIP-${lc.number}: ${lc.title}`,
        subtitle: `Review Deadline: ${lc.deadline || 'Immediate'}`,
        badgeText: 'Last Call',
        badgeVariant: 'rose',
        dateIso: null,
        href: `/eip/${lc.number}`,
      });
    });

    // Sort by date descending
    list.sort((a, b) => {
      if (!a.dateIso) return 1;
      if (!b.dateIso) return -1;
      return new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime();
    });

    return list;
  }, [data]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'new_proposals') return items.filter((i) => i.kind === 'new_proposal');
    if (filter === 'status_changes') return items.filter((i) => i.kind === 'status_change');
    if (filter === 'merged_prs') return items.filter((i) => i.kind === 'merged_pr');
    if (filter === 'editor_activity') return items.filter((i) => i.kind === 'editor_activity');
    if (filter === 'calls_devnets') return items.filter((i) => i.kind === 'call' || i.kind === 'devnet');
    if (filter === 'last_call') return items.filter((i) => i.kind === 'last_call');
    return items;
  }, [items, filter]);

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, INITIAL_LIMIT);
  const hasMore = filteredItems.length > INITIAL_LIMIT;

  const totalNew = data?.newProposals.length ?? 0;
  const totalChanges = data?.statusChanges.length ?? 0;
  const totalPRs = data?.mergedPRs.length ?? 0;
  const totalEditorActions = (data?.editorActions ?? []).filter(
    (ea) => !isExcludedEditor(ea.editor)
  ).length;
  const filteredDevnetsCount = (data?.devnets || []).filter((d) => {
    const series = (d.series || '').toLowerCase();
    const title = (d.title || '').toLowerCase();
    const id = (d.id || '').toLowerCase();
    return !series.includes('bal') && !title.includes('bal') && !id.includes('bal');
  }).length;
  const totalCalls = (data?.recentCalls.length ?? 0) + filteredDevnetsCount;

  return (
    <section className="mb-10 w-full" id="weekly-recap">
      <SectionHead
        index="07"
        eyebrow="Audit feed & recap"
        title="Weekly Standards Recap"
        description="Verifiable, real-time audit feed of new EIP proposals, status transitions, merged PRs, editor reviews, and ACD call decisions."
        action={
          <Link
            href="/recap"
            className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:border-[var(--ink)] cursor-pointer"
          >
            <span>Full Feed</span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] pb-3">
        {(
          [
            { id: 'all', label: 'All Updates', count: null },
            { id: 'new_proposals', label: 'New', count: totalNew },
            { id: 'status_changes', label: 'Status Changes', count: totalChanges },
            { id: 'merged_prs', label: 'Merged PRs', count: totalPRs },
            { id: 'editor_activity', label: 'Editor Activity', count: totalEditorActions },
            { id: 'calls_devnets', label: 'ACD & Devnets', count: totalCalls },
            { id: 'last_call', label: 'Last Call', count: data?.lastCallEIPs.length ?? 0 },
          ] as const
        ).map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as RecapFilter)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-sans font-medium transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--ink-muted)] hover:text-[var(--ink)]'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums',
                    isActive ? 'text-[var(--paper)] opacity-85' : 'text-[var(--ink-faint)]'
                  )}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="space-y-2 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="card px-4 py-8 text-center">
          <p className="text-sm text-[var(--ink-muted)]">No standards activity found in the selected timeframe.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="tile overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex flex-1 items-center gap-3 cursor-pointer min-w-0"
                  >
                    {item.actor ? (
                      <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border)]" title={`@${item.actor}`}>
                        <img src={getAvatarUrl(item.actor)} alt={item.actor} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <LedgerBadge token={item.badgeText} />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.actor && (
                          <LedgerBadge token={item.badgeText} />
                        )}
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                      </div>
                      {item.subtitle && (
                        <p className="truncate text-xs text-[var(--ink-muted)] mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.dateIso && (
                      <span className="text-xs text-[var(--ink-faint)] font-mono hidden sm:inline tabular-nums">
                        {formatDate(item.dateIso)} ({timeAgo(item.dateIso)})
                      </span>
                    )}

                    <Link
                      href={item.href}
                      className="text-xs font-sans font-semibold text-[var(--brand-strong)] hover:underline inline-flex items-center gap-1"
                    >
                      [Check]
                    </Link>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
                    >
                      <div className="space-y-2 text-xs text-[var(--ink-muted)]">
                        <p className="text-[var(--ink)] font-medium">{item.title}</p>
                        {item.subtitle && <p>{item.subtitle}</p>}
                        {item.details}

                        <div className="flex items-center gap-3 pt-2">
                          <Link
                            href={item.href}
                            className="btn btn-outline h-7 px-2.5 text-xs font-sans font-medium inline-flex items-center gap-1.5"
                          >
                            <span>View Observability Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          {item.externalHref && (
                            <a
                              href={item.externalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline h-7 px-2.5 text-xs font-sans font-medium inline-flex items-center gap-1.5"
                            >
                              <span>Verify on GitHub</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="btn btn-outline h-8 px-6 text-xs font-sans font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Show {filteredItems.length - INITIAL_LIMIT} More Updates
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
