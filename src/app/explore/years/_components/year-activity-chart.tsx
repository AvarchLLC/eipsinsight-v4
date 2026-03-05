'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'motion/react';
import { Download, Info, TrendingUp } from 'lucide-react';
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

function getPeak(data: MonthlyData[], key: keyof MonthlyData): MonthlyData | null {
  if (data.length === 0) return null;
  return data.reduce((peak, item) => ((item[key] as number) > (peak[key] as number) ? item : peak), data[0]);
}

export function YearActivityChart({ data, year, loading }: YearActivityChartProps) {
  const [downloading, setDownloading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const peakMonth = useMemo(() => getPeak(data, 'eipsTouched'), [data]);
  const peakStatusMonth = useMemo(() => getPeak(data, 'statusChanges'), [data]);

  const chartOption = useMemo(() => ({
    color: ['#22d3ee', '#10b981', '#f59e0b'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(2,6,23,0.95)',
      borderColor: 'rgba(148,163,184,0.25)',
      textStyle: { color: '#e2e8f0' },
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 12 },
    },
    grid: {
      left: 0,
      right: 10,
      top: 36,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.month),
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
    },
    series: [
      {
        name: 'EIPs Touched',
        type: 'bar',
        data: data.map((item) => item.eipsTouched),
        barMaxWidth: 26,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        markPoint: peakMonth
          ? {
              symbolSize: 42,
              data: [
                {
                  name: 'Peak Activity',
                  coord: [peakMonth.month, peakMonth.eipsTouched],
                  value: peakMonth.eipsTouched,
                },
              ],
              itemStyle: { color: '#0ea5e9' },
              label: { color: '#e2e8f0', fontSize: 11, formatter: 'Peak\n{c}' },
            }
          : undefined,
      },
      {
        name: 'New EIPs',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        data: data.map((item) => item.newEIPs),
      },
      {
        name: 'Status Changes',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        data: data.map((item) => item.statusChanges),
      },
    ],
  }), [data, peakMonth]);

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

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
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
      <div className="h-80 rounded-xl border border-border bg-card/60 animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground">Loading chart...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground">Monthly Activity Pattern</h3>
            <button
              type="button"
              onClick={() => setShowInfo((prev) => !prev)}
              aria-expanded={showInfo}
              aria-label="Toggle metric definitions"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Peak activity: <span className="text-foreground">{peakMonth?.month ?? 'N/A'}</span>
            {peakMonth ? ` (${peakMonth.eipsTouched.toLocaleString()} EIPs touched)` : ''}
            {peakStatusMonth ? ` • Peak status churn: ${peakStatusMonth.month}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadCSV}
          disabled={loading || downloading}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors',
            'hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Downloading...' : 'Download Detailed CSV'}
        </button>
      </div>

      {showInfo && (
        <div className="mb-4 rounded-lg border border-border bg-card/60 p-3 text-xs text-muted-foreground">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
              <span className="font-semibold text-foreground">EIPs Touched:</span> Unique proposals with at least one status event during the month.
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
              <span className="font-semibold text-foreground">New EIPs:</span> Proposals created in that month.
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-2">
              <span className="font-semibold text-foreground">Status Changes:</span> Total lifecycle transitions recorded across proposals.
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          This view highlights monthly proposal throughput and governance churn signals for {year}.
        </div>
      </div>

      <div className="h-[340px] w-full">
        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
      </div>
    </motion.div>
  );
}
