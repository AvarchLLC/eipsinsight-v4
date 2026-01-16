'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { Clock, AlertCircle, Tag } from 'lucide-react';

interface PROpenStateSnapshotProps {
  openState: {
    totalOpen: number;
    medianAge: number;
    oldestPR: {
      pr_number: number;
      title: string;
      author: string;
      age_days: number;
      repo: string;
    } | null;
  } | null;
  governanceStates: Array<{
    state: string;
    label: string;
    count: number;
  }>;
  labels: Array<{
    label: string;
    count: number;
  }>;
}

const COLORS = {
  WAITING_ON_EDITOR: '#06B6D4',
  WAITING_ON_AUTHOR: '#F59E0B',
  STALLED: '#EF4444',
  DRAFT: '#8B5CF6',
  NO_STATE: '#64748B',
};

export function PROpenStateSnapshot({ openState, governanceStates, labels }: PROpenStateSnapshotProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const topLabels = labels.slice(0, isMobile ? 5 : 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Open PR Count Snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-1">Open PR Snapshot</h3>
          <p className="text-xs text-slate-400">Current state of open pull requests</p>
        </div>

        {openState && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-cyan-400/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-slate-300">Total Open PRs</span>
              </div>
              <span className="text-2xl font-bold text-white">{openState.totalOpen}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-cyan-400/10">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-300">Median Age</span>
              </div>
              <span className="text-xl font-bold text-white">{openState.medianAge} days</span>
            </div>

            {openState.oldestPR && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Oldest Open PR</span>
                </div>
                <p className="text-xs text-white mb-1 line-clamp-2">{openState.oldestPR.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>#{openState.oldestPR.pr_number}</span>
                  <span>•</span>
                  <span>{openState.oldestPR.age_days} days</span>
                  <span>•</span>
                  <span>{openState.oldestPR.repo}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Right: Governance States & Labels */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        {/* Governance States Chart */}
        <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-1">Governance States</h3>
            <p className="text-xs text-slate-400">Distribution of open PR states</p>
          </div>

          {governanceStates.length > 0 ? (
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={governanceStates}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 60 : 70}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {governanceStates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.state as keyof typeof COLORS] || COLORS.NO_STATE} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: isMobile ? '11px' : '12px',
                    }}
                  />
                  {!isMobile && <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-xs">
              No data available
            </div>
          )}
        </div>

        {/* Top Labels */}
        <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Top Labels</h3>
          </div>
          <div className="space-y-2">
            {topLabels.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                <span className="text-xs text-slate-300 truncate flex-1">{item.label}</span>
                <span className="text-xs font-semibold text-cyan-300 ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
