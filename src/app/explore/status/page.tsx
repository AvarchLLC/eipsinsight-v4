'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Layers, ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';
import { StatusFilterBar } from './_components/status-filter-bar';
import { ViewToggle } from './_components/view-toggle';
import { StatusEIPTable } from './_components/status-eip-table';
import { StatusCardGrid } from './_components/status-card-grid';
import { StatusFlowGraph } from './_components/status-flow-graph';

interface EIP {
  id: number;
  number: number;
  kind: string;
  title: string;
  type: string | null;
  status: string;
  category: string | null;
  updatedAt: string | null;
  daysInStatus: number | null;
}

interface StatusFlow {
  status: string;
  count: number;
}

type SortOption = 'updated_desc' | 'updated_asc' | 'days_desc' | 'days_asc' | 'number_asc';

interface FacetCount {
  value: string;
  count: number;
}

function StatusPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial filters from URL
  const initialStatus = searchParams.get('status')?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || null;
  const initialCategories = searchParams.getAll('category');
  const initialTypes = searchParams.getAll('type');
  const initialSort = (searchParams.get('sort') as SortOption) || 'updated_desc';

  const [view, setView] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    return window.localStorage.getItem('explore-status-view') === 'grid' ? 'grid' : 'list';
  });
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatus);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [statuses, setStatuses] = useState<FacetCount[]>([]);
  const [categories, setCategories] = useState<FacetCount[]>([]);
  const [types, setTypes] = useState<FacetCount[]>([]);
  const [eips, setEips] = useState<EIP[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFlow, setStatusFlow] = useState<StatusFlow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [flowLoading, setFlowLoading] = useState(true);

  const pageSize = 20;

  // Fetch available statuses, categories, and types
  useEffect(() => {
    async function fetchFilters() {
      try {
        const [statusData, categoryData, typesData] = await Promise.all([
          client.explore.getStatusCounts({}),
          client.explore.getCategoryCounts({}),
          client.explore.getTypes({}),
        ]);
        setStatuses(statusData.map(s => ({ value: s.status, count: s.count })));
        setCategories(categoryData.map(c => ({ value: c.category, count: c.count })));
        setTypes(typesData.map(t => ({ value: t.type, count: t.count })));
      } catch (err) {
        console.error('Failed to fetch filters:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFilters();
  }, []);

  // Fetch status flow data
  useEffect(() => {
    async function fetchFlow() {
      setFlowLoading(true);
      try {
        const data = await client.explore.getStatusFlow({});
        setStatusFlow(data);
      } catch (err) {
        console.error('Failed to fetch status flow:', err);
      } finally {
        setFlowLoading(false);
      }
    }
    fetchFlow();
  }, []);

  // Fetch EIPs when filters change
  useEffect(() => {
    async function fetchEIPs() {
      setTableLoading(true);
      try {
        const data = await client.explore.getEIPsByStatus({
          status: selectedStatus || undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          sort: sortBy,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        setEips(data.items);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch EIPs:', err);
      } finally {
        setTableLoading(false);
      }
    }
    fetchEIPs();
  }, [selectedStatus, selectedCategories, selectedTypes, sortBy, page]);

  const updateUrl = (status: string | null, cats: string[], typs: string[], sort: SortOption) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status.toLowerCase().replace(/\s/g, '-'));
    cats.forEach(c => params.append('category', c));
    typs.forEach(t => params.append('type', t));
    if (sort !== 'updated_desc') params.set('sort', sort);
    const queryString = params.toString();
    router.push(`/explore/status${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
    updateUrl(status, selectedCategories, selectedTypes, sortBy);
  };

  const handleCategoriesChange = (cats: string[]) => {
    setSelectedCategories(cats);
    setPage(1);
    updateUrl(selectedStatus, cats, selectedTypes, sortBy);
  };

  const handleTypesChange = (typs: string[]) => {
    setSelectedTypes(typs);
    setPage(1);
    updateUrl(selectedStatus, selectedCategories, typs, sortBy);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setPage(1);
    updateUrl(selectedStatus, selectedCategories, selectedTypes, sort);
  };

  const clearAllFilters = () => {
    setSelectedStatus(null);
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSortBy('updated_desc');
    setPage(1);
    updateUrl(null, [], [], 'updated_desc');
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('explore-status-view', view);
    }
  }, [view]);

  const totalPages = Math.ceil(total / pageSize);
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  const largestStage = statusFlow.length
    ? statusFlow.reduce((max, item) => (item.count > max.count ? item : max), statusFlow[0])
    : null;
  const stalledCount = statusFlow.find((item) => item.status === 'Stagnant')?.count ?? 0;
  const medianDays =
    eips.length > 0
      ? Math.round(
          eips
            .map((item) => item.daysInStatus)
            .filter((value): value is number => value != null)
            .sort((a, b) => a - b)[Math.floor(eips.length / 2)] ?? 0
        )
      : 0;
  const insightLine = largestStage
    ? `Largest active stage is ${largestStage.status} (${largestStage.count.toLocaleString()}). ${stalledCount > 0 ? `${stalledCount.toLocaleString()} are stagnant.` : 'Pipeline has minimal stagnation.'}`
    : 'Status pipeline is loading.';

  const activeFilterChips = [
    selectedStatus ? { key: `status-${selectedStatus}`, label: `Status: ${selectedStatus}`, onRemove: () => handleStatusChange(null) } : null,
    ...selectedCategories.map((category) => ({
      key: `category-${category}`,
      label: `Category: ${category}`,
      onRemove: () => handleCategoriesChange(selectedCategories.filter((item) => item !== category)),
    })),
    ...selectedTypes.map((type) => ({
      key: `type-${type}`,
      label: `Type: ${type}`,
      onRemove: () => handleTypesChange(selectedTypes.filter((item) => item !== type)),
    })),
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  return (
    <div className="bg-background relative w-full min-h-screen">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(var(--persona-accent-rgb),0.1),_transparent_50%)]" />
      </div>

      <section className="relative w-full pt-6 pb-2">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-4",
              "text-sm text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="dec-title persona-title text-2xl font-semibold tracking-tight sm:text-3xl">
                Browse by Status
              </h1>
              <p className="text-sm text-muted-foreground">
                See what’s stuck, what’s moving, and what changed recently by status, type, and category.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-sm text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {insightLine}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Total active proposals: <span className="font-medium text-foreground">{statusFlow.reduce((acc, item) => acc + item.count, 0).toLocaleString()}</span>
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Largest bucket: <span className="font-medium text-foreground">{largestStage ? `${largestStage.status} (${largestStage.count.toLocaleString()})` : '—'}</span>
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Median days in status: <span className="font-medium text-foreground">{medianDays > 0 ? `${medianDays}d` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full py-4">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <StatusFlowGraph
            data={statusFlow}
            loading={flowLoading}
            selectedStatus={selectedStatus}
            onSelectStatus={handleStatusChange}
          />
        </div>
      </section>

      <section className="relative w-full py-4 pb-8">
        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-56 shrink-0">
              <div className="lg:sticky lg:top-20">
                <StatusFilterBar
                  statuses={statuses}
                  categories={categories}
                  types={types}
                  selectedStatus={selectedStatus}
                  selectedCategories={selectedCategories}
                  selectedTypes={selectedTypes}
                  onStatusChange={handleStatusChange}
                  onCategoriesChange={handleCategoriesChange}
                  onTypesChange={handleTypesChange}
                  onClearAll={clearAllFilters}
                />
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              {activeFilterChips.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15"
                    >
                      {chip.label}
                      <ChevronRight className="h-3 w-3 rotate-45" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </button>
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(event) => handleSortChange(event.target.value as SortOption)}
                    className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  >
                    <option value="updated_desc">Recently Updated</option>
                    <option value="updated_asc">Oldest Updated</option>
                    <option value="days_desc">Longest in Status</option>
                    <option value="days_asc">Shortest in Status</option>
                    <option value="number_asc">EIP Number</option>
                  </select>
                  <ViewToggle view={view} onViewChange={setView} />
                </div>
              </div>

              {view === 'list' ? (
                <StatusEIPTable
                  eips={eips}
                  total={total}
                  loading={tableLoading}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                />
              ) : (
                <>
                  <StatusCardGrid eips={eips} loading={tableLoading} />
                  {totalPages > 1 && !tableLoading && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                          "border border-border transition-all",
                          page === 1
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : "text-foreground hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                          "border border-border transition-all",
                          page === totalPages
                            ? "opacity-50 cursor-not-allowed text-muted-foreground"
                            : "text-foreground hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <StatusPageContent />
    </Suspense>
  );
}
