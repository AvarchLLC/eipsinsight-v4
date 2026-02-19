"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ArrowRight, Clock, Activity, Info, Download, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart, Pie, Label, AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { client } from "@/lib/orpc";
import { toast as sonnerToast } from "sonner";

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

interface DecisionVelocityTransition {
  from: string;
  to: string;
  medianDays: number | null;
  count: number;
}

interface DecisionVelocity {
  transitions: DecisionVelocityTransition[];
  draftToFinalMedian: number;
  previousYearPlaceholder: number;
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
  const [decisionVelocity, setDecisionVelocity] = useState<DecisionVelocity>({
    transitions: [],
    draftToFinalMedian: 0,
    previousYearPlaceholder: 0,
    change: 0,
  });
  const [momentumData, setMomentumData] = useState<number[]>([]);
  const [prsData, setPrsData] = useState<PRData[]>([]);
  const [lastCallWatchlist, setLastCallWatchlist] = useState<LastCallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set(['Core', 'ERC', 'Networking', 'Interface', 'Meta', 'Informational', 'RIP']));
  const [selectedActiveStatuses, setSelectedActiveStatuses] = useState<Set<string>>(new Set(['draft', 'review', 'lastCall']));
  const [velocityChartMode, setVelocityChartMode] = useState<'bars' | 'line'>('bars');

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
        const data = await client.dashboard.getProtocolBentoData({
          repo: repoParam,
          recentChangesLimit: 20,
          recentPRsLimit: 3,
        });

        setActiveProposals(data.activeProposals);
        setLifecycleData(data.lifecycleData);
        setStandardsMix(data.standardsComposition);
        setRecentChanges(data.recentChanges);
        setDecisionVelocity(data.decisionVelocity);
        setMomentumData(data.momentumData);
        setPrsData(data.recentPRs);
        setLastCallWatchlist(data.lastCallWatchlist);
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
      <section className="relative overflow-hidden py-16">
        <div className="relative w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-cyan-400 border-t-transparent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <TooltipProvider>
      <section id="protocol-bento" className="relative overflow-hidden pt-2 pb-4">
        <header className="mb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
            Ethereum Proposal Snapshot
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">
            Real-time analytics across EIPs, ERCs, and RIPs
          </p>
        </header>
        <div className="relative w-full max-w-full px-0">

        {/* Repository filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filter by Repository</span>
          <div className="flex flex-wrap gap-2">
            {REPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRepoFilter(opt.value)}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                  repoFilter === opt.value
                    ? 'bg-slate-200 dark:bg-cyan-500/20 text-slate-800 dark:text-cyan-300 border-2 border-slate-300 dark:border-cyan-400/40 dark:shadow-lg dark:shadow-cyan-500/20'
                    : 'text-slate-600 dark:text-slate-400 border-2 border-slate-300 dark:border-slate-700/30 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-600/50'
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
            className="group relative col-span-1 order-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-cyan-400/30 bg-white dark:bg-slate-900/70 p-5 sm:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-cyan-400/50 md:col-span-2 lg:col-span-2 lg:col-start-2 lg:row-start-1 bg-dot-white/[0.02] dark:bg-dot-white/[0.02]"
          >
            {/* Subtle inner glow - dark mode only */}
            <div className="absolute inset-0 dark:bg-linear-to-br dark:from-cyan-400/5 dark:via-transparent dark:to-blue-500/5 pointer-events-none" />
            
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">
                      Active Proposals
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-cyan-600 dark:hover:text-cyan-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          EIPs currently in Draft, Review, or Last Call states. These represent active governance work in progress.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Current governance activity</p>
                </div>
                {/* Live indicator and Download */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 dark:border-cyan-400/20 bg-slate-100 dark:bg-cyan-500/10 transition-all hover:border-slate-300 dark:hover:border-cyan-400/40 hover:bg-slate-200 dark:hover:bg-cyan-500/20"
                        onClick={async () => {
                          try {
                            const data = await client.analytics.getActiveProposalsDetailed(repoParam ? { repo: repoParam } : {});
                            // Filter by selected statuses
                            const statusMap = { draft: 'Draft', review: 'Review', lastCall: 'Last Call' };
                            const selectedStatusNames = Array.from(selectedActiveStatuses).map(key => statusMap[key as keyof typeof statusMap]);
                            const filteredData = data.filter(d => selectedStatusNames.includes(d.status));
                            
                            const csvData = filteredData.map((d, index) => {
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
                              description: `${filteredData.length} active proposals exported successfully`,
                            });
                          } catch (error) {
                            console.error('Failed to download CSV:', error);
                            toast.error("Download Failed", {
                              description: "Could not export active proposals data",
                            });
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
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
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Content - Compact Stacked Bar with Integrated Filters */}
              <div className="flex flex-col flex-1 justify-center gap-4">
                {/* Main Visualization Container */}
                <div className="flex flex-col gap-3">
                  {/* Total Count Display */}
                  <div className="text-center space-y-0.5">
                    <div className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-cyan-300 tabular-nums dark:drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                      {(selectedActiveStatuses.has('draft') ? activeProposals.draft : 0) +
                       (selectedActiveStatuses.has('review') ? activeProposals.review : 0) +
                       (selectedActiveStatuses.has('lastCall') ? activeProposals.lastCall : 0)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Active Proposals</div>
                  </div>

                  {/* Compact Stacked Progress Bar */}
                  <div className="relative space-y-3">
                    <div className="h-10 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/40 flex shadow-inner backdrop-blur-sm">
                      {selectedActiveStatuses.has('draft') && activeProposals.draft > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(activeProposals.draft / activeProposals.total) * 100}%` 
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-linear-to-r from-cyan-500 via-cyan-400 to-cyan-500 flex items-center justify-center relative group cursor-pointer"
                          onClick={() => {
                            const newSelected = new Set(selectedActiveStatuses);
                            newSelected.delete('draft');
                            setSelectedActiveStatuses(newSelected);
                          }}
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                          <span className="relative text-sm font-bold text-white drop-shadow-lg z-10">
                            {activeProposals.draft}
                          </span>
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-all duration-300" />
                        </motion.div>
                      )}
                      {selectedActiveStatuses.has('review') && activeProposals.review > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(activeProposals.review / activeProposals.total) * 100}%` 
                          }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
                          className="bg-linear-to-r from-blue-500 via-blue-400 to-blue-500 flex items-center justify-center relative group cursor-pointer"
                          onClick={() => {
                            const newSelected = new Set(selectedActiveStatuses);
                            newSelected.delete('review');
                            setSelectedActiveStatuses(newSelected);
                          }}
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                          <span className="relative text-sm font-bold text-white drop-shadow-lg z-10">
                            {activeProposals.review}
                          </span>
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-all duration-300" />
                        </motion.div>
                      )}
                      {selectedActiveStatuses.has('lastCall') && activeProposals.lastCall > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(activeProposals.lastCall / activeProposals.total) * 100}%` 
                          }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                          className="bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 flex items-center justify-center relative group cursor-pointer"
                          onClick={() => {
                            const newSelected = new Set(selectedActiveStatuses);
                            newSelected.delete('lastCall');
                            setSelectedActiveStatuses(newSelected);
                          }}
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                          <span className="relative text-sm font-bold text-white drop-shadow-lg z-10">
                            {activeProposals.lastCall}
                          </span>
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-all duration-300" />
                        </motion.div>
                      )}
                    </div>

                    {/* Compact Legend Pills Below Bar */}
                    <div className="flex items-center justify-center gap-2.5">
                  {[
                    { key: 'draft', label: 'Draft', count: activeProposals.draft, color: 'cyan' },
                    { key: 'review', label: 'Review', count: activeProposals.review, color: 'blue' },
                    { key: 'lastCall', label: 'Last Call', count: activeProposals.lastCall, color: 'amber' }
                  ].map((status) => {
                    const isSelected = selectedActiveStatuses.has(status.key);
                    const colorMap = {
                      cyan: { bg: 'bg-cyan-400', ring: 'ring-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400/30', hoverBorder: 'hover:border-cyan-400/50' },
                      blue: { bg: 'bg-blue-400', ring: 'ring-blue-400/20', text: 'text-blue-300', border: 'border-blue-400/30', hoverBorder: 'hover:border-blue-400/50' },
                      amber: { bg: 'bg-amber-400', ring: 'ring-amber-400/20', text: 'text-amber-300', border: 'border-amber-400/30', hoverBorder: 'hover:border-amber-400/50' }
                    };
                    const colors = colorMap[status.color as keyof typeof colorMap];
                    
                    return (
                      <button
                        key={status.key}
                        onClick={() => {
                          const newSelected = new Set(selectedActiveStatuses);
                          if (isSelected) {
                            newSelected.delete(status.key);
                          } else {
                            newSelected.add(status.key);
                          }
                          setSelectedActiveStatuses(newSelected);
                        }}
                        className={`group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-left transition-all cursor-pointer ${
                          isSelected
                            ? `bg-slate-200 dark:bg-slate-800/60 border ${colors.border} shadow-sm`
                            : 'bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30 opacity-60 dark:opacity-40 hover:opacity-80 dark:hover:opacity-70 hover:border-slate-300 dark:hover:border-slate-600/50'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? colors.bg : 'bg-slate-600'} ${isSelected ? 'shadow-sm shadow-' + status.color + '-400/50' : ''}`} />
                        <span className={`text-[10px] font-semibold whitespace-nowrap ${isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>
                          {status.label}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${isSelected ? colors.text : 'text-slate-600'}`}>
                          {status.count}
                        </span>
                      </button>
                    );
                  })}
                    </div>

                    {/* Branding - moved to bottom right of container */}
                    <div className="absolute -bottom-6 right-0 text-[9px] font-medium text-slate-600/50">
                      eipsinsight.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Proposal Lifecycle - Col 2, Row 4 (single row, right column on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="group relative col-span-1 order-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-emerald-400/20 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-emerald-400/40 lg:col-start-2 lg:row-start-4 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full min-h-0 flex-col">
              {/* Header - compact */}
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Proposal Lifecycle
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300" />
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
                      className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-slate-200 dark:border-emerald-400/20 bg-slate-100 dark:bg-emerald-500/10 transition-all hover:border-slate-300 dark:hover:border-emerald-400/40 hover:bg-slate-200 dark:hover:bg-emerald-500/20"
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
                      <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download proposal counts by lifecycle status</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Bar chart - no scroll */}
              {lifecycleData.length > 0 ? (
                <div className="flex flex-1 min-h-0 flex-col">
                  <ChartContainer
                    config={{ count: { label: "Proposals", color: "#34d399" } }}
                    className="h-full w-full min-h-[140px]"
                  >
                    <BarChart
                      data={lifecycleData.map((d) => ({ stage: d.stage, count: d.count, fill: ({ cyan: "#22d3ee", blue: "#60a5fa", amber: "#fbbf24", emerald: "#34d399", slate: "#64748b", violet: "#a78bfa", red: "#f87171" } as Record<string, string>)[d.color] ?? "#94a3b8" }))}
                      layout="vertical"
                      margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="stage" width={52} tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} layout="vertical">
                        {lifecycleData.map((d, i) => (
                          <Cell key={d.stage} fill={({ cyan: "#22d3ee", blue: "#60a5fa", amber: "#fbbf24", emerald: "#34d399", slate: "#64748b", violet: "#a78bfa", red: "#f87171" } as Record<string, string>)[d.color] ?? "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <p className="mt-1 shrink-0 text-center text-[10px] text-slate-500">
                    Total {lifecycleData.reduce((s, d) => s + d.count, 0)} · Draft→Review→Last Call→Final
                  </p>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">No lifecycle data</p>
              )}
            </div>
          </motion.div>

          {/* Standards Composition - Cols 2-3, Rows 2-3 (CENTER TILE) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="group relative col-span-1 md:col-span-2 order-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-blue-400/20 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-blue-400/40 lg:col-span-2 lg:col-start-2 lg:row-start-2 lg:row-span-2 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      EIP Types
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-blue-600 dark:hover:text-blue-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-xs font-semibold mb-1">Standards Track</p>
                        <p className="text-xs text-slate-400 mb-2">Changes affecting Ethereum implementations (Core, Networking, Interface, ERC)</p>
                        <p className="text-xs font-semibold mb-1">Meta</p>
                        <p className="text-xs text-slate-400 mb-2">Process changes and guidelines</p>
                        <p className="text-xs font-semibold mb-1">Informational</p>
                        <p className="text-xs text-slate-400">Design issues and general information</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Distribution by type and category</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 dark:border-blue-400/20 bg-slate-100 dark:bg-blue-500/10 transition-all hover:border-slate-300 dark:hover:border-blue-400/40 hover:bg-slate-200 dark:hover:bg-blue-500/20"
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
                      <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download filtered standards with type & category</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Donut Chart & Legend */}
              {standardsMix.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="rounded-full bg-slate-800/50 p-6">
                        <BarChart3 className="h-12 w-12 text-slate-600" />
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-400 mb-2">No Data Available</h4>
                    <p className="text-sm text-slate-500 max-w-sm">
                      {repoFilter === 'rips' 
                        ? 'RIP data is not yet available. RIPs (Rollup Improvement Proposals) are tracked separately.'
                        : 'No proposal data found for the selected repository filter.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-1 flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
                  {/* Donut Chart */}
                  <div className="relative flex items-center justify-center">
                    {/* EIPsInsight Branding */}
                    <div className="absolute -bottom-2 right-2 text-[9px] font-medium text-slate-600/50">
                      eipsinsight.com
                    </div>
                    
                    <ChartContainer
                      config={standardsChartConfig}
                      className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72"
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
                  
                  {/* Compact Interactive Legend */}
                  <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[180px]">
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
                          className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-all ${
                            isSelected
                              ? 'bg-slate-800/50 border border-blue-400/30 hover:border-blue-400/50'
                              : 'bg-slate-900/30 border border-slate-700/20 opacity-50 hover:opacity-75 hover:border-slate-600/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: isSelected ? item.color : '#64748b',
                              }}
                            />
                            <span className={`text-xs font-semibold ${
                              isSelected ? 'text-slate-100' : 'text-slate-500'
                            }`}>
                              {item.label}
                            </span>
                          </div>
                          <span className={`text-sm font-bold tabular-nums ${
                            isSelected ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {item.count}
                          </span>
                        </button>
                      );
                    });
                  })()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================== GOVERNANCE DYNAMICS ==================== */}

          {/* Momentum - Col 4, Row 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative col-span-1 order-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-violet-400/20 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-violet-400/40 lg:col-start-4 lg:row-start-3 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                      Momentum
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-violet-600 dark:hover:text-violet-300" />
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
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
            className="group relative col-span-1 order-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/70 p-5 sm:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-cyan-400/40 lg:col-start-1 lg:row-start-1 lg:row-span-2 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-300">
                      Recent Changes
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-cyan-600 dark:hover:text-cyan-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Latest lifecycle transitions recorded in the EIPs repository.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Real-time status updates</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 dark:border-cyan-400/20 bg-slate-100 dark:bg-cyan-500/10 transition-all hover:border-slate-300 dark:hover:border-cyan-400/40 hover:bg-slate-200 dark:hover:bg-cyan-500/20"
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
                        <Download className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
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
              
              {/* Content - Scrollable with custom scrollbar */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[260px] lg:max-h-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-800/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-cyan-500/60">
                {recentChanges.slice(0, isMobile ? 5 : 10).map((change, index) => {
                  const statusColors = {
                    emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30",
                    blue: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/30",
                    amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/30",
                    slate: "bg-slate-200 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-400/30",
                    cyan: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/30",
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
                      className="group/item block cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 p-2.5 transition-all hover:border-slate-300 dark:hover:border-cyan-400/40 hover:bg-slate-100 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-cyan-300">{change.eip_type}-{change.eip}</span>
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
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-cyan-400/10">
                <p className="text-xs text-slate-500 font-medium">Last 7 days · {recentChanges.length} changes tracked</p>
              </div>
            </div>
          </motion.div>

          {/* Decision Velocity - Cols 3-4, Row 4 (WIDE BOTTOM-RIGHT) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="group relative col-span-1 md:col-span-2 order-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-emerald-400/30 bg-white dark:bg-slate-900/70 p-5 sm:p-6 lg:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-emerald-400/50 lg:col-span-2 lg:col-start-3 lg:row-start-4 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full min-h-0 flex-col">
              {/* Header - compact + toggle */}
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Decision Velocity
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="cursor-help">
                        <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Median time between lifecycle transitions (last 365 days). Toggle to see bars or line trend.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-900/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setVelocityChartMode("bars")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${velocityChartMode === "bars" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                    title="Bar view"
                  >
                    <BarChart3 className="h-3 w-3" />
                    Bars
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityChartMode("line")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${velocityChartMode === "line" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                    title="Line chart"
                  >
                    <LineChartIcon className="h-3 w-3" />
                    Line
                  </button>
                </div>
              </div>

              {/* Content - bars or line chart */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                {decisionVelocity.transitions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No transition data in the last 365 days</p>
                ) : velocityChartMode === "line" ? (
                  <ChartContainer
                    config={{ days: { label: "Median days", color: "#34d399" } }}
                    className="h-full w-full min-h-[160px]"
                  >
                    <LineChart
                      data={decisionVelocity.transitions.map((t) => ({
                        name: `${t.from}→${t.to}`,
                        days: t.medianDays ?? 0,
                        count: t.count,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                      <Line type="monotone" dataKey="days" stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} name="Median days" />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <>
                    {decisionVelocity.draftToFinalMedian > 0 && (
                      <div className="shrink-0 mb-1.5 rounded-lg border border-slate-200 dark:border-emerald-400/20 bg-slate-50 dark:bg-emerald-500/10 px-2 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Draft → Final</span>
                          <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{decisionVelocity.draftToFinalMedian}d</span>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
                      {decisionVelocity.transitions.map((t, i) => {
                        const maxDays = Math.max(1, ...decisionVelocity.transitions.map((x) => x.medianDays ?? 0));
                        const barPct = t.medianDays != null ? Math.min(100, (t.medianDays / maxDays) * 100) : 0;
                        return (
                          <div key={`${t.from}-${t.to}`} className="flex items-center gap-2 shrink-0">
                            <span className="w-20 shrink-0 truncate text-[10px] text-slate-400" title={`${t.from} → ${t.to}`}>
                              {t.from}→{t.to}
                            </span>
                            <div className="relative h-2 flex-1 min-w-0 overflow-hidden rounded-full bg-slate-800/50">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${barPct}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.04 }}
                                className="h-full rounded-full bg-emerald-400/80"
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right text-[10px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                              {t.medianDays != null ? `${t.medianDays}d` : "—"}
                            </span>
                            <span className="w-6 shrink-0 text-right text-[10px] text-slate-500">n{t.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <p className="shrink-0 border-t border-slate-200 dark:border-emerald-400/10 pt-2 text-center text-[10px] text-slate-500">
                Last 365 days · median days
              </p>
            </div>
          </motion.div>

          {/* Last Call Watchlist - Col 4, Rows 1-2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="group relative col-span-1 order-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-amber-400/30 bg-white dark:bg-slate-900/70 p-5 sm:p-6 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-amber-400/50 lg:col-start-4 lg:row-start-1 lg:row-span-2 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Last Call Watchlist
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-amber-600 dark:hover:text-amber-300" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          EIPs in their final review window before finalization. Community feedback is crucial now.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Final review period</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-slate-200 dark:border-amber-400/20 bg-slate-100 dark:bg-amber-500/10 transition-all hover:border-slate-300 dark:hover:border-amber-400/40 hover:bg-slate-200 dark:hover:bg-amber-500/20"
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
                      <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Download Last Call proposals with deadlines</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Scrollable with custom scrollbar */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[320px] lg:max-h-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-200 dark:bg-slate-800/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 dark:bg-amber-500/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-500 dark:hover:bg-amber-500/60">
                {lastCallWatchlist.slice(0, 8).map((item, index) => {
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
                          ? "border-red-200 dark:border-red-400/30 bg-red-50 dark:bg-red-500/10 hover:border-red-300 dark:hover:border-red-400/50 hover:bg-red-100 dark:hover:bg-red-500/15"
                          : "border-slate-200 dark:border-amber-400/20 bg-slate-50 dark:bg-amber-500/5 hover:border-slate-300 dark:hover:border-amber-400/40 hover:bg-slate-100 dark:hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6">
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300">{item.eip_type || 'EIP'}-{item.eip}</span>
                            <span className={`text-[10px] font-bold ${urgency === "urgent" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {Math.abs(item.daysRemaining)}d {item.daysRemaining < 0 ? 'overdue' : 'left'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{item.title}</p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <span className="text-[10px] text-slate-500 block">Deadline</span>
                          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
              
              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-amber-400/10">
                <p className="text-xs text-slate-500 font-medium">Review window closing soon</p>
              </div>
            </div>
          </motion.div>

          {/* Stagnation Radar - Hidden in main grid, can be shown elsewhere */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="group relative col-span-1 order-7 hidden overflow-hidden rounded-2xl border border-slate-400/20 bg-linear-to-br from-slate-500/5 to-transparent p-5 shadow-lg backdrop-blur transition hover:border-slate-400/30"
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

          {/* Recent PRs - Col 1, Rows 3-4 (TALL LEFT on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="group relative col-span-1 order-9 overflow-hidden rounded-2xl border border-slate-200 dark:border-emerald-400/20 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-md backdrop-blur transition-all hover:border-slate-300 dark:hover:border-emerald-400/40 lg:col-start-1 lg:row-start-3 lg:row-span-2 bg-dot-white/[0.02]"
          >
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="mb-3 flex items-center gap-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Recent PRs
                </h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="cursor-help">
                      <Info className="h-3 w-3 text-slate-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Latest pull requests to the EIPs repository.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Content - Scrollable with custom scrollbar */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-[320px] lg:max-h-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-200 dark:bg-slate-800/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 dark:bg-emerald-500/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-500 dark:hover:bg-emerald-500/60">
                {prsData.slice(0, isMobile ? 2 : prsData.length).map((pr, index) => {
                  const statusColors = {
                    merged: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-400/30",
                    open: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30",
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
                      className="group/item block rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 p-3 transition-all hover:border-emerald-400/40 hover:bg-slate-100 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">#{pr.number}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${statusColors[pr.status as keyof typeof statusColors]}`}>
                            {pr.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">{pr.days}d</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{pr.title}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">by</span>
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{pr.author}</span>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
              
              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-emerald-400/10">
                <p className="text-xs text-slate-500 font-medium">Latest GitHub activity</p>
              </div>
            </div>
          </motion.div>
        </div>
        

        {/* Last Updated */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated: {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </motion.div>

        {/* How to Contribute Callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05, margin: "0px 0px 80px 0px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-cyan-400/20 bg-slate-50 dark:bg-slate-900/70 p-6 backdrop-blur lg:p-8"
        >
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-cyan-300">
                Want to shape Ethereum&apos;s future?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Anyone can propose an EIP. Here&apos;s how to get started:
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-cyan-500/20 text-xs font-bold text-slate-700 dark:text-cyan-300">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Read EIP-1</p>
                    <p className="text-[10px] text-slate-500">Understand the process</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-cyan-500/20 text-xs font-bold text-slate-700 dark:text-cyan-300">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Use the template</p>
                    <p className="text-[10px] text-slate-500">Fork ethereum/EIPs repo</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-cyan-500/20 text-xs font-bold text-slate-700 dark:text-cyan-300">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Submit PR</p>
                    <p className="text-[10px] text-slate-500">Open for community review</p>
                  </div>
                </div>
              </div>
            </div>
            <a
              href="https://github.com/ethereum/EIPs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full border border-slate-300 dark:border-cyan-400/30 bg-slate-200 dark:bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-cyan-300 transition-all hover:border-slate-400 dark:hover:border-cyan-400/50 hover:bg-slate-300 dark:hover:bg-cyan-500/20"
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

