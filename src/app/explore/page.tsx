'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { ExploreTabsHeader } from './_components/explore-tabs-header';
import { ExploreFilterBar } from './_components/explore-filter-bar';
import { ViewToggle } from './status/_components/view-toggle';
import { StatusEIPTable } from './status/_components/status-eip-table';
import { StatusCardGrid } from './status/_components/status-card-grid';

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
  const [eips, setEips] = useState<EIP[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  const pageSize = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch available filter counts
  useEffect(() => {
    async function fetchFilters() {
      try {
        const [statusData, categoryData] = await Promise.all([
          client.explore.getStatusCounts({}),
          client.explore.getCategoryCounts({}),
        ]);
        setStatuses(statusData.map(s => ({ value: s.status, count: s.count })));
        setCategories(categoryData.map(c => ({ value: c.category, count: c.count })));
      } catch (err) {
        console.error('Failed to fetch filters:', err);
      }
    }
    fetchFilters();
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
            className="space-y-5"
          >
            {/* Sleek Filter Bar (Category & Status Pills + Search & Toolbar) */}
            <ExploreFilterBar
              statuses={statuses}
              categories={categories}
              selectedStatus={selectedStatus}
              selectedCategories={selectedCategories}
              searchQuery={searchQuery}
              sortBy={sortBy}
              totalResults={total}
              showingFrom={showingFrom}
              showingTo={showingTo}
              onStatusChange={handleStatusChange}
              onCategoryToggle={handleCategoryToggle}
              onCategoriesClear={() => handleCategoriesChange([])}
              onSearchChange={setSearchQuery}
              onSortChange={handleSortChange}
              onClearAll={clearAllFilters}
              view={view}
              onViewChange={setView}
            />

            {/* Proposal Directory Table (Full Width) */}
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
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border transition-all cursor-pointer",
                        page === 1 ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground hover:border-primary/50 hover:text-primary"
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border transition-all cursor-pointer",
                        page === totalPages ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground hover:border-primary/50 hover:text-primary"
                      )}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
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
