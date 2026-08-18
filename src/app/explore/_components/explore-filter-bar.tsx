'use client';

import React from 'react';
import { Search, X, Filter, SlidersHorizontal, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacetCount {
  value: string;
  count: number;
}

interface ExploreFilterBarProps {
  statuses: FacetCount[];
  categories: FacetCount[];
  selectedStatus: string | null;
  selectedCategories: string[];
  searchQuery: string;
  sortBy: string;
  totalResults: number;
  showingFrom: number;
  showingTo: number;
  onStatusChange: (status: string | null) => void;
  onCategoryToggle: (category: string) => void;
  onCategoriesClear: () => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: any) => void;
  onClearAll: () => void;
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

const statusBadgeColors: Record<string, string> = {
  'Draft': 'hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/30',
  'Review': 'hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/30',
  'Last Call': 'hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/30',
  'Final': 'hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
  'Living': 'hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/30',
  'Stagnant': 'hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-400/30',
  'Withdrawn': 'hover:bg-red-500/20 text-red-700 dark:text-red-300 border-red-400/30',
};

const categoryBadgeColors: Record<string, string> = {
  'Core': 'hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/30',
  'Networking': 'hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-400/30',
  'Interface': 'hover:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-400/30',
  'ERC': 'hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
  'Meta': 'hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/30',
  'Informational': 'hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/30',
};

const allCategoriesList = ['Core', 'ERC', 'Interface', 'Networking', 'Meta', 'Informational'];
const allStatusesList = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];

export function ExploreFilterBar({
  statuses,
  categories,
  selectedStatus,
  selectedCategories,
  searchQuery,
  sortBy,
  totalResults,
  showingFrom,
  showingTo,
  onStatusChange,
  onCategoryToggle,
  onCategoriesClear,
  onSearchChange,
  onSortChange,
  onClearAll,
  view,
  onViewChange,
}: ExploreFilterBarProps) {
  const categoryCountMap = new Map(categories.map(c => [c.value, c.count]));
  const statusCountMap = new Map(statuses.map(s => [s.value, s.count]));

  const hasActiveFilters = selectedStatus || selectedCategories.length > 0 || searchQuery.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 shadow-xs backdrop-blur-md space-y-4">
      {/* Category Pills Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            Category
          </span>
          {selectedCategories.length > 0 && (
            <button
              type="button"
              onClick={onCategoriesClear}
              className="text-xs text-primary hover:underline font-medium"
            >
              Reset Category
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCategoriesClear}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              selectedCategories.length === 0
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            All Categories
          </button>
          {allCategoriesList.map((cat) => {
            const isSelected = selectedCategories.includes(cat);
            const count = categoryCountMap.get(cat);
            const badgeStyle = categoryBadgeColors[cat] || 'border-border/70 text-muted-foreground';

            return (
              <button
                key={`cat-pill-${cat}`}
                type="button"
                onClick={() => onCategoryToggle(cat)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : `bg-card/80 ${badgeStyle}`
                )}
              >
                <span>{cat}</span>
                {count != null && (
                  <span className={cn(
                    "px-1.5 py-0.2 text-[10px] font-mono rounded-md border",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                      : "bg-background/80 text-muted-foreground border-border/50"
                  )}>
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Pills Row */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Status
          </span>
          {selectedStatus && (
            <button
              type="button"
              onClick={() => onStatusChange(null)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Reset Status
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              selectedStatus === null
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            All Statuses
          </button>
          {allStatusesList.map((st) => {
            const isSelected = selectedStatus === st;
            const count = statusCountMap.get(st);
            const badgeStyle = statusBadgeColors[st] || 'border-border/70 text-muted-foreground';

            return (
              <button
                key={`st-pill-${st}`}
                type="button"
                onClick={() => onStatusChange(isSelected ? null : st)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : `bg-card/80 ${badgeStyle}`
                )}
              >
                <span>{st}</span>
                {count != null && (
                  <span className={cn(
                    "px-1.5 py-0.2 text-[10px] font-mono rounded-md border",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                      : "bg-background/80 text-muted-foreground border-border/50"
                  )}>
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar Controls (Search, Sort, Clear All, View Toggle) */}
      <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by EIP #, title, or author..."
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-border/70 bg-background/90 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 justify-end">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}

          <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline font-mono">
            {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {totalResults.toLocaleString()}
          </span>

          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-9 rounded-xl border border-border/70 bg-background/90 px-2.5 text-xs text-foreground focus:border-primary/50 focus:outline-none transition-all cursor-pointer"
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="updated_asc">Oldest Updated</option>
            <option value="days_desc">Longest in Status</option>
            <option value="days_asc">Shortest in Status</option>
            <option value="number_asc">EIP Number</option>
          </select>
        </div>
      </div>
    </div>
  );
}
