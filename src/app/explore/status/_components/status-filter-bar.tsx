'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusFilterBarProps {
  statuses: string[];
  categories: string[];
  types: string[];
  selectedStatus: string | null;
  selectedCategories: string[];
  selectedTypes: string[];
  onStatusChange: (status: string | null) => void;
  onCategoriesChange: (categories: string[]) => void;
  onTypesChange: (types: string[]) => void;
}

const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];

export function StatusFilterBar({
  statuses,
  categories,
  types,
  selectedStatus,
  selectedCategories,
  selectedTypes,
  onStatusChange,
  onCategoriesChange,
  onTypesChange,
}: StatusFilterBarProps) {
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const clearFilters = () => {
    onStatusChange(null);
    onCategoriesChange([]);
    onTypesChange([]);
  };

  const hasFilters = selectedStatus || selectedCategories.length > 0 || selectedTypes.length > 0;

  // Show all statuses from API, ordered by statusOrder first, then extras
  const orderedStatuses = [
    ...statusOrder.filter(s => statuses.includes(s)),
    ...statuses.filter(s => !statusOrder.includes(s)).sort(),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col rounded-xl overflow-hidden",
        "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40",
        "backdrop-blur-sm lg:max-h-[calc(100vh-10rem)]"
      )}
    >
      <div className="p-4 shrink-0 border-b border-slate-200 dark:border-slate-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Status Filter */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onStatusChange(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "border",
                selectedStatus === null
                  ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40"
                  : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600"
              )}
            >
              All
            </button>
            {orderedStatuses.map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  "border",
                  selectedStatus === status
                    ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/40"
                    : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Category or Type Filter - show categories when available, else types */}
        <div>
          {categories.length > 0 ? (
            <>
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Category (multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "border",
                      selectedCategories.includes(category)
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </>
          ) : types.length > 0 ? (
            <>
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Type (multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      "border",
                      selectedTypes.includes(type)
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Type filter - also show when categories exist, as secondary filter */}
        {categories.length > 0 && types.length > 0 && (
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Type (multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    "border",
                    selectedTypes.includes(type)
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40"
                      : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:border-slate-400 dark:hover:border-slate-600"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
