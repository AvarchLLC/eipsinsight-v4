'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Layers, BarChart3, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EIPsPageHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const infoItems = [
    {
      icon: Layers,
      title: 'Proposal Types',
      description: 'Browse EIPs, ERCs, and RIPs by category or lifecycle status',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track governance metrics, editorial workload, and decision velocity',
    },
    {
      icon: GitBranch,
      title: 'Governance',
      description: 'Explore upgrade impact, recent changes, and repository distribution',
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
              className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
            >
              Ethereum Improvement Proposals
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            >
              Real-time governance analytics — proposal lifecycle, upgrade progress, and editorial workload.
              Powered by <span className="text-slate-700 dark:text-slate-200">EIPsInsight</span>.
            </motion.p>
          </div>

          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80",
              "transition-all hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-cyan-50 dark:hover:bg-slate-700/80",
              "hover:shadow-lg dark:hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/10"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isOpen ? 'Hide info' : 'Show info'}
          >
            <Info className={cn(
              "h-4 w-4 transition-all",
              "text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300",
              isOpen && "text-cyan-600 dark:text-cyan-300"
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
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <div className="p-2 rounded-lg bg-cyan-500/10 dark:bg-slate-800/80 border border-cyan-400/20 dark:border-slate-600/50 shrink-0">
                          <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
