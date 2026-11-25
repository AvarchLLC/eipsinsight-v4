'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { LedgerBadge } from '@/components/ledger/badge';
import { SectionHead } from '@/components/ledger/section-head';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { toast } from 'sonner';

type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type SortBy = 'number' | 'title' | 'status' | 'type' | 'category' | 'updated_at' | 'days_in_status';
type SortDir = 'asc' | 'desc';

interface TableRow {
  repo: string;
  number: number;
  title: string | null;
  author: string | null;
  status: string;
  type: string | null;
  category: string | null;
  createdAt: string | null;
  updatedAt: string;
  daysInStatus: number;
  linkedPRs: number;
}

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All Repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const STATUS_OPTIONS = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];
const CATEGORY_OPTIONS = ['Core', 'Networking', 'Interface', 'ERC', 'Meta', 'Informational', 'RIP'];
const TYPE_OPTIONS = ['Standards Track', 'Meta', 'Informational'];

function repoToSlug(repo: string): string {
  const lower = repo.toLowerCase();
  if (lower.includes('erc')) return 'ercs';
  if (lower.includes('rip')) return 'rips';
  return 'eips';
}

function repoPrefix(repo: string): string {
  const lower = repo.toLowerCase();
  if (lower.includes('erc')) return 'ERC';
  if (lower.includes('rip')) return 'RIP';
  return 'EIP';
}

