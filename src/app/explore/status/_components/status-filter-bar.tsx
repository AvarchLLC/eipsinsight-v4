'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusFilterBarProps {
  statuses: string[];
  categories: string[];
  selectedStatus: string | null;
  selectedCategories: string[];
  onStatusChange: (status: string | null) => void;
  onCategoriesChange: (categories: string[]) => void;
}

const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];

export function StatusFilterBar({
  statuses,
  categories,
  selectedStatus,
  selectedCategories,
  onStatusChange,
  onCategoriesChange,
}: StatusFilterBarProps) {
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const clearFilters = () => {
    onStatusChange(null);
    onCategoriesChange([]);
  };

  const hasFilters = selectedStatus || selectedCategories.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl",
        "bg-slate-900/50 border border-slate-700/40",
        "backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Filters</span>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onStatusChange(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "border",
              selectedStatus === null
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                : "bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600"
            )}
          >
            All
          </button>
          {statusOrder.filter(s => statuses.includes(s)).map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "border",
                selectedStatus === status
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                  : "bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
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
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                  : "bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
