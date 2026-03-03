'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/header';
import { client } from '@/lib/orpc';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileCode2,
  GitCommitHorizontal,
  Loader2,
  XCircle,
} from 'lucide-react';

type PRDetail = Awaited<ReturnType<typeof client.analytics.getPRDetail>>;
type ConversationFilter = 'all' | 'reviews' | 'comments';

function normalizeRepo(input: string): 'eips' | 'ercs' | 'rips' | null {
  const x = (input || '').toLowerCase();
  if (x === 'eips' || x === 'eip') return 'eips';
  if (x === 'ercs' || x === 'erc') return 'ercs';
  if (x === 'rips' || x === 'rip') return 'rips';
  return null;
}

function statusTone(state?: string | null) {
  const s = (state || '').toLowerCase();
  if (s === 'open') return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (s === 'merged') return 'border-primary/40 bg-primary/10 text-primary';
  return 'border-slate-300/70 bg-slate-500/10 text-slate-700 dark:text-slate-300';
}

function formatDate(input?: string | null) {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function eventTone(kind: string) {
  const k = kind.toLowerCase();
  if (k === 'reviewed') return 'text-primary';
  if (k.includes('comment')) return 'text-amber-600 dark:text-amber-300';
  return 'text-slate-700 dark:text-slate-300';
}

function emitPRDetailEvent(name: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { dataLayer?: Array<Record<string, unknown>>; plausible?: (eventName: string, meta?: { props?: Record<string, unknown> }) => void };
  window.dispatchEvent(new CustomEvent('analytics:track', { detail: { name, ...payload } }));
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...payload });
  if (typeof w.plausible === 'function') w.plausible(name, { props: payload });
}

