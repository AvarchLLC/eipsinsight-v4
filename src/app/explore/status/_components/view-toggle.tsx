'use client';

import React from 'react';
import { motion } from 'motion/react';
import { List, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          view === 'list'
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {view === 'list' && (
          <motion.div
            layoutId="view-toggle-bg"
            className="absolute inset-0 rounded-md border border-primary/30 bg-primary/10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <List className="h-4 w-4 relative z-10" />
        <span className="relative z-10">List</span>
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          view === 'grid'
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {view === 'grid' && (
          <motion.div
            layoutId="view-toggle-bg"
            className="absolute inset-0 rounded-md border border-primary/30 bg-primary/10"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Grid3X3 className="h-4 w-4 relative z-10" />
        <span className="relative z-10">Grid</span>
      </button>
    </div>
  );
}
