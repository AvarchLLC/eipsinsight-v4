"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MilestoneYearSelectorProps = {
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  milestoneCounts?: Record<string, number>;
};

export function MilestoneYearSelector({
  years,
  selectedYear,
  onYearChange,
  milestoneCounts,
}: MilestoneYearSelectorProps) {
  return (
    <div className="relative overflow-x-auto pb-2 scrollbar-none">
      <div className="flex min-w-max items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 p-1.5 shadow-xs backdrop-blur-md">
        {years.map((year) => {
          const isActive = selectedYear === year;
          const count = milestoneCounts?.[year];

          return (
            <motion.button
              key={year}
              type="button"
              onClick={() => onYearChange(year)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-200 sm:text-sm",
                isActive
                  ? "text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="milestones-active-year"
                  className="absolute inset-0 -z-10 rounded-lg bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span>{year === "2015-2019" ? "2015–2019" : year}</span>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold transition-colors",
                    isActive
                      ? "bg-background/25 text-primary-foreground"
                      : "bg-muted-foreground/15 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
