'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Search as SearchIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { ExploreTabsHeader } from './_components/explore-tabs-header';
import { StatusFilterBar } from './status/_components/status-filter-bar';
import { ViewToggle } from './status/_components/view-toggle';
import { StatusEIPTable } from './status/_components/status-eip-table';
import { StatusCardGrid } from './status/_components/status-card-grid';
import { StatusFlowGraph } from './status/_components/status-flow-graph';

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

function MainExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters State
  const initialStatus = searchParams.get('status')?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || null;
  const initialCategories = searchParams.getAll('category');
  const initialTypes = searchParams.getAll('type');
  const initialSort = (searchParams.get('sort') as SortOption) || 'updated_desc';
  const initialQuery = searchParams.get('q') || '';

  const [view, setView] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    return window.localStorage.getItem('explore-status-view') === 'grid' ? 'grid' : 'list';
  });
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatus);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  const [statuses, setStatuses] = useState<FacetCount[]>([]);
  const [categories, setCategories] = useState<FacetCount[]>([]);
  const [types, setTypes] = useState<FacetCount[]>([]);
  const [eips, setEips] = useState<EIP[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFlow, setStatusFlow] = useState<StatusFlow[]>([]);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);
  const [flowLoading, setFlowLoading] = useState(true);

  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      }
    }
    fetchFilters();
  }, []);

  // Fetch status flow pipeline data
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

  // Fetch EIPs when filters or search change
  useEffect(() => {
    async function fetchEIPs() {
      setTableLoading(true);
      try {
        const data = await client.explore.getEIPsByStatus({
          q: debouncedQuery.trim() || undefined,
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
  }, [selectedStatus, selectedCategories, selectedTypes, sortBy, debouncedQuery, page]);

  const updateUrl = (status: string | null, cats: string[], typs: string[], sort: SortOption, q: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status.toLowerCase().replace(/\s/g, '-'));
    cats.forEach(c => params.append('category', c));
    typs.forEach(t => params.append('type', t));
    if (q.trim()) params.set('q', q.trim());
    if (sort !== 'updated_desc') params.set('sort', sort);
    const queryString = params.toString();
    router.push(`/explore${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
    updateUrl(status, selectedCategories, selectedTypes, sortBy, searchQuery);
  };

  const handleCategoriesChange = (cats: string[]) => {
    setSelectedCategories(cats);
    setPage(1);
    updateUrl(selectedStatus, cats, selectedTypes, sortBy, searchQuery);
  };

  const handleCategoryToggle = (category: string) => {
    const nextCats = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    handleCategoriesChange(nextCats);
  };

  const handleTypesChange = (typs: string[]) => {
    setSelectedTypes(typs);
    setPage(1);
    updateUrl(selectedStatus, selectedCategories, typs, sortBy, searchQuery);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setPage(1);
    updateUrl(selectedStatus, selectedCategories, selectedTypes, sort, searchQuery);
  };

  const clearAllFilters = () => {
    setSelectedStatus(null);
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSearchQuery('');
    setSortBy('updated_desc');
    setPage(1);
    updateUrl(null, [], [], 'updated_desc', '');
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
    searchQuery.trim() ? { key: `query-${searchQuery}`, label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery('') } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onRemove: () => void }>;

  return (
    <div className="bg-background relative w-full min-h-screen">
      {/* Shared Explore Header Tabs */}
      <ExploreTabsHeader />

      {/* Main Content Area */}
      <div className="relative z-10 w-full pb-16">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Interactive Status & Category Flow Graph */}
            <StatusFlowGraph
              data={statusFlow}
              categoriesData={categories.map(c => ({ category: c.value, count: c.count }))}
              loading={flowLoading}
              selectedStatus={selectedStatus}
              selectedCategories={selectedCategories}
              onSelectStatus={handleStatusChange}
              onSelectCategory={handleCategoryToggle}
            />

            {/* Sidebar + Table */}
            <div className="flex flex-col lg:flex-row gap-6 pt-2">
              <aside className="lg:w-60 shrink-0">
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

              <main className="flex-1 min-w-0 space-y-4">
                {/* Active Filter Chips */}
                {activeFilterChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/15 transition-all cursor-pointer"
                      >
                        {chip.label}
                        <X className="h-3.5 w-3.5 opacity-70 hover:opacity-100" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Table Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/70 backdrop-blur-md">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by EIP #, title, or author..."
                      className="w-full h-9 pl-9 pr-8 rounded-xl border border-border/70 bg-background/80 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline font-mono">
                      {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {total.toLocaleString()}
                    </span>
                    <select
                      value={sortBy}
                      onChange={(event) => handleSortChange(event.target.value as SortOption)}
                      className="h-9 rounded-xl border border-border/70 bg-background/80 px-2.5 text-xs text-foreground focus:border-primary/50 focus:outline-none transition-all cursor-pointer"
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

                {/* Table or Grid View */}
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
                      <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border transition-all",
                            page === 1 ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground hover:border-primary/50 hover:text-primary cursor-pointer"
                          )}
                        >
                          Previous
                        </button>
                        <span className="text-xs text-muted-foreground">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalPages}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border transition-all",
                            page === totalPages ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground hover:border-primary/50 hover:text-primary cursor-pointer"
                          )}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading Explore...</div>
      </div>
    }>
      <MainExploreContent />
    </Suspense>
  );
}
