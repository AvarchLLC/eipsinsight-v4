'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/header';
import { client } from '@/lib/orpc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUpRight,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Loader2,
} from 'lucide-react';

type IssueDetail = Awaited<ReturnType<typeof client.analytics.getIssueDetail>>;
type FeedFilter = 'all' | 'comments' | 'labels' | 'editors' | 'mentions';
type TimelineMode = 'discussion' | 'events';

function normalizeRepo(input: string): 'eips' | 'ercs' | 'rips' | null {
  const x = (input || '').toLowerCase();
  if (x === 'eips' || x === 'eip') return 'eips';
  if (x === 'ercs' || x === 'erc') return 'ercs';
  if (x === 'rips' || x === 'rip') return 'rips';
  return null;
}

function formatDate(input?: string | null) {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function stateTone(state?: string | null) {
  const x = (state || '').toLowerCase();
  if (x === 'open') return 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (x === 'closed') return 'border-slate-300/60 bg-slate-500/10 text-slate-700 dark:text-slate-300';
  return 'border-border bg-muted text-muted-foreground';
}

function impactTone(type: string) {
  if (type === 'BLOCKING') return 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300';
  if (type === 'DECISION') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (type === 'EDITORIAL') return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300';
  if (type === 'DISCUSSION') return 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-border bg-muted text-muted-foreground';
}

function emitIssueDetailEvent(name: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { dataLayer?: Array<Record<string, unknown>>; plausible?: (eventName: string, meta?: { props?: Record<string, unknown> }) => void };
  window.dispatchEvent(new CustomEvent('analytics:track', { detail: { name, ...payload } }));
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...payload });
  if (typeof w.plausible === 'function') w.plausible(name, { props: payload });
}

