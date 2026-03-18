'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, BarChart3, FileText, GitMerge, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StandardsPageHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const infoItems = [
    {
      icon: BarChart3,
      title: 'Status & Category',
      description: 'Switch between repository, category, and status views for progress over time.',
    },
    {
      icon: FileText,
      title: 'Category Breakdown',
      description: 'Standards by category (Core, Meta, ERC, etc.) with percentages and CSV export.',
    },
    {
      icon: GitMerge,
      title: 'Activity',
      description: 'Recently closed/merged PRs, review activity, and editor reviews in the last 24 hours.',
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Top editors, reviewers, and contributors by repository.',
    },
  ];

  return (
    <section id="standards" className="relative w-full border-b border-border/70">
        <div className="w-full max-w-full pb-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <motion.h1
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
              >
                Standards Explorer
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
                Browse, filter, and analyze Ethereum standards across repositories with advanced search and filtering capabilities.
                Powered by <span className="text-foreground/80">EIPsInsight</span>.
              </motion.p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                onClick={() => setIsOpen(!isOpen)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  "border-border bg-muted/60",
                  "transition-all hover:border-primary/40 hover:bg-primary/10",
                  "hover:shadow-lg hover:shadow-primary/10"
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
                          <div className="p-2 rounded-lg bg-muted/60 border border-border shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground mb-1">
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
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
      </div>
    </section>
  );
}
