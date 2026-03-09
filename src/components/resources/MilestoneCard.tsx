"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Milestone = {
  title: string;
  date: string;
  description: string;
  whyItMatters: string;
  takeaway: string;
  image: string;
  terms?: string[];
};

type MilestoneCardProps = {
  milestone: Milestone;
  index: number;
  align: "left" | "right";
};

export function MilestoneCard({ milestone, index, align }: MilestoneCardProps) {
  const isLeft = align === "left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      className={cn("group w-full", isLeft ? "lg:col-start-1" : "lg:col-start-3")}
    >
      <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-900/60">
        <div className="relative h-40 overflow-hidden border-b border-slate-200/70 dark:border-slate-700/50">
          <Image
            src={milestone.image}
            alt={milestone.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/55 via-slate-900/15 to-transparent" />
          <p className="absolute bottom-3 left-3 rounded-full border border-cyan-300/45 bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
            {milestone.date}
          </p>
        </div>

        <CardContent className="space-y-3 px-5 py-5">
          <p className="text-xs font-medium tracking-wide text-cyan-700 dark:text-cyan-300">
            {milestone.date}
          </p>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {milestone.title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {milestone.description}
          </p>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Why it matters:</strong> {milestone.whyItMatters}
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Key takeaway:</strong> {milestone.takeaway}
          </p>

          {milestone.terms?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {milestone.terms.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-slate-300/80 bg-slate-100/80 px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                >
                  {term}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
