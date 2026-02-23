"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AlertCircle, Clock, Users, GitPullRequest, ExternalLink } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { client } from "@/lib/orpc";
import { PageHeader } from "@/components/header";

// Types
interface WaitingStateData {
  state: string;
  count: number;
  percentage: number;
  color: string;
}

interface TimelineData {
  bucket: string;
  waitingOnAuthor: number;
  waitingOnEditor: number;
}

interface NeedsAttentionPR {
  prNumber: number;
  repository: string;
  currentState: string;
  waitingSince: string;
  daysWaiting: number;
  responsibleParty: string;
  lastEvent: string;
  url: string;
}

interface ResponsibilityMetrics {
  editor: {
    count: number;
    percentage: number;
    medianWaitDays: number;
  };
  author: {
    count: number;
    percentage: number;
    medianWaitDays: number;
  };
}

// Color mapping for states
const stateColors: Record<string, string> = {
  "WAITING_AUTHOR": "#22d3ee",
  "WAITING_EDITOR": "#a78bfa",
  "WAITING_COMMUNITY": "#10b981",
  "IDLE": "#64748b",
};

const stateLabels: Record<string, string> = {
  "WAITING_AUTHOR": "Waiting on Author",
  "WAITING_EDITOR": "Waiting on Editors",
  "WAITING_COMMUNITY": "Waiting on Community",
  "IDLE": "Idle / No Activity",
};

