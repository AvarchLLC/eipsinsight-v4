"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  History, 
  GitBranch, 
  Clock, 
  GitMerge, 
  Network,
  GitCommit,
  Users,
  FileCode,
  ArrowRight
} from "lucide-react";
import { PageHeader } from "@/components/header";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { cn } from "@/lib/utils";

// Skeleton Components (must be defined before trackingCards)
const SkeletonOne = () => {
  const events = [
    { label: "Draft", date: "2024-01-15", colorClass: "bg-cyan-400/60" },
    { label: "Review", date: "2024-02-20", colorClass: "bg-blue-400/60" },
    { label: "Last Call", date: "2024-03-10", colorClass: "bg-amber-400/60" },
    { label: "Final", date: "2024-04-05", colorClass: "bg-emerald-400/60" },
  ];

  return (
    <div className="relative flex flex-col gap-4 h-full py-4">
      <div className="flex flex-col gap-3">
        {events.map((event, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className={cn("w-2 h-2 rounded-full", event.colorClass)} />
            <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{event.label}</span>
              <span className="text-[10px] text-slate-500">{event.date}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-20 bg-gradient-to-t from-slate-100/60 via-slate-100/60 to-transparent dark:from-slate-900/60 dark:via-slate-900/60 w-full pointer-events-none" />
    </div>
  );
};

const SkeletonTwo = () => {
  const blockers = [
    { role: "Authors", count: 12, borderClass: "border-emerald-400/20", bgClass: "bg-emerald-500/10", textClass: "text-emerald-700 dark:text-emerald-300" },
    { role: "Editors", count: 8, borderClass: "border-cyan-400/20", bgClass: "bg-cyan-500/10", textClass: "text-cyan-700 dark:text-cyan-300" },
    { role: "Community", count: 5, borderClass: "border-blue-400/20", bgClass: "bg-blue-500/10", textClass: "text-blue-700 dark:text-blue-300" },
  ];

  return (
    <div className="relative flex flex-col gap-4 h-full py-4">
      <div className="grid grid-cols-3 gap-3">
        {blockers.map((blocker, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn("relative p-4 rounded-lg border backdrop-blur-sm", blocker.borderClass, blocker.bgClass)}
          >
            <div className={cn("text-2xl font-bold mb-1", blocker.textClass)}>
              {blocker.count}
            </div>
            <div className="text-xs text-slate-400">{blocker.role}</div>
          </motion.div>
        ))}
      </div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-20 bg-gradient-to-t from-slate-100/60 via-slate-100/60 to-transparent dark:from-slate-900/60 dark:via-slate-900/60 w-full pointer-events-none" />
    </div>
  );
};

// Deterministic pseudo-random generator (pure) used for skeletons
function seededRandom(i: number): number {
  const seed = i + 1;
  const val = (seed * 9301 + 49297) % 233280;
  return val / 233280;
}

const SkeletonThree = () => {
  const timeline = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        month: `Q${Math.floor(i / 2) + 1}`,
        activity: seededRandom(i) * 100,
      })),
    []
  );

  return (
    <div className="relative flex flex-col gap-3 h-full py-4">
      <div className="flex items-end gap-2 h-32">
        {timeline.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ height: 0 }}
            animate={{ height: `${item.activity}%` }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className="flex-1 bg-gradient-to-t from-cyan-500/40 to-blue-500/40 rounded-t-sm"
          />
        ))}
      </div>
      <div className="flex gap-2 text-[10px] text-slate-500">
        {timeline.map((item, idx) => (
          <div key={idx} className="flex-1 text-center">{item.month}</div>
        ))}
      </div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-20 bg-gradient-to-t from-slate-100/60 via-slate-100/60 to-transparent dark:from-slate-900/60 dark:via-slate-900/60 w-full pointer-events-none" />
    </div>
  );
};

const SkeletonFour = () => {
  return (
    <div className="relative flex flex-col gap-3 h-full py-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 p-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10">
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">EIP-1234</div>
          <div className="text-[10px] text-slate-400">Core</div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-500" />
        <div className="flex-1 p-3 rounded-lg border border-violet-400/20 bg-violet-500/10">
          <div className="text-xs text-violet-700 dark:text-violet-300 mb-1">ERC-1234</div>
          <div className="text-[10px] text-slate-400">Token</div>
        </div>
      </div>
      <div className="text-xs text-slate-400 text-center">History preserved across migration</div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-20 bg-gradient-to-t from-slate-100/60 via-slate-100/60 to-transparent dark:from-slate-900/60 dark:via-slate-900/60 w-full pointer-events-none" />
    </div>
  );
};

