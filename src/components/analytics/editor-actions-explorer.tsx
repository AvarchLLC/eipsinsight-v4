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
  review: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  comment: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  commit: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  other: 'border-border bg-muted/50 text-muted-foreground',
};
const STATE_CLASS: Record<string, string> = {
  open: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  merged: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  closed: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
};
const CATEGORIES = ['core', 'erc', 'networking', 'interface', 'meta', 'informational'] as const;

const selectCls =
  'rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs text-foreground focus:border-emerald-500/50 focus:outline-none transition-colors cursor-pointer hover:bg-muted/40';

export function EditorActionsExplorer({
  repo,
  from,
  to,
  actors,
  selectedActor,
  onActorChange,
  hideHeader = false,
}: {
  repo?: 'eips' | 'ercs' | 'rips';
  from?: string;
  to?: string;
  actors: string[];
  selectedActor?: string;
  onActorChange?: (actor: string) => void;
  hideHeader?: boolean;
}) {
  const [actor, setActor] = useState<string>(selectedActor ?? '');
  const [actionType, setActionType] = useState<ActionType | ''>('');
  const [category, setCategory] = useState<string>('');
  const [state, setState] = useState<'open' | 'closed' | 'merged' | ''>('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync with selectedActor if passed from outside
  useEffect(() => {
    if (selectedActor !== undefined) {
      setActor(selectedActor);
    }
  }, [selectedActor]);

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
        pageSize: 10,
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
      {!hideHeader && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2.5">
              <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
              <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-foreground">
                PR &amp; Action Explorer
              </h2>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Filterable editorial reviews, comments &amp; commits
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-3xl">
            Query every indexed editor action like a GitHub search — scoped to the date range and repository selected above, with
            further filters below. Counts both total actions and distinct PRs.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5 shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              onActorChange?.(e.target.value);
            }}
            aria-label="Editor"
          >
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
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="PR # or title…"
              className="w-52 rounded-lg border border-border bg-card/80 py-1.5 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground tabular-nums">{(data?.totalActions ?? 0).toLocaleString()}</strong> actions
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground tabular-nums">{(data?.distinctPrs ?? 0).toLocaleString()}</strong> distinct PRs
          </span>
          {hasFilters && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  setActor('');
                  setActionType('');
                  setCategory('');
                  setState('');
                  setSearchInput('');
                  setSearch('');
                  onActorChange?.('');
                }}
                className="inline-flex items-center text-emerald-500 hover:underline cursor-pointer font-medium"
              >
                Reset filters
              </button>
            </>
          )}
          {loading && <span className="ml-2 animate-pulse text-muted-foreground">loading…</span>}
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 font-semibold">PR</th>
                <th className="px-3 py-2.5 font-semibold">Title</th>
                <th className="px-3 py-2.5 font-semibold">Editor</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">State</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data && data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No actions match these filters.</td>
                </tr>
              )}
              {data?.rows.map((r, i) => (
                <tr key={`${r.prNumber}-${r.actor}-${r.eventType}-${r.actedAt}-${i}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 align-top">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-500 hover:text-emerald-400 hover:underline">
                        #{r.prNumber} <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : (
                      <span className="font-mono font-semibold text-emerald-500">#{r.prNumber}</span>
                    )}
                    <div className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{r.repoShort}</div>
                  </td>
                  <td className="px-3 py-2.5 align-top max-w-[340px]">
                    <span className="line-clamp-2 text-foreground font-normal">{r.title || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap font-medium text-foreground">{r.actor}</td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${ACTION_CLASS[r.actionType] ?? ACTION_CLASS.other}`}>
                      {ACTION_LABEL[r.actionType] ?? r.eventType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top capitalize text-muted-foreground">{r.category ?? '—'}</td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${STATE_CLASS[r.state] ?? 'border-border bg-muted/50 text-muted-foreground'}`}>
                      {r.state}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap font-mono text-[11px] text-muted-foreground">{r.actedAt?.slice(0, 10)}</td>
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
