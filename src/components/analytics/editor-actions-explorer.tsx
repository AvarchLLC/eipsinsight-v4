'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Search, SlidersHorizontal } from 'lucide-react';
import { client } from '@/lib/orpc';

type ActionType = 'review' | 'comment' | 'commit' | 'other';
type Row = {
  actor: string;
  actionType: string;
  eventType: string;
  prNumber: number;
  repoShort: string;
  title: string;
  state: string;
  category: string | null;
  actedAt: string;
  url: string | null;
};
type Resp = {
  rows: Row[];
  totalActions: number;
  distinctPrs: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const ACTION_LABEL: Record<string, string> = { review: 'Review', comment: 'Comment', commit: 'Commit', other: 'Other' };
const ACTION_CLASS: Record<string, string> = {
  review: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  comment: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  commit: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  other: 'border-border bg-muted/50 text-muted-foreground',
};
const STATE_CLASS: Record<string, string> = {
  open: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  merged: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  closed: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};
const CATEGORIES = ['core', 'erc', 'networking', 'interface', 'meta', 'informational'] as const;

const selectCls =
  'rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground focus:border-primary/50 focus:outline-none';

export function EditorActionsExplorer({
  repo,
  from,
  to,
  actors,
}: {
  repo?: 'eips' | 'ercs' | 'rips';
  from?: string;
  to?: string;
  actors: string[];
}) {
  const [actor, setActor] = useState<string>('');
  const [actionType, setActionType] = useState<ActionType | ''>('');
  const [category, setCategory] = useState<string>('');
  const [state, setState] = useState<'open' | 'closed' | 'merged' | ''>('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [repo, from, to, actor, actionType, category, state, sort, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.analytics
      .getEditorActionsExplorer({
        repo,
        from,
        to,
        actor: actor || undefined,
        actionType: actionType || undefined,
        category: (category || undefined) as never,
        state: state || undefined,
        search: search || undefined,
        sort,
        page,
        pageSize: 25,
      })
      .then((d) => {
        if (!cancelled) setData(d as Resp);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, from, to, actor, actionType, category, state, sort, search, page]);

  const hasFilters = useMemo(
    () => Boolean(actor || actionType || category || state || search),
    [actor, actionType, category, state, search],
  );

  return (
    <section id="editor-actions-explorer" className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">PR &amp; Action Explorer</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Query every indexed editor action like a GitHub search — scoped to the date range and repository selected above, with
          further filters below. Counts both total actions and distinct PRs.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/85 to-card/45 p-4 sm:p-5 backdrop-blur-md shadow-lg">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Editor">
            <option value="">All editors</option>
            {actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select className={selectCls} value={actionType} onChange={(e) => setActionType(e.target.value as ActionType | '')} aria-label="Action type">
            <option value="">All actions</option>
            <option value="review">Reviews</option>
            <option value="comment">Comments</option>
            <option value="commit">Commits</option>
            <option value="other">Other</option>
          </select>
          <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select className={selectCls} value={state} onChange={(e) => setState(e.target.value as 'open' | 'closed' | 'merged' | '')} aria-label="PR state">
            <option value="">Any state</option>
            <option value="open">Open</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>
          <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="PR # or title…"
              className="w-48 rounded-md border border-border bg-background/60 py-1 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <strong className="text-foreground tabular-nums">{(data?.totalActions ?? 0).toLocaleString()}</strong> actions
          </span>
          <span>
            <strong className="text-foreground tabular-nums">{(data?.distinctPrs ?? 0).toLocaleString()}</strong> distinct PRs
          </span>
          {hasFilters && <span className="text-primary">filtered</span>}
          {loading && <span className="animate-pulse">loading…</span>}
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">PR</th>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Editor</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {data && data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No actions match these filters.</td>
                </tr>
              )}
              {data?.rows.map((r, i) => (
                <tr key={`${r.prNumber}-${r.actor}-${r.eventType}-${r.actedAt}-${i}`} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 align-top">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono font-semibold text-primary hover:underline">
                        #{r.prNumber} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-mono font-semibold">#{r.prNumber}</span>
                    )}
                    <div className="mt-0.5 text-[9px] uppercase text-muted-foreground">{r.repoShort}</div>
                  </td>
                  <td className="px-3 py-2 align-top max-w-[320px]">
                    <span className="line-clamp-2 text-foreground">{r.title || '—'}</span>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap font-medium text-foreground">{r.actor}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ACTION_CLASS[r.actionType] ?? ACTION_CLASS.other}`}>
                      {ACTION_LABEL[r.actionType] ?? r.eventType}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top capitalize text-muted-foreground">{r.category ?? '—'}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATE_CLASS[r.state] ?? 'border-border bg-muted/50 text-muted-foreground'}`}>
                      {r.state}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap font-mono text-[10px] text-muted-foreground">{r.actedAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Page <strong className="text-foreground">{data.page}</strong> of {data.totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 font-semibold disabled:opacity-40 hover:border-primary/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1 font-semibold disabled:opacity-40 hover:border-primary/40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