const SkeletonFive = () => {
  const nodes = [
    { label: "RIP-1", x: 20, y: 30 },
    { label: "RIP-2", x: 50, y: 20 },
    { label: "RIP-3", x: 80, y: 40 },
  ];

  return (
    <div className="relative flex flex-col gap-3 h-full py-4">
      <div className="relative h-32 w-full">
        {nodes.map((node, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.2 }}
            className="absolute"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className="p-2 rounded-lg border border-amber-400/30 bg-amber-500/10 backdrop-blur-sm">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">{node.label}</div>
            </div>
          </motion.div>
        ))}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
          {nodes.slice(0, -1).map((node, idx) => (
            <line
              key={idx}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${nodes[idx + 1].x}%`}
              y2={`${nodes[idx + 1].y}%`}
              stroke="rgba(251, 191, 36, 0.2)"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <div className="text-xs text-slate-400 text-center">Evolving governance network</div>
      <div className="absolute bottom-0 z-40 inset-x-0 h-20 bg-gradient-to-t from-slate-100/60 via-slate-100/60 to-transparent dark:from-slate-900/60 dark:via-slate-900/60 w-full pointer-events-none" />
    </div>
  );
};

const trackingCards = [
  {
    title: "Immutable Governance Events",
    description: "Every status, category, and deadline change is recorded as a permanent event, not overwritten state.",
    icon: History,
    color: "emerald",
    skeleton: <SkeletonOne />,
    className: "col-span-1 lg:col-span-3 border-b lg:border-r border-slate-200 dark:border-slate-700/50",
  },
  {
    title: "Who Is Actually Blocking Progress",
    description: "We determine whether a proposal is waiting on authors, editors, or the community based on real PR activity.",
    icon: GitBranch,
    color: "cyan",
    skeleton: <SkeletonTwo />,
    className: "col-span-1 lg:col-span-3 border-b border-slate-200 dark:border-slate-700/50",
  },
  {
    title: "Editor & Author Timelines",
    description: "Reviews, comments, commits, and responses are tracked as time-ordered events, not just labels.",
    icon: Clock,
    color: "blue",
    skeleton: <SkeletonThree />,
    className: "col-span-1 lg:col-span-2 lg:border-r border-slate-200 dark:border-slate-700/50",
  },
  {
    title: "ERC Migration Without History Loss",
    description: "Proposals that moved from EIPs to ERCs retain full lifecycle continuity across repositories.",
    icon: GitMerge,
    color: "violet",
    skeleton: <SkeletonFour />,
    className: "col-span-1 lg:col-span-2 border-slate-200 dark:border-slate-700/50",
  },
  {
    title: "RIPs Tracked Without Forced Lifecycle",
    description: "Rollup Improvement Proposals are recorded as evolving governance artifacts, not forced into EIP semantics.",
    icon: Network,
    color: "amber",
    skeleton: <SkeletonFive />,
    className: "col-span-1 lg:col-span-2 border-slate-200 dark:border-slate-700/50",
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { border: string; bg: string; icon: string; canvasColors: number[][] }> = {
    emerald: {
      border: "border-emerald-400/30",
      bg: "bg-emerald-500/10",
      icon: "text-emerald-700 dark:text-emerald-300",
      canvasColors: [[52, 211, 153], [34, 211, 238]],
    },
    cyan: {
      border: "border-cyan-400/30",
      bg: "bg-cyan-500/10",
      icon: "text-cyan-700 dark:text-cyan-300",
      canvasColors: [[34, 211, 238], [52, 211, 153]],
    },
    blue: {
      border: "border-blue-400/30",
      bg: "bg-blue-500/10",
      icon: "text-blue-700 dark:text-blue-300",
      canvasColors: [[59, 130, 246], [34, 211, 238]],
    },
    violet: {
      border: "border-violet-400/30",
      bg: "bg-violet-500/10",
      icon: "text-violet-700 dark:text-violet-300",
      canvasColors: [[139, 92, 246], [34, 211, 238]],
    },
    amber: {
      border: "border-amber-400/30",
      bg: "bg-amber-500/10",
      icon: "text-amber-700 dark:text-amber-300",
      canvasColors: [[251, 191, 36], [34, 211, 238]],
    },
  };
  return colors[color] || colors.cyan;
};


const FeatureCard = ({
  children,
  className,
  card,
  index,
}: {
  children?: React.ReactNode;
  className?: string;
  card: typeof trackingCards[0];
  index: number;
}) => {
  const [hovered, setHovered] = useState(false);
  const colors = getColorClasses(card.color);

  return (
        <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/canvas-card relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 p-4 sm:p-8 backdrop-blur-sm transition-all duration-300 cursor-default",
        className
      )}
    >
      {/* Canvas Reveal Effect */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <CanvasRevealEffect
              animationSpeed={2}
              containerClassName="bg-slate-100/80 dark:bg-slate-950/80"
              colors={colors.canvasColors}
              dotSize={1.5}
              showGradient={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-20">
        <FeatureTitle>{card.title}</FeatureTitle>
        <FeatureDescription>{card.description}</FeatureDescription>
        <div className="h-full w-full mt-4">{children}</div>
          </div>
        </motion.div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="max-w-5xl text-left tracking-tight text-slate-900 dark:text-white text-xl md:text-2xl md:leading-snug font-semibold">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="text-sm md:text-base text-left text-slate-600 dark:text-slate-300 max-w-sm my-2">
      {children}
    </p>
  );
};

export default function EthStandard() {
  return (
    <>
      <PageHeader
        title="What EIPsInsight Tracks?"
        description="Governance isn't just proposals. It's events, responsibility, and time."
        sectionId="what-we-track"
        className="bg-slate-100/40 dark:bg-slate-950/30"
      />
      <section className="relative w-full bg-slate-100/40 dark:bg-slate-950/30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-6 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
              {trackingCards.map((card, index) => (
                <FeatureCard key={card.title} className={card.className} card={card} index={index}>
                  {card.skeleton}
                </FeatureCard>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