export default function IssueDetailPage() {
  const params = useParams();
  const repoParam = normalizeRepo(String(params.repo || ''));
  const numberParam = Number(params.number);

  const [data, setData] = useState<IssueDetail>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('discussion');

  const sectionLinks = useMemo(
    () => [
      { id: 'issue-description', label: 'Description' },
      { id: 'issue-timeline', label: 'Timeline' },
      { id: 'issue-related', label: 'Related Proposals' },
    ],
    []
  );

  useEffect(() => {
    if (!repoParam || !Number.isFinite(numberParam)) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await client.analytics.getIssueDetail({ repo: repoParam, number: numberParam });
        setData(res);
      } catch (err) {
        console.error('Failed to load issue detail:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [repoParam, numberParam]);

  useEffect(() => {
    if (!loading && data?.issue && repoParam) {
      emitIssueDetailEvent('issue_detail_viewed', {
        repo: repoParam,
        number: numberParam,
        referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
      });
    }
  }, [loading, data, repoParam, numberParam]);

  const jumpToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const copyLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      emitIssueDetailEvent('issue_copy_link_clicked', { repo: repoParam, number: numberParam });
    } catch (err) {
      console.error('Failed to copy issue link', err);
    }
  }, [repoParam, numberParam]);

  const discussionFeed = useMemo(() => {
    if (!data) return [];
    const mentionsHandle = data.viewer?.handle?.toLowerCase();
    let rows = data.conversation;

    if (feedFilter === 'comments') {
      rows = rows.filter((r) => r.kind.includes('comment') || r.kind === 'edited');
    } else if (feedFilter === 'labels') {
      rows = rows.filter((r) => r.kind === 'labeled' || r.kind === 'unlabeled' || !!r.label);
    } else if (feedFilter === 'editors') {
      rows = rows.filter((r) => r.isEditorLike);
    } else if (feedFilter === 'mentions') {
      rows = mentionsHandle ? rows.filter((r) => r.mentions.includes(mentionsHandle)) : [];
    }

    return rows;
  }, [data, feedFilter]);

  const compactTimeline = useMemo(() => {
    if (!data) return [];
    const base = [...data.timeline];
    return base.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [data]);

  if (!repoParam || !Number.isFinite(numberParam)) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <p className="text-sm text-muted-foreground">Invalid issue route. Use `/issue/eips|ercs|rips/&lt;number&gt;`.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[360px] w-full max-w-[1320px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.issue) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <p className="text-sm text-muted-foreground">
            Issue not found in index for `{repoParam}#{numberParam}`. Try opening on{' '}
            <a
              className="text-primary hover:underline"
              href={`https://github.com/${repoParam === 'ercs' ? 'ethereum/ERCs' : repoParam === 'rips' ? 'ethereum/RIPs' : 'ethereum/EIPs'}/issues/${numberParam}`}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const { issue, metadata, governanceImpact, labelHistory, linkedPRs, relatedProposals } = data;
  const desc = issue.body || '';
  const descriptionCollapsed = !descExpanded && desc.length > 1200;
  const visibleDescription = descriptionCollapsed ? `${desc.slice(0, 1200)}\n\n…` : desc;
  const blockerSummary = governanceImpact.type === 'BLOCKING'
    ? governanceImpact.summary
    : relatedProposals.length > 0
      ? `Linked to ${relatedProposals[0].kind}-${relatedProposals[0].number} — ${governanceImpact.summary}`
      : governanceImpact.summary;

  return (
    <div className="w-full px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <PageHeader
          sectionId="issue-detail"
          indicator={{ icon: 'activity', label: `${issue.repo.toUpperCase()} ISSUE`, pulse: issue.state?.toLowerCase() === 'open' }}
          title={`Issue #${issue.number} — ${issue.title || 'Untitled issue'}`}
          description={blockerSummary}
        />

        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">{issue.repoName}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${stateTone(issue.state)}`}>{(issue.state || 'unknown').toUpperCase()}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${impactTone(governanceImpact.type)}`}>{governanceImpact.type}</span>
            {(issue.labels || []).slice(0, 3).map((label) => (
              <span key={label} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{label}</span>
            ))}
            {(issue.labels || []).length > 3 && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{(issue.labels || []).length - 3}</span>
            )}
            <a
              href={issue.githubUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => emitIssueDetailEvent('issue_linked_pr_clicked', { repo: repoParam, number: numberParam, target: 'github_issue' })}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70"
            >
              Open on GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
              Copy link <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="sticky top-16 z-30 mb-4 overflow-x-auto rounded-lg border border-border bg-background/90 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex min-w-max items-center gap-1">
              {sectionLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToSection(item.id)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.68fr)_minmax(320px,360px)]">
            <main className="space-y-4">
              <section id="issue-description" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">Issue Description</h2>
                  <span className="text-xs text-muted-foreground">by {issue.author || 'Unknown'} · {formatDate(issue.createdAt)}</span>
                </div>
                {visibleDescription ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                      {visibleDescription}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No description captured in index.</p>
                )}
                {desc.length > 1200 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((p) => !p)}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    {descExpanded ? 'Collapse description' : 'Expand full description'}
                  </button>
                )}
              </section>

              <section id="issue-timeline" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">Conversation Timeline</h2>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-border bg-muted p-0.5 text-xs">
                      {(['discussion', 'events'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTimelineMode(mode)}
                          className={`rounded px-2 py-1 ${timelineMode === mode ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    {timelineMode === 'discussion' && (
                      <div className="inline-flex rounded-md border border-border bg-muted p-0.5 text-xs">
                        {(['all', 'comments', 'labels', 'editors', 'mentions'] as const).map((opt) => {
                          const disabled = opt === 'mentions' && !data.viewer?.handle;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setFeedFilter(opt);
                                emitIssueDetailEvent('issue_filter_changed', {
                                  repo: repoParam,
                                  number: numberParam,
                                  filter: opt,
                                });
                              }}
                              className={`rounded px-2 py-1 ${feedFilter === opt ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {timelineMode === 'discussion' ? (
                  <div className="space-y-2">
                    {discussionFeed.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No discussion items for current filter.</p>
                    ) : (
                      discussionFeed.slice(0, 120).map((item) => (
                        <div key={item.id} className="rounded-lg border border-border bg-background/70 p-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{item.actor}</span>
                            {item.isEditorLike && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">editor/reviewer</span>}
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5">{item.kind.replaceAll('_', ' ')}</span>
                            <span>{formatDate(item.createdAt)}</span>
                            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              Permalink <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          {item.body ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body}</p> : <p className="text-sm text-muted-foreground">No body captured in index.</p>}
                        </div>
                      ))
                    )}
                    {discussionFeed.length > 120 && (
                      <p className="text-xs text-muted-foreground">Showing first 120 discussion records. Open on GitHub for full thread.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {compactTimeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No timeline events found.</p>
                    ) : (
                      compactTimeline.map((e) => (
                        <div key={e.id} className="flex items-start gap-2 rounded-lg border border-border bg-background/70 p-2.5">
                          <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{e.actor}</span>
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5">{e.type.replaceAll('_', ' ')}</span>
                              <span>{formatDate(e.createdAt)}</span>
                            </div>
                            <p className="text-sm text-foreground/90">{e.summary}</p>
                          </div>
                          <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            </main>

            <aside className="space-y-4 xl:sticky xl:top-28">
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Issue Metadata</h3>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div>Author: <span className="text-foreground">{issue.author || 'Unknown'}</span></div>
                  <div>Created: <span className="text-foreground">{formatDate(issue.createdAt)}</span></div>
                  <div>Updated: <span className="text-foreground">{formatDate(issue.updatedAt)}</span></div>
                  <div>Closed: <span className="text-foreground">{formatDate(issue.closedAt)}</span></div>
                  <div>Comments: <span className="text-foreground">{issue.comments}</span></div>
                  <div>Milestone: <span className="text-foreground">{metadata.milestone || '—'}</span></div>
                  <div>Assignees: <span className="text-foreground">{metadata.assignees.length ? metadata.assignees.join(', ') : '—'}</span></div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Label History</h3>
                  <button
                    type="button"
                    onClick={() => emitIssueDetailEvent('issue_label_history_opened', { repo: repoParam, number: numberParam })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                </div>
                {labelHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No label history events indexed.</p>
                ) : (
                  <div className="relative space-y-2 pl-3 before:absolute before:left-0 before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
                    {labelHistory.slice(-14).map((entry) => (
                      <div key={entry.id} className="relative rounded-md border border-border bg-background/70 px-2 py-1.5">
                        <span className="absolute -left-[17px] top-2 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-foreground">
                            <span className={`mr-1 rounded px-1.5 py-0.5 ${entry.action === 'added' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                              {entry.action}
                            </span>
                            {entry.label}
                          </span>
                          <span className="text-muted-foreground">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">by {entry.actor}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="issue-related" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Linked Proposals</h3>
                <div className="space-y-1.5">
                  {relatedProposals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No proposal references detected.</p>
                  ) : relatedProposals.map((p) => (
                    <Link
                      key={`${p.kind}-${p.number}`}
                      href={p.url}
                      onClick={() => emitIssueDetailEvent('issue_related_proposal_clicked', {
                        repo: repoParam,
                        number: numberParam,
                        type: p.kind,
                        id: p.number,
                      })}
                      className="block rounded-md border border-border bg-background/70 px-2 py-1.5 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{p.kind}-{p.number}</p>
                        <span className="text-[10px] text-muted-foreground">{p.status || 'Unknown'}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{p.title || 'Untitled proposal'}</p>
                      {p.upgrades.length > 0 && <p className="mt-0.5 truncate text-[10px] text-primary">Upgrades: {p.upgrades.join(', ')}</p>}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Governance Impact</h3>
                <div className={`mb-2 rounded-md border px-2 py-1.5 text-xs ${impactTone(governanceImpact.type)}`}>
                  {governanceImpact.type}
                </div>
                <p className="text-xs text-muted-foreground">{governanceImpact.summary}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {governanceImpact.signals.map((s, i) => (
                    <li key={`${s}-${i}`}>• {s}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Linked PRs</h3>
                <div className="space-y-1.5">
                  {linkedPRs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No linked PRs detected.</p>
                  ) : linkedPRs.map((pr) => (
                    <a
                      key={pr.number}
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => emitIssueDetailEvent('issue_linked_pr_clicked', { repo: repoParam, number: numberParam, prNumber: pr.number })}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/70 px-2 py-1.5 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">PR #{pr.number} · {pr.title || 'Untitled PR'}</p>
                        <p className="text-[10px] text-muted-foreground">{pr.relationship} · {pr.state || 'unknown'} · {formatDate(pr.updatedAt)}</p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