export default function GovernanceBottlenecks() {
  const [filter, setFilter] = useState<"all" | "30+" | "90+" | "editor" | "author">("all");
  const [isMobile, setIsMobile] = useState(false);
  const [waitingStates, setWaitingStates] = useState<WaitingStateData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionPR[]>([]);
  const [metrics, setMetrics] = useState<ResponsibilityMetrics | null>(null);
  const [longestWaitingPR, setLongestWaitingPR] = useState<{ prNumber: number; url: string; daysWaiting: number } | null>(null);
  const [loading, setLoading] = useState(true);

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
        const [statesData, timelineDataRes, metricsData, longestPR] = await Promise.all([
          client.governance.getWaitingStates({}),
          client.governance.getWaitingTimeline({}),
          client.governance.getResponsibilityMetrics({}),
          client.governance.getLongestWaitingPR({ state: 'WAITING_AUTHOR' }),
        ]);

        // Map states to include colors and labels
        const mappedStates = statesData.map(state => ({
          state: stateLabels[state.state] || state.state,
          count: state.count,
          percentage: state.percentage,
          color: stateColors[state.state] || "#64748b",
        }));

        setWaitingStates(mappedStates);
        setTimelineData(timelineDataRes);
        setMetrics(metricsData);
        setLongestWaitingPR(longestPR);
      } catch (error) {
        console.error('Failed to fetch governance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchNeedsAttention = async () => {
      try {
        let minDays: number | undefined;
        let state: 'WAITING_AUTHOR' | 'WAITING_EDITOR' | undefined;

        if (filter === "30+") minDays = 30;
        else if (filter === "90+") minDays = 90;
        else if (filter === "editor") state = "WAITING_EDITOR";
        else if (filter === "author") state = "WAITING_AUTHOR";

        const data = await client.governance.getNeedsAttention({ minDays, state });
        setNeedsAttention(data);
      } catch (error) {
        console.error('Failed to fetch needs attention data:', error);
      }
    };

    fetchNeedsAttention();
  }, [filter]);

  const totalPRs = waitingStates.reduce((sum, s) => sum + s.count, 0);
  const authorPercentage = metrics?.author.percentage || 0;
  const editorPercentage = metrics?.editor.percentage || 0;

  return (
    <TooltipProvider>
      <PageHeader
        indicator={{ icon: "trending", label: "Diagnostic" }}
        title="Governance Bottlenecks"
        description="Identify and track proposals waiting for action across the governance pipeline."
        sectionId="governance-bottlenecks"
        className="bg-background"
      />
      <section className="relative overflow-hidden bg-background pb-12 sm:pb-16 lg:pb-20">
        <div className="container relative mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">

          {/* Block 1: Hero - Waiting State Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 sm:mb-10 lg:mb-12"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/30 p-6 sm:p-8 backdrop-blur-sm">
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Current Waiting Responsibility
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {totalPRs} open proposals tracked across all repositories
                </p>
              </div>

              {/* Segmented Bar */}
              <div className="relative mb-6">
                {loading ? (
                  <div className="h-12 sm:h-16 rounded-lg bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
                ) : (
                  <div className="flex h-12 sm:h-16 overflow-hidden rounded-lg">
                    {waitingStates.map((state, index) => (
                    <Tooltip key={state.state}>
                      <TooltipTrigger asChild>
                        <div
                          className="group relative transition-all cursor-pointer hover:brightness-110"
                          style={{
                            width: `${state.percentage}%`,
                            backgroundColor: state.color,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-bold text-black drop-shadow">
                              {state.percentage}%
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-semibold">{state.state}</p>
                          <p className="text-slate-300">{state.count} PRs ({state.percentage}%)</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center sm:justify-start">
                {waitingStates.map((state) => (
                  <div key={state.state} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: state.color }}
                    />
                    <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {state.state}
                      <span className="ml-1 text-slate-500">({state.count})</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Insight */}
              <div className="mt-6 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Most open proposals are currently waiting on <span className="font-semibold text-cyan-700 dark:text-cyan-300">authors to respond</span>, not editors.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Block 2: Responsibility Split (Side-by-Side) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 sm:mb-10 lg:mb-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
          >
            {/* Editor Load */}
            <div className="rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/5 to-transparent p-5 sm:p-6 backdrop-blur-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-lg bg-violet-500/10 p-2">
                  <Users className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1">Editor Load</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Current editor workload</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">PRs needing action</span>
                  <span className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-300">
                    {loading ? '...' : `${editorPercentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Median wait time</span>
                  <span className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                    {loading ? '...' : `${metrics?.editor.medianWaitDays || 0} days`}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-violet-400/20">
                  <span className="text-xs text-emerald-400">↓ 12%</span>
                  <span className="text-xs text-slate-600 dark:text-slate-500">vs last month</span>
                </div>
              </div>
            </div>

            {/* Author Load */}
            <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/5 to-transparent p-5 sm:p-6 backdrop-blur-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-lg bg-cyan-500/10 p-2">
                  <GitPullRequest className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-1">Author Load</h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Awaiting author response</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">PRs waiting on authors</span>
                  <span className="text-2xl sm:text-3xl font-bold text-cyan-700 dark:text-cyan-300">
                    {loading ? '...' : `${authorPercentage}%`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Median response time</span>
                  <span className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                    {loading ? '...' : `${metrics?.author.medianWaitDays || 0} days`}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-2 border-t border-cyan-400/20">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Longest waiting</span>
                  {loading || !longestWaitingPR ? (
                    <span className="text-xs text-slate-600 dark:text-slate-500">Loading...</span>
                  ) : (
                    <a href={longestWaitingPR.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-colors flex items-center gap-1">
                      PR #{longestWaitingPR.prNumber} ({longestWaitingPR.daysWaiting}d)
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Block 3: Bottleneck Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8 sm:mb-10 lg:mb-12"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/30 p-6 sm:p-8 backdrop-blur-sm">
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  How Long Things Stay Stuck
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Distribution of waiting times by responsibility
                </p>
              </div>

              <div className="h-64 sm:h-80">
                {loading ? (
                  <div className="h-full rounded-lg bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineData}
                      margin={{ top: 20, right: isMobile ? 10 : 30, left: isMobile ? -20 : 0, bottom: 5 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="bucket" 
                      stroke="#94a3b8" 
                      fontSize={isMobile ? 11 : 13}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={isMobile ? 11 : 13}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="waitingOnAuthor" name="Waiting on Author" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="waitingOnEditor" name="Waiting on Editor" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>

              <div className="flex flex-wrap gap-4 sm:gap-6 justify-center mt-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-cyan-400" />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Waiting on Author</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-violet-400" />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">Waiting on Editor</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Block 4: Needs Attention Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/30 p-6 sm:p-8 backdrop-blur-sm">
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Needs Attention
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Proposals requiring immediate action
                </p>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All" },
                    { value: "30+", label: "≥ 30 days" },
                    { value: "90+", label: "≥ 90 days" },
                    { value: "editor", label: "Editor only" },
                    { value: "author", label: "Author only" },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value as "all" | "30+" | "90+" | "editor" | "author")}
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition-all ${
                        filter === f.value
                          ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-700 dark:text-cyan-300"
                          : "bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          PR
                        </th>
                        <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Repository
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Waiting
                        </th>
                        <th className="hidden lg:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Last Event
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {needsAttention.map((pr) => (
                        <tr key={pr.prNumber} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-colors"
                            >
                              #{pr.prNumber}
                            </a>
                          </td>
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{pr.repository.split('/')[1]}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              pr.currentState === 'WAITING_AUTHOR' ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' :
                              pr.currentState === 'WAITING_EDITOR' ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30' :
                              pr.currentState === 'IDLE' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30' :
                              'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {pr.responsibleParty}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                              <span className={`text-sm font-semibold ${
                                pr.daysWaiting >= 90 ? 'text-red-400' :
                                pr.daysWaiting >= 30 ? 'text-amber-400' :
                                'text-slate-700 dark:text-slate-300'
                              }`}>
                                {pr.daysWaiting}d
                              </span>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-3 sm:px-4 py-3">
                            <span className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate block">{pr.lastEvent}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
                </div>
              ) : needsAttention.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No proposals match the selected filter
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>
    </TooltipProvider>
  );
}
