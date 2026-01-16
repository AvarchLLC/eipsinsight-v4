'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface PRStalenessSectionProps {
  stalenessData: Array<{
    bucket: string;
    count: number;
  }>;
  highRiskPRs: Array<{
    prNumber: number;
    repo: string;
    title: string;
    author: string;
    ageDays: number;
    lastActivity: string;
  }>;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-7 days': '#10B981',
  '7-30 days': '#F59E0B',
  '30-90 days': '#F97316',
  '90+ days': '#EF4444',
};

export function PRStalenessSection({ stalenessData, highRiskPRs }: PRStalenessSectionProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Staleness Buckets Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-1">PR Staleness Distribution</h3>
          <p className="text-xs text-slate-400">Open PRs grouped by age</p>
        </div>

        {stalenessData.length > 0 ? (
          <div className="w-full h-[220px] sm:h-[250px] lg:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stalenessData} margin={{ top: 10, right: isMobile ? 5 : 10, left: isMobile ? -10 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis
                  dataKey="bucket"
                  stroke="#94a3b8"
                  fontSize={isMobile ? 9 : 11}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={isMobile ? 9 : 11}
                  tick={{ fill: '#94a3b8' }}
                  width={isMobile ? 35 : 50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  fill="#64748B"
                >
                  {stalenessData.map((entry, index) => {
                    const fillColor = BUCKET_COLORS[entry.bucket] || '#64748B';
                    return (
                      <Bar.Cell 
                        key={`cell-${index}`} 
                        fill={fillColor}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-400 text-xs">
            No data available
          </div>
        )}
      </motion.div>

      {/* High-Risk PRs List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">High-Risk Stale PRs</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Open PRs with no activity in 30+ days</p>

        {highRiskPRs.length > 0 ? (
          <div className="space-y-2 max-h-[280px] sm:max-h-[300px] overflow-y-auto">
            {highRiskPRs.slice(0, isMobile ? 5 : 10).map((pr) => (
              <Link
                key={`${pr.repo}-${pr.prNumber}`}
                href={`https://github.com/ethereum/${pr.repo}/pull/${pr.prNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-slate-900/50 border border-amber-400/20 hover:border-amber-400/40 hover:bg-slate-900/70 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-white line-clamp-2 flex-1 group-hover:text-amber-300 transition-colors">
                    {pr.title}
                  </p>
                  <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>#{pr.prNumber}</span>
                  <span>•</span>
                  <span>{pr.repo}</span>
                  <span>•</span>
                  <span className="text-amber-400">{pr.ageDays} days old</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500">
                  Last activity: {pr.lastActivity}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No high-risk PRs found
          </div>
        )}
      </motion.div>
    </div>
  );
}
