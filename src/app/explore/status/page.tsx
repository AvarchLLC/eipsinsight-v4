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
import { SectionSeparator } from '@/components/header';

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
  const initialStatus = searchParams.get('status')?.replace('-', ' ') || null;
  const initialCategory = searchParams.get('category');

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    initialStatus ? initialStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [statuses, setStatuses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [eips, setEips] = useState<EIP[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFlow, setStatusFlow] = useState<StatusFlow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [flowLoading, setFlowLoading] = useState(true);

  const pageSize = 20;

  // Fetch available statuses and categories
  useEffect(() => {
    async function fetchFilters() {
      try {
        const [statusData, categoryData] = await Promise.all([
          client.explore.getStatusCounts({}),
          client.explore.getCategoryCounts({}),
        ]);
        setStatuses(statusData.map(s => s.status));
        setCategories(categoryData.map(c => c.category));
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
          category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
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
  }, [selectedStatus, selectedCategories, page]);

  // Update URL when filters change
  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setPage(1);
    
    const params = new URLSearchParams();
    if (status) params.set('status', status.toLowerCase().replace(' ', '-'));
    if (selectedCategories.length === 1) params.set('category', selectedCategories[0]);
    
    const queryString = params.toString();
    router.push(`/explore/status${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const handleCategoriesChange = (cats: string[]) => {
    setSelectedCategories(cats);
    setPage(1);
    
    const params = new URLSearchParams();
    if (selectedStatus) params.set('status', selectedStatus.toLowerCase().replace(' ', '-'));
    if (cats.length === 1) params.set('category', cats[0]);
    
    const queryString = params.toString();
    router.push(`/explore/status${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.08),_transparent_50%)]" />
      </div>

      {/* Header */}
      <section className="relative w-full pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-6",
              "text-sm text-slate-400 hover:text-white transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          {/* Page Title */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30">
              <Layers className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Browse by Status
              </h1>
              <p className="text-slate-400">
                Filter and explore EIPs by their current status and category
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      {/* Status Flow Graph */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatusFlowGraph data={statusFlow} loading={flowLoading} />
        </div>
      </section>

      <SectionSeparator />

      {/* Filters and Content */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <StatusFilterBar
                  statuses={statuses}
                  categories={categories}
                  selectedStatus={selectedStatus}
                  selectedCategories={selectedCategories}
                  onStatusChange={handleStatusChange}
                  onCategoriesChange={handleCategoriesChange}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* View Toggle & Results Count */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">
                  {total.toLocaleString()} results
                </span>
                <ViewToggle view={view} onViewChange={setView} />
              </div>

              {/* Results */}
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
                  
                  {/* Grid Pagination */}
                  {totalPages > 1 && !tableLoading && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                          "border border-slate-700/50 transition-all",
                          page === 1
                            ? "opacity-50 cursor-not-allowed text-slate-500"
                            : "text-slate-300 hover:border-cyan-400/50 hover:text-white"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>

                      <span className="text-sm text-slate-400">
                        Page {page} of {totalPages}
                      </span>

                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                          "border border-slate-700/50 transition-all",
                          page === totalPages
                            ? "opacity-50 cursor-not-allowed text-slate-500"
                            : "text-slate-300 hover:border-cyan-400/50 hover:text-white"
                        )}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16" />
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
