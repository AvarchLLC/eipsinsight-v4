"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ArrowRight, Clock, Activity, Info, Download } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart, Pie,  Label, AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { client } from "@/lib/orpc";
import { toast as sonnerToast } from "sonner";
import { PageHeader, SectionSeparator } from "@/components/header";

// Types for API responses
interface ActiveProposals {
  total: number;
  draft: number;
  review: number;
  lastCall: number;
}

interface LifecycleStage {
  stage: string;
  count: number;
  color: string;
  opacity: string;
}

interface StandardsMix {
  type: string;
  count: number;
  percentage: number;
  color: string;
  category: string;
  repository?: string;
}

interface RecentChange {
  eip: string;
  eip_type: string;
  title: string;
  from: string;
  to: string;
  days: number;
  statusColor: string;
  repository: string;
  changed_at: Date;
}

interface DecisionVelocity {
  current: number;
  previous: number;
  change: number;
}

interface PRData {
  number: string;
  title: string;
  author: string;
  status: string;
  days: number;
}

interface LastCallItem {
  eip: string;
  eip_type: string;
  title: string;
  deadline: string;
  daysRemaining: number;
  category: string | null;
  repository: string;
}

// Default/fallback data
const defaultActiveProposals: ActiveProposals = {
  total: 0,
  draft: 0,
  review: 0,
  lastCall: 0,
};

// Chart configuration for Active Proposals
const activeProposalsChartConfig = {
  proposals: {
    label: "Proposals",
  },
  draft: {
    label: "Draft",
    color: "#22d3ee",
  },
  review: {
    label: "Review",
    color: "#60a5fa",
  },
  lastCall: {
    label: "Last Call",
    color: "#fbbf24",
  },
} satisfies ChartConfig;

// Chart configuration for Standards Composition
const standardsChartConfig = {
  total: { label: "Total EIPs" },
  core: { label: "Core", color: "#10b981" },
  erc: { label: "ERC", color: "#22d3ee" },
  networking: { label: "Networking", color: "#60a5fa" },
  interface: { label: "Interface", color: "#a78bfa" },
  meta: { label: "Meta", color: "#f472b6" },
  informational: { label: "Informational", color: "#94a3b8" },
  other: { label: "Other", color: "#fb923c" },
} satisfies ChartConfig;

export type RepositoryFilter = 'all' | 'eips' | 'ercs' | 'rips';

const REPO_OPTIONS: { value: RepositoryFilter; label: string }[] = [
  { value: 'all', label: 'All Repositories' },
  { value: 'eips', label: 'ethereum/EIPs' },
  { value: 'ercs', label: 'ethereum/ERCs' },
  { value: 'rips', label: 'ethereum/RIPs' },
];

