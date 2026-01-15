'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Code, Layers, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UpgradeStatsCards() {
  const cardVariants = {
    hover: {
      y: -4,
      scale: 1.02,
    },
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full justify-between">
      {/* Main Total Upgrades Card */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.2 }}
        className={cn(
          "relative p-5 rounded-xl border border-cyan-400/20",
          "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm",
          "shadow-lg shadow-cyan-500/5",
          "hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/10",
          "transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
            <Rocket className="h-4 w-4 text-cyan-400" />
          </div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Total Network Upgrades
          </h3>
        </div>
        <p className="text-4xl font-bold text-white mb-1">21</p>
        <p className="text-sm text-slate-400">
          Since Frontier Thawing (2015)
        </p>
      </motion.div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Execution Layer */}
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          className={cn(
            "relative p-4 rounded-xl border border-emerald-400/20",
            "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm",
            "shadow-lg shadow-emerald-500/5",
            "hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/10",
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
              <Code className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <h3 className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
              Execution Layer
            </h3>
          </div>
          <p className="text-3xl font-bold text-white mb-1">19</p>
          <p className="text-xs text-slate-400">Protocol & EVM</p>
        </motion.div>

        {/* Consensus Layer */}
        <motion.div
          variants={cardVariants}
          whileHover="hover"
          transition={{ duration: 0.2 }}
          className={cn(
            "relative p-4 rounded-xl border border-violet-400/20",
            "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm",
            "shadow-lg shadow-violet-500/5",
            "hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-500/10",
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded-lg bg-violet-500/10 border border-violet-400/20">
              <Layers className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <h3 className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
              Consensus Layer
            </h3>
          </div>
          <p className="text-3xl font-bold text-white mb-1">6</p>
          <p className="text-xs text-slate-400">Beacon Chain</p>
        </motion.div>
      </div>

      {/* Total Core EIPs */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.2 }}
        className={cn(
          "relative p-4 rounded-xl border border-amber-400/20",
          "bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm",
          "shadow-lg shadow-amber-500/5",
          "hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/10",
          "transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-400/20">
            <Network className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <h3 className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
            Total Core EIPs
          </h3>
        </div>
        <p className="text-3xl font-bold text-white mb-1">62</p>
        <p className="text-xs text-slate-400">Implemented in upgrades</p>
      </motion.div>
    </div>
  );
}
