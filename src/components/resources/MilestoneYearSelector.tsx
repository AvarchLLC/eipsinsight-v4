"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MilestoneYearSelectorProps = {
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
};

export function MilestoneYearSelector({
  years,
  selectedYear,
  onYearChange,
}: MilestoneYearSelectorProps) {
  return (
    <div className="relative overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/50">
        {years.map((year) => {
          const isActive = selectedYear === year;

          return (
            <motion.button
              key={year}
              type="button"
              onClick={() => onYearChange(year)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "text-cyan-900 dark:text-cyan-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="milestones-active-year"
                  className="absolute inset-0 -z-10 rounded-lg border border-cyan-300/60 bg-cyan-500/20 dark:border-cyan-400/40 dark:bg-cyan-500/25"
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                />
              ) : null}
              <span>{year}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
