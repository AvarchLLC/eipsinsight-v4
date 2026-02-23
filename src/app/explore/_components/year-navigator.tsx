'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';

interface YearData {
  year: number;
  newEIPs: number;
  statusChanges: number;
  activePRs: number;
}

interface SparklineData {
  month: number;
  count: number;
}

export function YearNavigator() {
  const [years, setYears] = useState<YearData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sparklineData, setSparklineData] = useState<SparklineData[]>([]);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchYears() {
      try {
        const data = await client.explore.getYearsOverview({});
        setYears(data);
        if (data.length > 0) {
          setSelectedYear(data[0].year);
        }
      } catch (err) {
        console.error('Failed to fetch years:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchYears();
  }, []);

  useEffect(() => {
    async function fetchSparkline() {
      if (!selectedYear) return;
      try {
        const data = await client.explore.getYearSparkline({ year: selectedYear });
        setSparklineData(data);
      } catch (err) {
        console.error('Failed to fetch sparkline:', err);
      }
    }
    fetchSparkline();
  }, [selectedYear]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const maxCount = Math.max(...sparklineData.map(d => d.count), 1);
  const tooltipYear = hoveredYear !== null ? years.find(y => y.year === hoveredYear) : null;

  if (loading) {
    return (
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/10 border border-cyan-400/30 dark:border-cyan-400/20">
            <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Browse by Year</h2>
        </div>

        {/* Year Scroller */}
        <div className="relative">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm",
              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400/50",
              "transition-all duration-200"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-12 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {years.map((yearData) => (
              <Link
                key={yearData.year}
                href={`/explore/years?year=${yearData.year}`}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedYear(yearData.year)}
                  onMouseEnter={() => setHoveredYear(yearData.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  className={cn(
                    "relative flex-shrink-0 px-6 py-4 rounded-xl cursor-pointer",
                    "border transition-all duration-200",
                    selectedYear === yearData.year
                      ? "bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400/50 dark:border-cyan-400/40 shadow-md shadow-cyan-200/50 dark:shadow-cyan-500/10 ring-1 ring-cyan-200/60 dark:ring-transparent"
                      : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/40 shadow-sm dark:shadow-none ring-1 ring-slate-200/50 dark:ring-transparent hover:border-cyan-300/60 dark:hover:border-slate-600/60 hover:shadow-md"
                  )}
                >
                    <span className={cn(
                    "dec-title text-2xl font-bold tracking-tight",
                    selectedYear === yearData.year ? "text-cyan-600 dark:text-cyan-300" : "text-slate-900 dark:text-white"
                  )}>
                    {yearData.year}
                  </span>
                  
                  {/* Stats badge */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {yearData.newEIPs} EIPs
                    </span>
                  </div>

                  {/* Tooltip on hover */}
                  <AnimatePresence>
                    {hoveredYear === yearData.year && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={cn(
                          "absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20",
                          "px-3 py-2 rounded-lg",
                          "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg",
                          "text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap"
                        )}
                      >
                        <div className="font-medium text-slate-900 dark:text-white mb-1">{yearData.year}</div>
                        <div>{yearData.newEIPs} new EIPs</div>
                        <div>{yearData.statusChanges} status changes</div>
                        <div>{yearData.activePRs} active PRs</div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-white dark:border-t-slate-800" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm",
              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400/50",
              "transition-all duration-200"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Year Activity Sparkline */}
        {selectedYear && sparklineData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-6 p-4 rounded-xl",
              "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40 shadow-sm dark:shadow-none ring-1 ring-slate-200/40 dark:ring-transparent"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Monthly activity for {selectedYear}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-500">
                EIPs touched per month
              </span>
            </div>
            
            {/* Sparkline */}
            <div className="flex items-end gap-1 h-16">
              {sparklineData.map((data, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className={cn(
                      "w-full rounded-t",
                      data.count > 0 ? "bg-cyan-500/60 dark:bg-cyan-400/60" : "bg-slate-300/50 dark:bg-slate-700/30"
                    )}
                    style={{ minHeight: data.count > 0 ? '4px' : '2px' }}
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-500">
                    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
