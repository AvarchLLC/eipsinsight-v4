'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Layers, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
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

function StatusPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial filters from URL
  const initialStatus = searchParams.get('status')?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || null;
  const initialCategories = searchParams.getAll('category');
  const initialTypes = searchParams.getAll('type');

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatus);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
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
        setStatuses(statusData.map(s => s.status));
        setCategories(categoryData.map(c => c.category));
        setTypes(typesData.map(t => t.type));
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
  }, [selectedStatus, selectedCategories, selectedTypes, page]);

  const updateUrl = (status: string | null, cats: string[], typs: string[]) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status.toLowerCase().replace(/\s/g, '-'));
    cats.forEach(c => params.append('category', c));
    typs.forEach(t => params.append('type', t));
    const queryString = params.toString();
    router.push(`/explore/status${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
    updateUrl(status, selectedCategories, selectedTypes);
  };

  const handleCategoriesChange = (cats: string[]) => {
    setSelectedCategories(cats);
    setPage(1);
    updateUrl(selectedStatus, cats, selectedTypes);
  };

  const handleTypesChange = (typs: string[]) => {
    setSelectedTypes(typs);
    setPage(1);
    updateUrl(selectedStatus, selectedCategories, typs);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-background relative w-full min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.06),_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.08),_transparent_50%)]" />
      </div>

      {/* Header - compact */}
      <section className="relative w-full pt-6 pb-2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-4",
              "text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 dark:border-emerald-400/30">
              <Layers className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="dec-title text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Browse by Status
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Filter and explore EIPs by their current status and category
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Status Flow Graph - compact */}
      <section className="relative w-full py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <StatusFlowGraph data={statusFlow} loading={flowLoading} />
        </div>
      </section>

      {/* Filters and Content - single row, filters sticky */}
      <section className="relative w-full py-4 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile: filters inline above content. Desktop: sidebar */}
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
                />
              </div>
            </aside>

            {/* Main Content - flex-1 */}
            <main className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {total.toLocaleString()} results
                </span>
                <ViewToggle view={view} onViewChange={setView} />
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
                          "border border-slate-200 dark:border-slate-700/50 transition-all",
                          page === 1
                            ? "opacity-50 cursor-not-allowed text-slate-500"
                            : "text-slate-700 dark:text-slate-300 hover:border-cyan-400/50 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                          "border border-slate-200 dark:border-slate-700/50 transition-all",
                          page === totalPages
                            ? "opacity-50 cursor-not-allowed text-slate-500"
                            : "text-slate-700 dark:text-slate-300 hover:border-cyan-400/50 hover:text-slate-900 dark:hover:text-white"
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
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    }>
      <StatusPageContent />
    </Suspense>
  );
}
