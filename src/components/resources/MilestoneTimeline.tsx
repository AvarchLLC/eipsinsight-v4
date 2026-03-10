"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MilestoneCard, type Milestone } from "@/components/resources/MilestoneCard";

type MilestoneTimelineProps = {
  milestones: Milestone[];
  selectedYear: string;
};

export function MilestoneTimeline({ milestones, selectedYear }: MilestoneTimelineProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={selectedYear}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative mt-8"
      >
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="absolute left-[0.72rem] top-0 h-full w-px origin-top bg-linear-to-b from-cyan-500/50 via-cyan-500/30 to-transparent lg:left-1/2"
        />

        <div className="space-y-5">
          {milestones.map((milestone, index) => {
            const align = index % 2 === 0 ? "left" : "right";

            return (
              <div
                key={`${selectedYear}-${milestone.title}`}
                className="grid grid-cols-[1.5rem_1fr] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]"
              >
                <div className="relative z-10 flex h-6 w-6 items-center justify-center lg:col-start-2 lg:justify-self-center">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, delay: index * 0.08 + 0.12 }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_0_5px_rgba(6,182,212,0.18)] dark:border-slate-900"
                  />
                </div>

                <MilestoneCard milestone={milestone} index={index} align={align} />
              </div>
            );
          })}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
