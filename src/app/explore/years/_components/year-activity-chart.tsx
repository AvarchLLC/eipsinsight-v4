'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';

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

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function YearActivityChart({ data, year, loading }: YearActivityChartProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const detail = await client.explore.getYearActivityChartDetail({ year });
      const headers = [
        'Type',
        'Month',
        'EIP #',
        'Title',
        'Author',
        'Status',
        'Category',
        'EIP Type',
        'Status Changes Count',
        'Created At',
        'From Status',
        'To Status',
        'Changed At',
      ];
      const rows: string[][] = [];

      for (const r of detail.eipsTouched) {
        rows.push([
          'EIPs Touched',
          r.month,
          String(r.eipNumber),
          escapeCSV(r.title),
          escapeCSV(r.author),
          escapeCSV(r.status),
          escapeCSV(r.category),
          escapeCSV(r.type),
          String(r.statusChangesCount),
          '',
          '',
          '',
          '',
        ]);
      }
      for (const r of detail.newEIPs) {
        rows.push([
          'New EIPs',
          r.month,
          String(r.eipNumber),
          escapeCSV(r.title),
          escapeCSV(r.author),
          escapeCSV(r.status),
          escapeCSV(r.category),
          escapeCSV(r.type),
          '',
          r.createdAt,
          '',
          '',
          '',
        ]);
      }
      for (const r of detail.statusChanges) {
        rows.push([
          'Status Changes',
          r.month,
          String(r.eipNumber),
          escapeCSV(r.title),
          escapeCSV(r.author),
          escapeCSV(r.status),
          escapeCSV(r.category),
          escapeCSV(r.type),
          '',
          '',
          escapeCSV(r.fromStatus),
          escapeCSV(r.toStatus),
          r.changedAt,
        ]);
      }

      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `eip-activity-${year}-detailed.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    } finally {
      setDownloading(false);
    }
  };
  if (loading) {
    return (
      <div className="h-80 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/40 shadow-sm dark:shadow-none animate-pulse flex items-center justify-center">
        <span className="text-slate-500 dark:text-slate-500">Loading chart...</span>
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
        "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/40",
        "shadow-sm dark:shadow-none ring-1 ring-slate-200/50 dark:ring-transparent",
        "backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="dec-title text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            EIP Activity in {year}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Monthly breakdown of EIP activity
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={loading || downloading}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
              "hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading…' : 'Download CSV'}
          </button>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-cyan-500" />
              <span className="text-slate-600 dark:text-slate-400">EIPs Touched</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">New EIPs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Status Changes</span>
            </div>
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
              stroke="rgba(148, 163, 184, 0.2)"
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
              cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
              contentStyle={{
                backgroundColor: 'rgb(30, 41, 59)',
                border: '1px solid rgb(51, 65, 85)',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
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
