'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

interface MonthlyData {
  month: string;
  eipsTouched: number;
  newEIPs: number;
  statusChanges: number;
}

interface YearActivityChartProps {
  data: MonthlyData[];
  year: number;
  loading: boolean;
}

const chartConfig = {
  eipsTouched: {
    label: "EIPs Touched",
    color: "hsl(var(--chart-1))",
  },
  newEIPs: {
    label: "New EIPs",
    color: "hsl(var(--chart-2))",
  },
  statusChanges: {
    label: "Status Changes",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function YearActivityChart({ data, year, loading }: YearActivityChartProps) {
  if (loading) {
    return (
      <div className="h-80 bg-slate-900/50 rounded-xl border border-slate-700/40 animate-pulse flex items-center justify-center">
        <span className="text-slate-500">Loading chart...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "p-6 rounded-xl",
        "bg-slate-900/50 border border-slate-700/40",
        "backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            EIP Activity in {year}
          </h3>
          <p className="text-sm text-slate-400">
            Monthly breakdown of EIP activity
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-cyan-500" />
            <span className="text-slate-400">EIPs Touched</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-slate-400">New EIPs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span className="text-slate-400">Status Changes</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              contentStyle={{
                backgroundColor: 'rgb(30, 41, 59)',
                border: '1px solid rgb(51, 65, 85)',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
            />
            <Bar
              dataKey="eipsTouched"
              name="EIPs Touched"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="newEIPs"
              name="New EIPs"
              fill="#34d399"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="statusChanges"
              name="Status Changes"
              fill="#fbbf24"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
