'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Code, Layers, Network, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeStatsCardsProps {
  totalUpgrades?: number;
  independentIncludedAuthors?: number;
  activeTable?: 'core' | 'meta' | 'execution' | 'consensus' | 'authors' | null;
  onSelectTable?: (mode: 'core' | 'meta' | 'execution' | 'consensus' | 'authors') => void;
}

export function UpgradeStatsCards({
  totalUpgrades = 27,
  independentIncludedAuthors = 0,
  activeTable = null,
  onSelectTable,
}: UpgradeStatsCardsProps) {
  const cardVariants = {
    hover: {
      y: -4,
      scale: 1.02,
    },
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full justify-between">
      {/* Main Total Upgrades Card */}
      <motion.a
        href="#network-upgrades-chart"
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.2 }}
        className={cn(
          'relative block p-5 rounded-xl border border-border bg-card/60 backdrop-blur-sm',
          "shadow-sm",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15",
          'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Network Upgrades
          </h3>
        </div>
        <p className="text-4xl font-bold text-foreground mb-1">{totalUpgrades}</p>
        <p className="text-sm text-muted-foreground">
          Mentioned in the distribution chart
        </p>
      </motion.a>

      {/* Two Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Execution Layer */}
        <motion.button
          type="button"
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          onClick={() => onSelectTable?.('execution')}
          className={cn(
            'relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left',
            'shadow-sm',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            activeTable === 'execution' && 'border-primary/50 shadow-lg shadow-primary/15'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
              <Code className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Execution Layer
            </h3>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">19</p>
          <p className="text-xs text-muted-foreground">Protocol & EVM</p>
        </motion.button>

        {/* Consensus Layer */}
        <motion.button
          type="button"
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          onClick={() => onSelectTable?.('consensus')}
          className={cn(
            'relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left',
            'shadow-sm',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            activeTable === 'consensus' && 'border-primary/50 shadow-lg shadow-primary/15'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Consensus Layer
            </h3>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">6</p>
          <p className="text-xs text-muted-foreground">Beacon Chain</p>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <motion.button
          type="button"
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          onClick={() => onSelectTable?.('authors')}
          className={cn(
            'relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left sm:col-span-2',
            'shadow-sm',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            activeTable === 'authors' && 'border-primary/50 shadow-lg shadow-primary/15'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Included EIP Authors
            </h3>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">{independentIncludedAuthors}</p>
          <p className="text-xs text-muted-foreground">
            Unique EIP authors included across network upgrades
          </p>
        </motion.button>

        <motion.button
          type="button"
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          onClick={() => onSelectTable?.('core')}
          className={cn(
            'relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left',
            'shadow-sm',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            activeTable === 'core' && 'border-primary/50 shadow-lg shadow-primary/15'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
              <Network className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              EIPs Deployed
            </h3>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">62</p>
          <p className="text-xs text-muted-foreground">Core EIPs deployed in upgrades</p>
        </motion.button>

        <motion.button
          type="button"
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          onClick={() => onSelectTable?.('meta')}
          className={cn(
            'relative p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm text-left',
            'shadow-sm',
            'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            activeTable === 'meta' && 'border-primary/50 shadow-lg shadow-primary/15'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Hard Fork Meta EIPs
            </h3>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">20</p>
          <p className="text-xs text-muted-foreground">Meta EIPs paired with upgrades</p>
        </motion.button>
      </div>
    </div>
  );
}