export function ExploreProposalsTab() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRepo = (searchParams.get('repo') as RepoFilter) || 'all';
  const initialStatus = searchParams.get('status') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialType = searchParams.get('type') || '';
  const initialSearch = searchParams.get('q') || '';
  const initialSortBy = (searchParams.get('sortBy') as SortBy) || 'number';
  const initialSortDir = (searchParams.get('sortDir') as SortDir) || 'desc';

  const [repo, setRepo] = useState<RepoFilter>(
    REPO_OPTIONS.some((o) => o.value === initialRepo) ? initialRepo : 'all',
  );
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const [kpis, setKpis] = useState<{ total: number; inReview: number; finalized: number; newThisYear: number } | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<TableRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Sync URL params cleanly
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'proposals');
    if (repo !== 'all') params.set('repo', repo);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (sortBy !== 'number') params.set('sortBy', sortBy);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }, [repo, statusFilter, categoryFilter, typeFilter, debouncedSearch, sortBy, sortDir, router]);

  // Fetch KPIs & status distribution for the current repo scope
  useEffect(() => {
    const repoArg = repo === 'all' ? undefined : repo;
    Promise.all([
      client.standards.getKPIs({ repo: repoArg }),
      client.standards.getStatusDistribution({ repo: repoArg }),
    ])
      .then(([kpiRes, distRes]) => {
        setKpis(kpiRes as { total: number; inReview: number; finalized: number; newThisYear: number });
        const map: Record<string, number> = {};
        (distRes as Array<{ status: string; count: number }>).forEach((d) => {
          map[d.status] = (map[d.status] || 0) + d.count;
        });
        setStatusCounts(map);
      })
      .catch((err) => console.error('Failed to load standards KPIs:', err));
  }, [repo]);

  // Fetch paginated table rows
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.standards
      .getTable({
        repo: repo === 'all' ? undefined : repo,
        status: statusFilter ? [statusFilter] : undefined,
        category: categoryFilter ? [categoryFilter] : undefined,
        type: typeFilter ? [typeFilter] : undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows as TableRow[]);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
      })
      .catch((err) => {
        console.error('Failed to load proposals table:', err);
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, statusFilter, categoryFilter, typeFilter, debouncedSearch, sortBy, sortDir, page]);

  const handleSort = useCallback(
    (col: SortBy) => {
      if (sortBy === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col);
        setSortDir(col === 'number' || col === 'updated_at' || col === 'days_in_status' ? 'desc' : 'asc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const resetFilters = useCallback(() => {
    setRepo('all');
    setStatusFilter('');
    setCategoryFilter('');
    setTypeFilter('');
    setSearchInput('');
    setDebouncedSearch('');
    setSortBy('number');
    setSortDir('desc');
    setPage(1);
  }, []);

  const hasActiveFilters = Boolean(
    repo !== 'all' || statusFilter || categoryFilter || typeFilter || debouncedSearch.trim(),
  );

  const handleExportCSV = useCallback(() => {
    if (!rows.length) {
      toast.error('No rows to export');
      return;
    }
    setExporting(true);
    try {
      const headers = ['Repo', 'Number', 'Title', 'Author', 'Status', 'Category', 'Type', 'Updated', 'Days in Status', 'Linked PRs'];
      const csvRows = rows.map((r) => [
        r.repo,
        String(r.number),
        r.title || '',
        r.author || '',
        r.status,
        r.category || '',
        r.type || '',
        r.updatedAt,
        String(r.daysInStatus),
        String(r.linkedPRs),
      ]);
      const csv = [
        headers.join(','),
        ...csvRows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposals-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported current page to CSV');
    } finally {
      setExporting(false);
    }
  }, [rows, page]);

  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 text-[var(--ink-faint)]" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-strong)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-strong)]" />
    );
  };

  const quickStatuses = useMemo(
    () => [
      { label: 'All', value: '', count: kpis?.total ?? total },
      { label: 'Draft', value: 'Draft', count: statusCounts.Draft ?? 0 },
      { label: 'Review', value: 'Review', count: statusCounts.Review ?? 0 },
      { label: 'Last Call', value: 'Last Call', count: statusCounts['Last Call'] ?? 0 },
      { label: 'Final', value: 'Final', count: statusCounts.Final ?? 0 },
    ],
    [kpis?.total, statusCounts, total],
  );

  return (
    <div className="space-y-8">
      {/* Ruled KPI Strip — every number directly filters the table below */}
      <div className="grid grid-cols-2 divide-y divide-[var(--border)] border-y border-[var(--border)] bg-[var(--surface)] sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {quickStatuses.map((item) => {
          const active = statusFilter === item.value;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setStatusFilter(item.value);
                setPage(1);
              }}
              className={cn(
                'flex flex-col items-start px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)]',
                active && 'bg-[var(--surface-2)]',
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="eyebrow">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />}
              </div>
              <span className="t-figure mt-2 text-2xl sm:text-3xl">{item.count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Sort Controls */}
      <section className="space-y-4">
        <SectionHead
          index="01"
          eyebrow="REGISTRY"
          title="All Proposals"
          action={
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="btn h-8 px-2.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={exporting || rows.length === 0}
                title="Export visible rows to CSV"
                aria-label="Export visible rows to CSV"
                className="btn btn-primary h-8 w-8 shrink-0 p-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
          {/* Repo chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {REPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-active={repo === opt.value}
                onClick={() => {
                  setRepo(opt.value);
                  setPage(1);
                }}
                className="chip"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-8 text-xs font-medium"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="h-8 text-xs font-medium"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by type"
            className="h-8 text-xs font-medium"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter #, title, author..."
              className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <InlineBrandLoader size="sm" label="Loading proposals..." />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--ink-muted)]">
              No proposals match your current filters.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('number')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Proposal <SortIcon col="number" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('title')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Title <SortIcon col="title" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Status <SortIcon col="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort('category')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Category <SortIcon col="category" />
                    </button>
                  </th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">
                    <button
                      type="button"
                      onClick={() => handleSort('type')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Type <SortIcon col="type" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('days_in_status')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Age <SortIcon col="days_in_status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('updated_at')}
                      className="inline-flex items-center gap-1 eyebrow hover:text-[var(--ink)]"
                    >
                      Updated <SortIcon col="updated_at" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => {
                  const slug = repoToSlug(r.repo);
                  const prefix = repoPrefix(r.repo);
                  return (
                    <tr key={`${r.repo}-${r.number}`} className="transition-colors hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/standards/${slug}/${r.number}`}
                          className="font-mono font-semibold text-[var(--brand-strong)] hover:underline"
                        >
                          {prefix}-{r.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-[320px]">
                        <Link
                          href={`/standards/${slug}/${r.number}`}
                          className="block truncate font-medium text-[var(--ink)] hover:text-[var(--brand-strong)]"
                        >
                          {r.title || 'Untitled'}
                        </Link>
                        {r.author && (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--ink-faint)]">
                            {r.author}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <LedgerBadge token={r.status} className="text-[10px]">
                          {r.status}
                        </LedgerBadge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.category ? (
                          <LedgerBadge token={r.category} className="text-[10px]">
                            {r.category}
                          </LedgerBadge>
                        ) : (
                          <span className="text-[var(--ink-faint)]">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 whitespace-nowrap font-mono text-[11px] text-[var(--ink-muted)] lg:table-cell">
                        {r.type || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums text-[var(--ink-muted)]">
                        {r.daysInStatus}d
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums text-[var(--ink-muted)]">
                        {r.updatedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--ink-muted)]">
          <span className="font-mono">
            Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
            <strong className="text-[var(--ink)]">{total.toLocaleString()}</strong> proposals
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn h-8 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="font-mono text-xs text-[var(--ink)]">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn h-8 px-2.5 text-xs disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
