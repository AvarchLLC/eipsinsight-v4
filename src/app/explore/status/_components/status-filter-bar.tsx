'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacetCount {
  value: string;
  count: number;
}

interface StatusFilterBarProps {
  statuses: FacetCount[];
  categories: FacetCount[];
  types: FacetCount[];
  selectedStatus: string | null;
  selectedCategories: string[];
  selectedTypes: string[];
  onStatusChange: (status: string | null) => void;
  onCategoriesChange: (categories: string[]) => void;
  onTypesChange: (types: string[]) => void;
  onClearAll: () => void;
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
  onClearAll,
}: StatusFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasFilters = selectedStatus || selectedCategories.length > 0 || selectedTypes.length > 0;

  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.value, s.count])), [statuses]);
  const orderedStatuses = useMemo(() => ([
    ...statusOrder.filter((s) => statusMap.has(s)).map((s) => ({ value: s, count: statusMap.get(s) ?? 0 })),
    ...statuses.filter((s) => !statusOrder.includes(s.value)).sort((a, b) => a.value.localeCompare(b.value)),
  ]), [statusMap, statuses]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm lg:max-h-[calc(100vh-9.5rem)]"
    >
      <div className="shrink-0 border-b border-border/70 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onStatusChange(null)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                selectedStatus === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              All ({statuses.reduce((acc, item) => acc + item.count, 0).toLocaleString()})
            </button>
            {orderedStatuses.map((status) => (
              <button
                key={status.value}
                onClick={() => onStatusChange(status.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  selectedStatus === status.value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {status.value} ({status.count.toLocaleString()})
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => toggleCategory(category.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  selectedCategories.includes(category.value)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {category.value} ({category.count.toLocaleString()})
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            Advanced
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")} />
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => toggleType(type.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      selectedTypes.includes(type.value)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {type.value} ({type.count.toLocaleString()})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
