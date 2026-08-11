"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MilestoneCard } from "@/components/resources/MilestoneCard";
import type { Milestone } from "@/data/resources/milestones";

type MilestoneTimelineProps = {
  milestones: Milestone[];
  selectedYear: string;
};

export function MilestoneTimeline({ milestones, selectedYear }: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className="my-12 rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40">
        <p className="text-base font-semibold text-foreground">No milestones found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try selecting a different year or clearing your category and search filters.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={selectedYear}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative my-8"
      >
        {/* Central Vertical Connector Line */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="absolute left-[0.72rem] top-2 h-full w-0.5 origin-top bg-linear-to-b from-primary/60 via-primary/30 to-transparent lg:left-1/2 lg:-ml-[1px]"
        />

        <div className="space-y-8 sm:space-y-10">
          {milestones.map((milestone, index) => {
            const align = index % 2 === 0 ? "left" : "right";

            return (
              <div
                key={milestone.id}
                className="grid grid-cols-[1.5rem_1fr] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]"
              >
                {/* Node Indicator Dot */}
                <div className="relative z-10 flex h-7 w-7 items-center justify-center lg:col-start-2 lg:justify-self-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.08 + 0.1 }}
                    className="relative flex h-4 w-4 items-center justify-center"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                    <span className="relative h-3 w-3 rounded-full border-2 border-background bg-primary shadow-sm" />
                  </motion.span>
                </div>

                {/* Milestone Card */}
                <MilestoneCard milestone={milestone} index={index} align={align} />
              </div>
            );
          })}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