export default function PRDetailPage() {
  const params = useParams();
  const repoParam = normalizeRepo(String(params.repo || ''));
  const numberParam = Number(params.number);

  const [data, setData] = useState<PRDetail>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);

  const sectionLinks = useMemo(
    () => [
      { id: 'conversation', label: 'Conversation' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'files', label: 'Files' },
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
        const res = await client.analytics.getPRDetail({ repo: repoParam, number: numberParam });
        setData(res);
      } catch (err) {
        console.error('Failed to load PR detail:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [repoParam, numberParam]);

  useEffect(() => {
    if (!loading && data?.pr && repoParam) {
      emitPRDetailEvent('pr_detail_viewed', {
        repo: repoParam,
        number: numberParam,
        referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
      });
    }
  }, [loading, data, repoParam, numberParam]);

  const unresolvedSupported = useMemo(
    () => (data?.conversation ?? []).some((item) => item.unresolved !== null),
    [data]
  );

  const conversation = useMemo(() => {
    let rows = data?.conversation ?? [];
    if (filter === 'reviews') rows = rows.filter((r) => r.kind === 'reviewed');
    else if (filter === 'comments') rows = rows.filter((r) => r.kind.includes('comment'));

    if (unresolvedSupported && onlyUnresolved) {
      rows = rows.filter((r) => r.unresolved === true);
    }
    return rows;
  }, [data, filter, onlyUnresolved, unresolvedSupported]);

  const jumpToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
    emitPRDetailEvent('pr_detail_jump_section', { section: id });
  }, []);

  const copyLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      emitPRDetailEvent('pr_detail_copy_link_clicked', { repo: repoParam, number: numberParam });
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  }, [repoParam, numberParam]);

  if (!repoParam || !Number.isFinite(numberParam)) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <p className="text-sm text-muted-foreground">Invalid PR route. Use `/pr/eips|ercs|rips/&lt;number&gt;`.</p>
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

  if (!data?.pr) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <p className="text-sm text-muted-foreground">
            PR not found in index for `{repoParam}#{numberParam}`. Try opening on{' '}
            <a
              className="text-primary hover:underline"
              href={`https://github.com/${repoParam === 'ercs' ? 'ethereum/ERCs' : repoParam === 'rips' ? 'ethereum/RIPs' : 'ethereum/EIPs'}/pull/${numberParam}`}
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

  const { pr, governance, checks, relatedProposals, timeline } = data;
  const blocker = governance.blockers[0] || 'No active blockers detected';

  return (
    <div className="w-full px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <PageHeader
          sectionId="pr-detail"
          indicator={{ icon: 'activity', label: `${pr.repo.toUpperCase()} PR`, pulse: checks.pending > 0 }}
          title={`PR #${pr.number} — ${pr.title || 'Untitled pull request'}`}
          description={`Blocked by: ${blocker}`}
        />

        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">{pr.repoName}</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(pr.state)}`}>{(pr.state || 'unknown').toUpperCase()}</span>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">{governance.stage.replaceAll('_', ' ')}</span>
          <a
            href={pr.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70"
            onClick={() => emitPRDetailEvent('pr_detail_open_github_clicked', { repo: repoParam, number: numberParam, target: 'pr' })}
          >
            Open on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70"
          >
            Copy link <Copy className="h-3.5 w-3.5" />
          </button>
          <a href={pr.filesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
            Files changed <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a href={pr.commitsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
            Commits <GitCommitHorizontal className="h-3.5 w-3.5" />
          </a>
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
            <section id="conversation" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Conversation</h2>
                <div className="flex items-center gap-2">
                  {unresolvedSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !onlyUnresolved;
                        setOnlyUnresolved(next);
                        emitPRDetailEvent('pr_detail_filter_changed', {
                          repo: repoParam,
                          number: numberParam,
                          filter,
                          unresolvedOnly: next,
                        });
                      }}
                      className={`rounded-md border px-2 py-1 text-xs ${onlyUnresolved ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:text-foreground'}`}
                    >
                      Unresolved only
                    </button>
                  )}
                  <div className="inline-flex rounded-md border border-border bg-muted p-0.5 text-xs">
                    {(['all', 'reviews', 'comments'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setFilter(opt);
                          emitPRDetailEvent('pr_detail_filter_changed', {
                            repo: repoParam,
                            number: numberParam,
                            filter: opt,
                            unresolvedOnly: onlyUnresolved,
                          });
                        }}
                        className={`rounded px-2 py-1 ${filter === opt ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {conversation.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversation entries in index for current filters.</p>
                ) : (
                  conversation.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-background/70 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={`font-medium ${eventTone(item.kind)}`}>{item.actor}</span>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5">{item.kind.replaceAll('_', ' ')}</span>
                        {item.reviewState && <span className="rounded-full border border-border bg-muted px-2 py-0.5">{item.reviewState}</span>}
                        {item.unresolved === true && <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">Unresolved</span>}
                        {item.unresolved === false && <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">Resolved</span>}
                        <span>{formatDate(item.createdAt)}</span>
                        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          Permalink <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {item.body ? (
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{item.body}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No body captured in index.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="timeline" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold text-foreground">Timeline</h2>
              <div className="space-y-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timeline events found.</p>
                ) : (
                  timeline.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 rounded-lg border border-border bg-background/70 p-2.5">
                      <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{e.actor}</span>
                          <span>{formatDate(e.createdAt)}</span>
                          {e.commitSha && <span className="font-mono">{e.commitSha.slice(0, 8)}</span>}
                        </div>
                        <p className="truncate text-sm text-foreground/90">{e.summary}</p>
                      </div>
                      <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="files" className="scroll-mt-28 rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold text-foreground">Files & Changes</h2>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-background/70 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Commits</p>
                  <p className="text-lg font-semibold">{pr.commits}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Files</p>
                  <p className="text-lg font-semibold">{pr.files}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Comments</p>
                  <p className="text-lg font-semibold">{pr.comments}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/70 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviews</p>
                  <p className="text-lg font-semibold">{pr.reviews}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={pr.filesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                  <FileCode2 className="h-3.5 w-3.5" /> Open Files Diff
                </a>
                <a href={pr.commitsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                  <GitCommitHorizontal className="h-3.5 w-3.5" /> Open Commit List
                </a>
              </div>
            </section>
            </main>

            <aside className="space-y-4 xl:sticky xl:top-28">
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">PR Metadata</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div>Author: <span className="text-foreground">{pr.author || 'Unknown'}</span></div>
                <div>Created: <span className="text-foreground">{formatDate(pr.createdAt)}</span></div>
                <div>Updated: <span className="text-foreground">{formatDate(pr.updatedAt)}</span></div>
                <div>Merged: <span className="text-foreground">{formatDate(pr.mergedAt)}</span></div>
                <div>State: <span className="text-foreground">{pr.state || 'Unknown'}</span></div>
                <div className="pt-1">
                  <p className="mb-1 text-xs uppercase tracking-wide">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {pr.labels.length ? pr.labels.map((l) => (
                      <span key={l} className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground">{l}</span>
                    )) : <span className="text-xs">None</span>}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Governance State</h3>
              <div className="space-y-2 text-sm">
                <div className="rounded-md border border-border bg-background/70 px-2 py-1.5 text-xs text-muted-foreground">
                  Stage: <span className="font-medium text-foreground">{governance.stage.replaceAll('_', ' ')}</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">{governance.checklist.editorApprovalMet ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />} Editor approval</li>
                  <li className="flex items-center gap-2">{governance.checklist.ciGreenMet ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />} CI green</li>
                  <li className="flex items-center gap-2">{governance.checklist.requiredReviewsMet ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />} Required reviews</li>
                  <li className="flex items-center gap-2">{governance.checklist.templateComplianceMet ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-amber-500" />} Template compliance</li>
                </ul>
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground">Next actions</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {governance.nextActions.map((a, i) => <li key={i}>• {a}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Checks</h3>
              <div className="mb-2 grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="rounded-md border border-border bg-background/70 px-1 py-1"><p className="text-muted-foreground">Total</p><p className="font-semibold">{checks.total}</p></div>
                <div className="rounded-md border border-border bg-background/70 px-1 py-1"><p className="text-muted-foreground">Pass</p><p className="font-semibold">{checks.passed}</p></div>
                <div className="rounded-md border border-border bg-background/70 px-1 py-1"><p className="text-muted-foreground">Fail</p><p className="font-semibold">{checks.failed}</p></div>
                <div className="rounded-md border border-border bg-background/70 px-1 py-1"><p className="text-muted-foreground">Pending</p><p className="font-semibold">{checks.pending}</p></div>
              </div>
              <div className="space-y-1.5">
                {(checks.failedChecks.length ? checks.failedChecks : checks.items.slice(0, 5)).map((c) => (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => emitPRDetailEvent('pr_detail_check_expanded', { repo: repoParam, number: numberParam, checkName: c.name })}
                    className="flex items-center justify-between rounded-md border border-border bg-background/70 px-2 py-1 text-xs hover:bg-muted/50"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">{c.status}</span>
                  </a>
                ))}
                {!checks.items.length && <p className="text-xs text-muted-foreground">No check data indexed.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Related Proposals</h3>
              <div className="space-y-1.5">
                {relatedProposals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No proposals linked.</p>
                ) : relatedProposals.map((p) => (
                  <Link
                    key={`${p.kind}-${p.number}`}
                    href={p.url}
                    onClick={() => emitPRDetailEvent('pr_detail_related_proposal_clicked', {
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
                  </Link>
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
