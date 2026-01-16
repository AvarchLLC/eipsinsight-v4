'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface PRTimeToOutcomeProps {
  data: Array<{
    metric: string;
    medianDays: number;
    p75Days: number;
    p90Days: number;
  }>;
}

export function PRTimeToOutcome({ data }: PRTimeToOutcomeProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-cyan-400/20 bg-slate-950/50 p-4 sm:p-6 text-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  const chartData = data.map(item => ({
    metric: item.metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    'Median (P50)': item.medianDays,
    '75th Percentile (P75)': item.p75Days,
    '90th Percentile (P90)': item.p90Days,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Time to Outcome</h3>
        <p className="text-xs text-slate-400">Latency metrics in days</p>
      </div>

      <div className="w-full h-[280px] sm:h-[300px] lg:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: isMobile ? 5 : 10, left: isMobile ? -10 : 0, bottom: isMobile ? 50 : 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis
              dataKey="metric"
              stroke="#94a3b8"
              fontSize={isMobile ? 9 : 11}
              tick={{ fill: '#94a3b8' }}
              angle={isMobile ? -30 : -15}
              textAnchor="end"
              height={isMobile ? 50 : 60}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={isMobile ? 9 : 11}
              tick={{ fill: '#94a3b8' }}
              width={isMobile ? 35 : 50}
              label={!isMobile ? { value: 'Days', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '10px' } } : undefined}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: isMobile ? '11px' : '12px',
              }}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8', fontSize: isMobile ? '9px' : '11px' }}
              iconSize={isMobile ? 8 : 10}
            />
            <Bar dataKey="Median (P50)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="75th Percentile (P75)" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="90th Percentile (P90)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
