'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExploreHero() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.15),_transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Icon Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-2xl",
              "bg-gradient-to-br from-cyan-500/20 to-emerald-500/20",
              "border border-cyan-400/30 backdrop-blur-sm",
              "shadow-lg shadow-cyan-500/20"
            )}>
              <Compass className="h-8 w-8 text-cyan-400" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-transparent" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            <span className="bg-gradient-to-br from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Explore Ethereum
            </span>
            <br />
            <span className="bg-gradient-to-br from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              Standards
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-400"
          >
            Browse proposals by time, status, and people shaping them.
            Discover the evolution of Ethereum through its improvement proposals.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