export default function ProtocolBento() {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [repoFilter, setRepoFilter] = useState<RepositoryFilter>('all');
  const [activeProposals, setActiveProposals] = useState<ActiveProposals>(defaultActiveProposals);
  const [lifecycleData, setLifecycleData] = useState<LifecycleStage[]>([]);
  const [standardsMix, setStandardsMix] = useState<StandardsMix[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [decisionVelocity, setDecisionVelocity] = useState<DecisionVelocity>({ current: 0, previous: 0, change: 0 });
  const [momentumData, setMomentumData] = useState<number[]>([]);
  const [prsData, setPrsData] = useState<PRData[]>([]);
  const [lastCallWatchlist, setLastCallWatchlist] = useState<LastCallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set(['Core', 'ERC', 'Networking', 'Interface', 'Meta', 'Informational', 'RIP']));

  const repoParam = repoFilter === 'all' ? undefined : repoFilter;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const repoArg = repoParam ? { repo: repoParam } : {};

        // Fetch all data in parallel with optional repository filter
        const [
          activeProposalsData,
          lifecycleDataRes,
          standardsMixData,
          recentChangesData,
          decisionVelocityData,
          momentumDataRes,
          prsDataRes,
          lastCallData
        ] = await Promise.all([
          client.analytics.getActiveProposals(repoArg),
          client.analytics.getLifecycleData(repoArg),
          client.analytics.getStandardsComposition(repoArg),
          client.analytics.getRecentChanges({ limit: 20, ...repoArg }),
          client.analytics.getDecisionVelocity(repoArg),
          client.analytics.getMomentumData({ months: 12, ...repoArg }),
          client.analytics.getRecentPRs({ limit: 3, ...repoArg }),
          client.analytics.getLastCallWatchlist(repoArg)
        ]);

        setActiveProposals(activeProposalsData);
        setLifecycleData(lifecycleDataRes);
        setStandardsMix(standardsMixData);
        setRecentChanges(recentChangesData);
        setDecisionVelocity(decisionVelocityData);
        setMomentumData(momentumDataRes);
        setPrsData(prsDataRes);
        setLastCallWatchlist(lastCallData);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        // Keep default/empty data on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repoParam]);

  const stagnationData = {
    count: lifecycleData.find(d => d.stage === "Stagnant")?.count || 0,
    medianInactivity: 8.5,
    topCategories: [
      { type: "ERC", count: 28 },
      { type: "Core", count: 15 },
      { type: "Meta", count: 12 },
    ],
  };

  if (loading) {
    return (
      <section className="relative overflow-hidden bg-background py-16">
        <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <TooltipProvider>
      <PageHeader
        indicator={{ icon: "activity", label: "Live", pulse: true }}
        title="Ethereum Proposal Snapshot"
        description="Live protocol heartbeat and governance insights"
        sectionId="protocol-bento"
        className="bg-background"
      />
      <section className="relative pt-5 overflow-hidden bg-background pb-8 sm:pb-12 lg:pb-16">
        <div className="container relative mx-auto max-w-7xl px-4 sm:px-4 md:px-6 lg:px-8">

        {/* Repository filter */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Repository</span>
          <div className="flex rounded-lg border border-slate-700/50 bg-slate-900/30 p-0.5">
            {REPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRepoFilter(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  repoFilter === opt.value
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Grid - 4-Column Symmetric Layout
            4 columns × 4 rows on desktop
            Each column = equal width
            Each row = 260px fixed height
            
            LAYOUT:
            Row 1: [Recent]     [Active Proposals] [Last Call]
            Row 2: [Recent]     [Standards Comp.] [Last Call]
            Row 3: [Lifecycle]  [Standards Comp.] [Momentum]
            Row 4: [Lifecycle]  [PRs] [Decision Velocity]
        */}
        <div className="grid grid-cols-1 gap-4 auto-rows-auto md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[260px]">
          
          {/* ==================== TOP BAND (Row 1) ==================== */}
          
          {/* Active Proposals - Cols 2-3, Row 1 (WIDE BOX - LEFT: GRAPH, RIGHT: NUMBERS) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="group relative col-span-1 order-2 overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-500/10 via-cyan-500/5 to-transparent p-4 sm:p-6 shadow-xl backdrop-blur transition-all hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/30 md:col-span-2 lg:col-span-2 lg:col-start-2 lg:row-start-1 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-blue-500/5" />
            
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Active Proposals
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-cyan-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        EIPs currently in Draft, Review, or Last Call. Represents active governance work.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {/* Live indicator and Download */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/20"
                        onClick={async () => {
                          try {
                            const data = await client.analytics.getActiveProposalsDetailed(repoParam ? { repo: repoParam } : {});
                            const csvData = data.map((d, index) => {
                              let prefix = 'EIP';
                              if (d.category === 'ERC') {
                                prefix = 'ERC';
                              } else if (d.repository?.includes('RIPs')) {
                                prefix = 'RIP';
                              }
                              
                              let repoUrl = '';
                              if (prefix === 'ERC') {
                                repoUrl = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${d.eip_number}.md`;
                              } else if (prefix === 'RIP') {
                                repoUrl = `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${d.eip_number}.md`;
                              } else {
                                repoUrl = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${d.eip_number}.md`;
                              }
                              
                              const date = 'N/A';
                              
                              return `${index + 1},${prefix}-${d.eip_number},"${d.title}",${d.status},${date},${d.repository || 'N/A'},${repoUrl}`;
                            });
                            const csv = "sr_number,eip_erc_rip_number,title,status,date,repository,link\n" + csvData.join("\n");
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "active-proposals-detailed.csv";
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("CSV Downloaded", {
                              description: `${data.length} active proposals exported successfully`,
                            });
                          } catch (error) {
                            console.error('Failed to download CSV:', error);
                            toast.error("Download Failed", {
                              description: "Could not export active proposals data",
                            });
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Download active proposals with full metadata</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                      className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 motion-reduce:animate-none motion-reduce:opacity-100"
                    />
                    <span className="text-xs font-medium text-emerald-300">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Content - LEFT: Recharts Donut, RIGHT: Number Breakdown */}
              <div className="flex flex-col lg:flex-row flex-1 items-center gap-6 lg:gap-8">
                {/* Left: Recharts Donut Chart */}
                <div className="flex flex-shrink-0 items-center justify-center">
                  <ChartContainer
                    config={activeProposalsChartConfig}
                    className="h-32 w-32 sm:h-36 sm:w-36 lg:h-40 lg:w-40"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={[
                          { status: 'draft', value: activeProposals.draft, fill: activeProposalsChartConfig.draft.color },
                          { status: 'review', value: activeProposals.review, fill: activeProposalsChartConfig.review.color },
                          { status: 'lastCall', value: activeProposals.lastCall, fill: activeProposalsChartConfig.lastCall.color }
                        ]}
                        dataKey="value"
                        nameKey="status"
                        innerRadius="65%"
                        outerRadius="88%"
                        strokeWidth={2}
                        paddingAngle={2}
                        animationBegin={200}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-cyan-300 text-3xl lg:text-4xl font-bold drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                                  >
                                    {activeProposals.total}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 20}
                                    className="fill-cyan-400/60 text-[9px] font-medium"
                                  >
                                    in motion
                                  </tspan>
                                </text>
                              )
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>

                {/* Right: Numbers breakdown */}
                <div className="flex flex-1 flex-col justify-center space-y-4 lg:space-y-6 w-full">
                  {/* Row 1: Draft and Review side by side */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                    <div className="flex items-baseline gap-2 sm:gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                      <div>
                        <div className="flex items-baseline gap-1 sm:gap-2">
                          <span className="text-2xl sm:text-3xl font-bold text-cyan-300">{activeProposals.draft}</span>
                          <span className="text-sm text-slate-400">Draft</span>
                        </div>
                        <div className="text-xs text-slate-500">{Math.round((activeProposals.draft / activeProposals.total) * 100)}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-blue-300">{activeProposals.review}</span>
                          <span className="text-sm text-slate-400">Review</span>
                        </div>
                        <div className="text-xs text-slate-500">{Math.round((activeProposals.review / activeProposals.total) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Row 2: Last Call centered, spanning full width */}
                  <div className="flex justify-center">
                    <div className="flex items-baseline gap-3">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-amber-300">{activeProposals.lastCall}</span>
                          <span className="text-sm text-slate-400">Last Call</span>
                        </div>
                        <div className="text-xs text-slate-500">{Math.round((activeProposals.lastCall / activeProposals.total) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Proposal Lifecycle - Col 1, Rows 3-4 (TALL LEFT BOTTOM) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="group relative col-span-1 order-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4 sm:p-6 shadow-lg backdrop-blur transition-all hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/20 lg:col-start-1 lg:row-start-3 lg:row-span-2 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                    Proposal Lifecycle
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Breakdown of EIPs across all formal lifecycle states defined in EIP-1.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/20"
                      onClick={async () => {
                        try {
                          const data = await client.analytics.getLifecycleDetailed(repoParam ? { repo: repoParam } : {});
                          const csv = "eip_number,type,title,status,category,repository,created_at\n" + data.map(d => `${d.eip_number},${d.type},"${d.title}",${d.status},${d.category || 'N/A'},${d.repository},${d.created_at}`).join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "eip-lifecycle-detailed.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("CSV Downloaded", {
                            description: `${data.length} lifecycle records exported successfully`,
                          });
                        } catch (error) {
                          console.error('Failed to download CSV:', error);
                          toast.error("Download Failed", {
                            description: "Could not export lifecycle data",
                          });
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download proposal counts by lifecycle status</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-2">
                {lifecycleData.map((stage, index) => {
                  const maxCount = Math.max(...lifecycleData.map((d) => d.count));
                  const width = (stage.count / maxCount) * 100;
                  const isDimmed = stage.opacity === "dim";
                  
                  const colorClasses = {
                    cyan: isDimmed ? "bg-cyan-400/20 border-cyan-400/30" : "bg-cyan-400/40 border-cyan-400/50",
                    blue: isDimmed ? "bg-blue-400/20 border-blue-400/30" : "bg-blue-400/40 border-blue-400/50",
                    amber: "bg-amber-400/40 border-amber-400/50",
                    emerald: isDimmed ? "bg-emerald-400/20 border-emerald-400/30" : "bg-emerald-400/40 border-emerald-400/50",
                    slate: "bg-slate-400/15 border-slate-400/25 border-dashed",
                    violet: "bg-violet-400/40 border-violet-400/50",
                    pink: "bg-pink-400/40 border-pink-400/50",
                    orange: "bg-orange-400/40 border-orange-400/50",
                  };
                  
                  const textColors = {
                    cyan: isDimmed ? "text-cyan-300/60" : "text-cyan-300",
                    blue: isDimmed ? "text-blue-300/60" : "text-blue-300",
                    amber: "text-amber-300",
                    emerald: isDimmed ? "text-emerald-300/60" : "text-emerald-300",
                    slate: "text-slate-400/60",
                    violet: "text-violet-300",
                    pink: "text-pink-300",
                    orange: "text-orange-300",
                  };
                  
                  return (
                    <div key={stage.stage} className="flex items-center gap-2">
                      <span className={`w-20 text-[11px] font-medium ${textColors[stage.color as keyof typeof textColors]}`}>
                        {stage.stage}
                      </span>
                      <div className="relative h-5 flex-1 overflow-hidden rounded-md border border-slate-700/50 bg-slate-900/30">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${width}%` }}
                          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                          transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                          className={`h-full ${colorClasses[stage.color as keyof typeof colorClasses]} ${isDimmed ? 'opacity-60' : ''} border-r-2`}
                        />
                      </div>
                      <span className={`w-10 text-right text-[11px] font-bold ${isDimmed ? 'text-white/40' : 'text-white'}`}>
                        {stage.count}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Footer with summary stats */}
              <div className="mt-4 space-y-2 border-t border-emerald-400/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total EIPs</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {lifecycleData.reduce((sum, d) => sum + d.count, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Active (Draft+Review)</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {lifecycleData.filter(d => d.stage === 'Draft' || d.stage === 'Review').reduce((sum, d) => sum + d.count, 0)}
                  </span>
                </div>
                <p className="pt-2 text-[10px] text-slate-600">
                  Draft → Review → Last Call → Final
                </p>
              </div>
            </div>
          </motion.div>

          {/* Standards Composition - Cols 2-3, Rows 2-3 (CENTER TILE) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="group relative col-span-1 md:col-span-2 order-6 overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/5 to-transparent p-4 sm:p-6 shadow-lg backdrop-blur transition-all hover:border-blue-400/40 hover:shadow-xl hover:shadow-blue-500/20 lg:col-span-2 lg:col-start-2 lg:row-start-2 lg:row-span-2 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300">
                    Standards Composition
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-blue-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Distribution of EIPs by proposal type and category. Click legend items to filter.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 transition-all hover:border-blue-400/40 hover:bg-blue-500/20"
                      onClick={async () => {
                        try {
                          const data = await client.analytics.getStandardsCompositionDetailed(repoParam ? { repo: repoParam } : {});
                          
                          // Filter data based on selected standards
                          const filteredData = data.filter(d => {
                            // Find matching standard to check repository
                            const matchingStandard = standardsMix.find(s => 
                              s.type === d.type || s.category === d.type
                            );
                            
                            // Check if it's a RIP based on repository field from standardsMix
                            const isRIP = matchingStandard?.repository === 'ethereum/RIPs';
                            
                            if (isRIP) {
                              return selectedStandards.has('RIP');
                            }
                            
                            // Determine display value same way as chart for non-RIPs
                            const displayValue = matchingStandard?.type === 'Standards Track' 
                              ? (matchingStandard.category || matchingStandard.type) 
                              : d.type;
                            return selectedStandards.has(displayValue);
                          });
                          
                          const csvData = filteredData.map((d, index) => {
                            let prefix = 'EIP';
                            let repository = 'ethereum/EIPs';
                            
                            // Find matching standard to check repository
                            const matchingStandard = standardsMix.find(s => 
                              s.type === d.type || s.category === d.type
                            );
                            
                            // Check repository field for RIPs (same as chart)
                            if (matchingStandard?.repository === 'ethereum/RIPs') {
                              prefix = 'RIP';
                              repository = 'ethereum/RIPs';
                            }
                            // Check type field for ERC
                            else if (d.type === 'ERC') {
                              prefix = 'ERC';
                              repository = 'ethereum/ERCs';
                            }
                            
                            let repoUrl = '';
                            if (prefix === 'RIP') {
                              repoUrl = `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${d.eip_number}.md`;
                            } else if (prefix === 'ERC') {
                              repoUrl = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${d.eip_number}.md`;
                            } else {
                              repoUrl = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${d.eip_number}.md`;
                            }
                            
                            // Find category from standardsMix
                            const matchingStandardForCategory = standardsMix.find(s => 
                              s.type === d.type || s.category === d.type
                            );
                            const category = matchingStandardForCategory?.category || '';
                            
                            return `${index + 1},${prefix}-${d.eip_number},"${d.title}",${d.type},${category},${d.status},${repository},${repoUrl}`;
                          });
                          const csv = "sr_number,eip_erc_rip_number,title,type,category,status,repository,link\n" + csvData.join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "standards-composition-detailed.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("CSV Downloaded", {
                            description: `${filteredData.length} standards records exported successfully`,
                          });
                        } catch (error) {
                          console.error('Failed to download CSV:', error);
                          toast.error("Download Failed", {
                            description: "Could not export standards composition data",
                          });
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5 text-blue-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download filtered standards with type & category</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Donut Chart & Legend */}
              <div className="relative flex flex-1 flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
                {/* Donut Chart */}
                <div className="relative flex items-center justify-center">
                  {/* EIPsInsight Watermark */}
                  <div className="absolute bottom-4 right-4 text-[10px] font-medium text-slate-600/40">
                    EIPsInsight
                  </div>
                  
                  <ChartContainer
                    config={standardsChartConfig}
                    className="h-56 w-56 sm:h-64 sm:w-64 lg:h-80 lg:w-80"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={(() => {
                          // Aggregate data properly: use category for Standards Track, type for others, and separate RIPs
                          const aggregated = standardsMix.reduce((acc, s) => {
                            // Check if it's a RIP based on repository field
                            const isRIP = s.repository === 'ethereum/RIPs';
                            
                            let displayValue: string;
                            if (isRIP) {
                              displayValue = 'RIP';
                            } else {
                              // For Standards Track items, use category (Core, ERC, etc.)
                              // For others (Meta, Informational), use type
                              displayValue = s.type === 'Standards Track' ? (s.category || s.type) : s.type;
                            }
                            
                            const existing = acc.find(item => item.label === displayValue);
                            
                            if (existing) {
                              existing.value += s.count;
                              existing.percentage += s.percentage;
                            } else {
                              // Assign colors based on the actual type/category, not backend color field
                              const typeColorMap: Record<string, string> = {
                                'Core': '#10b981',       // emerald
                                'ERC': '#22d3ee',        // cyan
                                'Networking': '#60a5fa', // blue
                                'Interface': '#a78bfa',  // violet
                                'Meta': '#f472b6',       // pink
                                'Informational': '#94a3b8', // slate
                                'RIP': '#fb923c'         // orange
                              };
                              acc.push({
                                type: displayValue.toLowerCase().replace(/\s+/g, ''),
                                value: s.count,
                                fill: typeColorMap[displayValue] || '#94a3b8',
                                label: displayValue,
                                percentage: s.percentage
                              });
                            }
                            return acc;
                          }, [] as Array<{ type: string; value: number; fill: string; label: string; percentage: number; }>);
                          
                          // Filter based on selected standards
                          return aggregated.filter(item => selectedStandards.has(item.label));
                        })()}
                        dataKey="value"
                        nameKey="type"
                        innerRadius="60%"
                        outerRadius="85%"
                        strokeWidth={3}
                        paddingAngle={3}
                        animationBegin={200}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const totalEIPs = standardsMix
                                .filter(s => {
                                  const isRIP = s.repository === 'ethereum/RIPs';
                                  let displayValue: string;
                                  if (isRIP) {
                                    displayValue = 'RIP';
                                  } else {
                                    displayValue = s.type === 'Standards Track' ? (s.category || s.type) : s.type;
                                  }
                                  return selectedStandards.has(displayValue);
                                })
                                .reduce((sum, s) => sum + s.count, 0);
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-white text-3xl lg:text-4xl font-bold drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]"
                                >
                                  {totalEIPs}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-slate-400 text-xs font-medium"
                                >
                                  Total EIPs
                                </tspan>
                              </text>
                            )
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                </div>
                
                {/* Interactive Legend */}
                <div className="flex flex-col gap-2">
                  {(() => {
                    const typeColorMap: Record<string, string> = {
                      'Core': '#10b981',
                      'ERC': '#22d3ee',
                      'Networking': '#60a5fa',
                      'Interface': '#a78bfa',
                      'Meta': '#f472b6',
                      'Informational': '#94a3b8',
                      'RIP': '#fb923c'
                    };
                    
                    // Get unique types for legend
                    const legendItems = standardsMix.reduce((acc, s) => {
                      const isRIP = s.repository === 'ethereum/RIPs';
                      let displayValue: string;
                      if (isRIP) {
                        displayValue = 'RIP';
                      } else {
                        displayValue = s.type === 'Standards Track' ? (s.category || s.type) : s.type;
                      }
                      
                      if (!acc.find(item => item.label === displayValue)) {
                        acc.push({
                          label: displayValue,
                          color: typeColorMap[displayValue] || '#94a3b8',
                          count: 0
                        });
                      }
                      const item = acc.find(item => item.label === displayValue);
                      if (item) item.count += s.count;
                      return acc;
                    }, [] as Array<{ label: string; color: string; count: number; }>);
                    
                    return legendItems.map(item => {
                      const isSelected = selectedStandards.has(item.label);
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            const newSelected = new Set(selectedStandards);
                            if (isSelected) {
                              newSelected.delete(item.label);
                            } else {
                              newSelected.add(item.label);
                            }
                            setSelectedStandards(newSelected);
                          }}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
                            isSelected
                              ? 'bg-slate-800/50 border border-blue-400/20 hover:border-blue-400/40'
                              : 'bg-slate-900/30 border border-slate-700/20 opacity-50 hover:opacity-70'
                          }`}
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: isSelected ? item.color : '#64748b',
                            }}
                          />
                          <div className="flex flex-1 flex-col">
                            <span className={`text-xs font-medium ${
                              isSelected ? 'text-slate-200' : 'text-slate-500'
                            }`}>
                              {item.label}
                            </span>
                            <span className={`text-[10px] ${
                              isSelected ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {item.count} EIPs
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==================== GOVERNANCE DYNAMICS ==================== */}

          {/* Momentum - Col 4, Row 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative col-span-1 order-4 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur transition-all hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-500/20 lg:col-start-4 lg:row-start-3 bg-dot-white/[0.02] lg:hover:scale-[1.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">
                      Momentum
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-violet-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Rolling activity trend showing proposal throughput over time.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">Proposal throughput over time</p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">
                    {momentumData.length >= 2 ? 
                      `${momentumData[momentumData.length - 1] > momentumData[momentumData.length - 2] ? '+' : ''}${Math.round(((momentumData[momentumData.length - 1] - momentumData[momentumData.length - 2]) / momentumData[momentumData.length - 2]) * 100)}%` 
                      : '+0%'}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="relative flex-1">
                <ChartContainer
                  config={{
                    activity: {
                      label: "Activity",
                      color: "#a78bfa",
                    },
                  } satisfies ChartConfig}
                  className="h-full w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={momentumData.map((value, index) => ({
                      month: new Date(Date.now() - (momentumData.length - 1 - index) * 30 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('en-US', { month: 'short' }),
                      activity: value,
                    }))}
                    margin={{
                      left: -20,
                      right: 12,
                      top: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickCount={4}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Area
                      dataKey="activity"
                      type="monotone"
                      fill="#a78bfa"
                      fillOpacity={0.3}
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
              
              {/* Footer */}
              {/* <div className="mt-4 flex items-center justify-between border-t border-violet-400/10 pt-3">
                <span className="text-xs text-slate-400">
                  {momentumData.length > 0 ? `${momentumData[momentumData.length - 1]} this month` : 'No data'}
                </span>
                <span className="text-xs text-slate-500">Last {momentumData.length}mo</span>
              </div> */}
            </div>
          </motion.div>

          {/* Recent Changes - Col 1, Rows 1-2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="group relative col-span-1 order-1 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/5 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur transition-all hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-500/20 lg:col-start-1 lg:row-start-1 lg:row-span-2 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Recent Changes
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-cyan-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Latest lifecycle transitions recorded in the EIPs repository.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/20"
                        onClick={() => {
                          try {
                            const csvData = recentChanges.map((d, index) => {
                              let repoUrl = '';
                              if (d.eip_type === 'ERC') {
                                repoUrl = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${d.eip}.md`;
                              } else if (d.eip_type === 'RIP') {
                                repoUrl = `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${d.eip}.md`;
                              } else {
                                repoUrl = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${d.eip}.md`;
                              }
                              const date = new Date(d.changed_at).toISOString().split('T')[0];
                              return `${index + 1},${d.eip_type}-${d.eip},"${d.title}",${d.from},${d.to},${date},${d.repository},${repoUrl}`;
                            });
                            const csv = "sr_number,eip_erc_rip_number,title,from_status,to_status,date,repository,link\n" + csvData.join("\n");
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "recent-changes-detailed.csv";
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("CSV Downloaded", {
                              description: `${recentChanges.length} recent changes exported successfully`,
                            });
                          } catch (error) {
                            console.error('Failed to download CSV:', error);
                            toast.error("Download Failed", {
                              description: "Could not export recent changes data",
                            });
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Download recent lifecycle transitions</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 motion-reduce:animate-none motion-reduce:opacity-100"
                    />
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
              
              {/* Content - Scrollable */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 max-h-[260px] lg:max-h-none scrollbar-thin scrollbar-track-slate-900/50 scrollbar-thumb-cyan-500/30 hover:scrollbar-thumb-cyan-500/50">
                {recentChanges.slice(0, isMobile ? 5 : 10).map((change, index) => {
                  const statusColors = {
                    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
                    blue: "bg-blue-500/20 text-blue-300 border-blue-400/30",
                    amber: "bg-amber-500/20 text-amber-300 border-amber-400/30",
                    slate: "bg-slate-500/20 text-slate-300 border-slate-400/30",
                  };
                  const eipLink = change.repository === 'ethereum/RIPs' 
                    ? `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${change.eip}.md`
                    : `https://eips.ethereum.org/EIPS/eip-${change.eip}`;
                  return (
                    <motion.a
                      key={`${change.eip}-${index}`}
                      href={eipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
                      className="group/item block cursor-pointer rounded-lg border border-slate-700/50 bg-slate-900/30 p-2.5 transition-all hover:border-cyan-400/40 hover:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-cyan-300">{change.eip_type}-{change.eip}</span>
                            <span className="text-[10px] text-slate-500">{change.from}</span>
                            <ArrowRight className="h-2.5 w-2.5 text-slate-600" />
                            <span className={`rounded-md border px-1 py-0.5 text-[9px] font-semibold ${statusColors[change.statusColor as keyof typeof statusColors]}`}>
                              {change.to}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500 line-clamp-1">{change.title}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{change.days}d</span>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
              
              {/* Footer */}
              <p className="mt-4 text-xs text-slate-500">Last 7 days · {recentChanges.length} changes</p>
            </div>
          </motion.div>

          {/* Decision Velocity - Cols 3-4, Row 4 (WIDE BOTTOM-RIGHT) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="group relative col-span-1 md:col-span-2 order-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6 lg:p-8 shadow-2xl backdrop-blur transition-all hover:border-emerald-400/50 hover:shadow-[0_20px_70px_rgba(16,185,129,0.3)] lg:col-span-2 lg:col-start-3 lg:row-start-4 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/5 via-transparent to-cyan-500/5" />
            
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                    Decision Velocity
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Median time taken for EIPs to move from Draft to Final.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-500">Lower is better ↓ · Reflects governance efficiency</p>
              </div>

              {/* Content - centered */}
              <div className="flex flex-1 flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-center"
                >
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                      {decisionVelocity.current}
                    </span>
                    <span className="text-xl sm:text-2xl text-slate-400">days</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">median to finalization</p>
                </motion.div>
                
                {/* Comparison */}
                <div className="mt-6 sm:mt-8 lg:mt-12 w-full max-w-xs">
                  <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>This year</span>
                    <span>Last year</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                    <div className="relative flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800/50 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                          transition={{ duration: 1, delay: 0.6 }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-400/50"
                        />
                      </div>
                      <span className="absolute -top-6 left-0 text-sm font-bold text-emerald-300">
                        {decisionVelocity.current}d
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800/50 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(decisionVelocity.current / decisionVelocity.previous) * 100}%` }}
                          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                          transition={{ duration: 1, delay: 0.6 }}
                          className="h-full bg-slate-500/70"
                        />
                      </div>
                      <span className="absolute -top-6 right-0 text-sm font-bold text-slate-400">
                        {decisionVelocity.previous}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Improvement badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="mt-8 flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2"
                >
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">{Math.abs(decisionVelocity.change)}% faster</span>
                  <span className="text-sm text-slate-400">YoY</span>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-emerald-400/10 pt-4">
                <p className="text-center text-xs text-slate-500">
                  Governance is accelerating
                </p>
              </div>
            </div>
          </motion.div>

          {/* Last Call Watchlist - Col 4, Rows 1-2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="group relative col-span-1 order-3 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur transition-all hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/20 lg:col-start-4 lg:row-start-1 lg:row-span-2 bg-dot-white/[0.02] lg:hover:scale-[1.01]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    Last Call Watchlist
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-amber-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        EIPs in their final review window before Finalization.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 transition-all hover:border-amber-400/40 hover:bg-amber-500/20"
                      onClick={() => {
                        try {
                          const csvData = lastCallWatchlist.map((d, index) => {
                            let repoUrl = '';
                            if (d.eip_type === 'ERC') {
                              repoUrl = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${d.eip}.md`;
                            } else if (d.eip_type === 'RIP') {
                              repoUrl = `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${d.eip}.md`;
                            } else {
                              repoUrl = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${d.eip}.md`;
                            }
                            return `${index + 1},${d.eip_type}-${d.eip},"${d.title}",${d.deadline},${d.daysRemaining},${repoUrl}`;
                          });
                          const csv = "sr_number,eip_erc_rip_number,title,deadline,days_remaining,link\n" + csvData.join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "eip-last-call-watchlist.csv";
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("CSV Downloaded", {
                            description: `${lastCallWatchlist.length} Last Call proposals exported successfully`,
                          });
                        } catch (error) {
                          console.error('Failed to download CSV:', error);
                          toast.error("Download Failed", {
                            description: "Could not export Last Call watchlist data",
                          });
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5 text-amber-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download Last Call proposals with deadlines</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-2.5">
                {lastCallWatchlist.slice(0, 6).map((item, index) => {
                  const urgency = item.daysRemaining <= 7 ? "urgent" : "normal";
                  const eipLink = item.repository === 'ethereum/RIPs'
                    ? `https://github.com/ethereum/RIPs/blob/master/RIPS/rip-${item.eip}.md`
                    : `https://eips.ethereum.org/EIPS/eip-${item.eip}`;
                  return (
                    <motion.a
                      key={item.eip}
                      href={eipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                      transition={{ duration: 0.3 }}
                      className={`group/item block rounded-lg border p-3 transition-all ${
                        urgency === "urgent"
                          ? "border-red-400/30 bg-red-500/10 hover:border-red-400/50 hover:bg-red-500/15"
                          : "border-amber-400/20 bg-amber-500/5 hover:border-amber-400/40 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6">
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-amber-300">{item.eip_type || 'EIP'}-{item.eip}</span>
                            <span className={`text-[10px] font-bold ${urgency === "urgent" ? "text-red-400" : "text-amber-400"}`}>
                              {Math.abs(item.daysRemaining)}d {item.daysRemaining < 0 ? 'overdue' : 'left'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{item.title}</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <span className="text-[10px] text-slate-500 block">Deadline</span>
                          <span className="text-xs text-amber-300 font-medium">{new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
              
              {/* Footer */}
              <p className="mt-4 text-xs text-slate-500">Review window closing soon</p>
            </div>
          </motion.div>

          {/* Stagnation Radar - Hidden in main grid, can be shown elsewhere */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="group relative col-span-1 order-7 hidden overflow-hidden rounded-2xl border border-slate-400/20 bg-gradient-to-br from-slate-500/5 to-transparent p-5 shadow-lg backdrop-blur transition hover:border-slate-400/30"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-3 flex items-center gap-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Stagnation
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="cursor-help">
                      <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-slate-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Draft or Review EIPs inactive for ≥6 months.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Compact */}
              <div className="flex flex-1 items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="text-center"
                >
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-slate-300">{stagnationData.count}</span>
                    <span className="text-sm text-slate-500">EIPs</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{stagnationData.medianInactivity}mo median</p>
                </motion.div>
              </div>
              
              {/* Footer */}
              <p className="mt-3 text-xs text-slate-500">Need attention</p>
            </div>
          </motion.div>

          {/* PRs - Col 2, Row 4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="group relative col-span-1 order-9 overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4 sm:p-5 shadow-lg backdrop-blur transition-all hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/20 lg:col-start-2 lg:row-start-4 bg-dot-white/[0.02] lg:hover:scale-[1.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-3 flex items-center gap-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                  Recent PRs
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="cursor-help">
                      <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Latest pull requests to the EIPs repository.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Scrollable */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-900/50 scrollbar-thumb-emerald-500/30 hover:scrollbar-thumb-emerald-500/50">
                {prsData.slice(0, isMobile ? 2 : prsData.length).map((pr, index) => {
                  const statusColors = {
                    merged: "bg-violet-500/20 text-violet-300 border-violet-400/30",
                    open: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
                  };
                  const prUrl = `https://github.com/ethereum/EIPs/pull/${pr.number}`;
                  return (
                    <motion.a
                      key={pr.number}
                      href={prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group/item block rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 transition-all hover:border-emerald-400/40 hover:bg-slate-900/50 hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-300">#{pr.number}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[pr.status as keyof typeof statusColors]}`}>
                            {pr.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{pr.days}d ago</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-1 group-hover/item:text-white transition-colors">{pr.title}</p>
                        <span className="text-[10px] text-slate-500">by <span className="text-emerald-400">{pr.author}</span></span>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
              
              {/* Footer */}
              <p className="mt-3 text-xs text-slate-500">GitHub activity</p>
            </div>
          </motion.div>
        </div>
        

        {/* How to Contribute Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 p-6 backdrop-blur lg:p-8"
        >
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-bold text-cyan-300">
                Want to shape Ethereum&apos;s future?
              </h3>
              <p className="text-sm text-slate-400">
                Anyone can propose an EIP. Here&apos;s how to get started:
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Read EIP-1</p>
                    <p className="text-[10px] text-slate-500">Understand the process</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Use the template</p>
                    <p className="text-[10px] text-slate-500">Fork ethereum/EIPs repo</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Submit PR</p>
                    <p className="text-[10px] text-slate-500">Open for community review</p>
                  </div>
                </div>
              </div>
            </div>
            <a
              href="https://github.com/ethereum/EIPs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              View on GitHub
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
    </TooltipProvider>
  );
}
function useToast() {
  return {
    toast: sonnerToast,
  };
}

