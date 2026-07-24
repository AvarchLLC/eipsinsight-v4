"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Home, Search, ArrowRight, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6">
      {/* Subtle background accents — matches landing page */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.06),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.04),transparent_70%)]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.04] blur-3xl dark:bg-cyan-400/5" />
        <div className="absolute right-0 top-1/4 h-[300px] w-[300px] rounded-full bg-emerald-400/[0.04] blur-3xl dark:bg-emerald-400/3" />
      </div>

      <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        {/* Status badge — EIP-themed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-white/80 px-4 py-1.5 backdrop-blur-sm dark:border-cyan-300/30 dark:bg-black/70"
        >
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            Withdrawn
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">EIP-404</span>
        </motion.div>

        {/* Large 404 display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="dec-title mb-2 bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 bg-clip-text text-7xl font-bold tracking-tighter text-transparent dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 sm:text-8xl md:text-9xl"
        >
          404
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="dec-title mb-2 bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 sm:text-3xl"
        >
          Page Not Found
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400"
        >
          This proposal has been withdrawn - or perhaps it never existed. Try
          searching or head back to explore standards.
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="group h-10 rounded-lg bg-linear-to-r from-emerald-500 to-cyan-500 px-6 font-medium text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] dark:text-black"
          >
            <Link href="/">
              <span className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Back to Home
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-10 rounded-lg border-cyan-300/60 bg-white/80 px-6 font-medium text-cyan-700 backdrop-blur-sm transition-all hover:border-cyan-400/70 hover:bg-cyan-400/10 hover:text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-500/60 dark:hover:bg-cyan-500/20 dark:hover:text-cyan-200"
          >
            <Link href="/search">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search EIPs
              </span>
            </Link>
          </Button>
        </motion.div>

        {/* Decorative card — quick links */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-12 w-full max-w-sm rounded-xl border border-cyan-300/30 bg-white/70 p-6 backdrop-blur-sm transition-colors hover:border-cyan-400/40 dark:border-slate-700/50 dark:bg-slate-900/40 dark:hover:border-cyan-500/30"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            <FileQuestion className="h-3.5 w-3.5" />
            Quick links
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/standards"
              className="text-sm text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
            >
              Standards
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
            >
              Dashboard
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              href="/analytics/prs"
              className="text-sm text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
            >
              Analytics
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              href="/resources"
              className="text-sm text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
            >
              Resources
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
