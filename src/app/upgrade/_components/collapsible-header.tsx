'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Info, Network, Calendar, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollapsibleHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const infoItems = [
    {
      icon: Network,
      title: 'Network Upgrades',
      description: 'Major protocol changes that require network-wide coordination',
    },
    {
      icon: Calendar,
      title: 'Timeline',
      description: 'Track the evolution of Ethereum from Frontier to the latest proposals',
    },
    {
      icon: GitBranch,
      title: 'EIP Inclusion',
      description: 'See which EIPs are included in each upgrade and their status',
    },
  ];

  return (
    <section className="relative w-full bg-slate-950/30">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-4 sm:px-6 sm:pt-12 sm:pb-6">
        <div className="space-y-4">
          {/* Main Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <motion.h1
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="dec-title text-balance bg-gradient-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl"
              >
                Network Upgrades
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base"
              >
                Explore Ethereum's network upgrade history, from Frontier to the latest proposals
              </motion.p>
            </div>

            {/* Toggle Button */}
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                "border-slate-700/40 bg-slate-900/50 backdrop-blur-sm",
                "transition-all hover:border-cyan-400/50 hover:bg-cyan-400/15",
                "hover:shadow-lg hover:shadow-cyan-500/10"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isOpen ? 'Hide info' : 'Show info'}
            >
              <Info className={cn(
                "h-4 w-4 transition-all",
                "text-slate-400 group-hover:text-cyan-300",
                isOpen && "text-cyan-300"
              )} />
            </motion.button>
          </div>

          {/* Collapsible Info Panel */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-slate-900/60 backdrop-blur-sm p-6">
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
                          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 shrink-0">
                            <Icon className="h-4 w-4 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white mb-1">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
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
