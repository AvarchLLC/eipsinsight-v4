'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Layers, BarChart3, Download, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardPageHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const infoItems = [
    {
      icon: Layers,
      title: 'Category × Status',
      description: 'Cross-tab matrix of proposals by category and lifecycle status with CSV exports',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Governance velocity, upgrade impact, and monthly delta metrics',
    },
    {
      icon: GitBranch,
      title: 'Repository',
      description: 'Breakdown by repository, active PRs, and proposal distribution',
    },
    {
      icon: Download,
      title: 'Export Hub',
      description: 'Download any breakdown as CSV for offline analysis',
    },
  ];

  return (
    <section className="relative w-full">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <motion.h1
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl"
            >
              Governance Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              Ethereum proposals by category, status, and repository — with CSV exports.
              Powered by <span className="text-foreground/80">EIPsInsight</span>.
            </motion.p>
          </div>

          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              "border-border bg-muted/60",
              "transition-all hover:border-primary/40 hover:bg-primary/10"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isOpen ? 'Hide info' : 'Show info'}
          >
            <Info className={cn(
              "h-4 w-4 transition-all",
              "text-muted-foreground group-hover:text-primary",
              isOpen && "text-primary"
            )} />
          </motion.button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-card/60 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {infoItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-1 text-sm font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
