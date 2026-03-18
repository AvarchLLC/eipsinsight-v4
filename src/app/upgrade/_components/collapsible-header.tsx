'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Network, Calendar, GitBranch } from 'lucide-react';
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
    <section className="relative w-full bg-background">
      <div className="w-full px-3 pt-10 pb-4 sm:px-4 sm:pt-12 sm:pb-6 lg:px-5 xl:px-6">
        <div className="space-y-4">
          {/* Main Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <div className="grid h-7 w-7 place-items-center rounded-md border border-border bg-muted/60">
                  <Network className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Upgrade
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl"
              >
                Network Upgrades
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
                Explore Ethereum&apos;s network upgrade history, from Frontier to the latest proposals
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
                "border-border bg-muted/60 backdrop-blur-sm",
                "transition-all hover:border-primary/40 hover:bg-primary/10",
                "hover:shadow-lg hover:shadow-primary/15"
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
                <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-6">
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
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
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
