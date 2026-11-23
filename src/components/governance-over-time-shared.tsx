'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Download, Loader2 } from 'lucide-react';
import { client } from '@/lib/orpc';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { ChartWatermark } from '@/components/chart-watermark';
import { ChartFooter } from '@/components/chart-footer';
import { cn } from '@/lib/utils';
import { chartTooltip, CHART_TOOLTIP_BORDER } from '@/lib/chart-theme';

type TimelinePoint = {
  year: number;
  total: number;
  breakdown: Array<{ key: string; count: number }>;
};

type DetailedData = {
  eipNumber: number;
  title: string;
  author: string;
  createdAt: string;
  type: string;
  status: string;
  category: string;
  repository: string;
  url: string;
  yearBucket: number;
};

type ChartDataPoint = {
  year: number;
  [key: string]: number;
};

type TooltipParam = {
  axisValue: string | number;
  seriesName: string;
  value: number;
  color: string;
};

type ChartClickParam = {
  name?: string | number;
  seriesName?: string;
};

const STATUS_COLOR_MAP: Record<string, string> = {
  Draft: '#64748b',
  Review: '#f59e0b',
  'Last Call': '#f97316',
  Final: '#10b981',
  Living: '#22d3ee',
  Stagnant: '#6b7280',
  Withdrawn: '#ef4444',
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Core: '#10b981',
  ERC: '#22d3ee',
  Networking: '#60a5fa',
  Interface: '#a78bfa',
  Meta: '#f472b6',
  Informational: '#94a3b8',
  RIP: '#fb923c',
};

const EXCLUDED_EIP_NUMBERS = new Set([2512, 3297, 1047]);

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

type GovernanceOverTimeSharedProps = {
  sectionClassName?: string;
  containerClassName?: string;
  watermark?: boolean;
  loadingLabel?: string;
};

export function GovernanceOverTimeShared({
  sectionClassName,
  containerClassName = 'w-full max-w-full px-0',
  watermark = false,
  loadingLabel = 'Loading governance graph...',
}: GovernanceOverTimeSharedProps) {
  const [viewMode, setViewMode] = useState<'category' | 'status'>('category');
  const [includeRIPs, setIncludeRIPs] = useState(true);
  const [categoryData, setCategoryData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const detectTheme = () => {
      if (typeof window === 'undefined') return;
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await client.dashboard.getGovernanceTimelineData({ includeRIPs });
        setCategoryData(data.timelineByCategory || []);
        setStatusData(data.timelineByStatus || []);
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
        setCategoryData([]);
        setStatusData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [includeRIPs]);

  const timelineData = useMemo(
    () => (viewMode === 'category' ? categoryData : statusData),
    [viewMode, categoryData, statusData]
  );

  const availableYears = useMemo(
    () => timelineData.map((d) => d.year).sort((a, b) => b - a),
    [timelineData]
  );

  const colors = useMemo(
    () => (viewMode === 'category' ? CATEGORY_COLOR_MAP : STATUS_COLOR_MAP),
    [viewMode]
  );

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    timelineData.forEach((point) => {
      point.breakdown.forEach((item) => {
        if (item.key) keys.add(item.key);
      });
    });
    return Array.from(keys).sort();
  }, [timelineData]);

  const chartData = useMemo(() => {
    return timelineData
      .map((d) => {
        const point: ChartDataPoint = { year: d.year };
        for (const item of d.breakdown) {
          point[item.key] = item.count;
        }
        return point;
      })
      .sort((a, b) => a.year - b.year);
  }, [timelineData]);

  const chartOption = useMemo(() => {
    if (chartData.length === 0) return null;

    const isLight = !isDarkMode;
    const axisLabelColor = isLight ? '#475569' : '#94A3B8';
    const gridLineColor = isLight ? 'rgba(100, 116, 139, 0.12)' : 'rgba(148, 163, 184, 0.08)';

    const series: echarts.SeriesOption[] = allKeys.map((key) => {
      const baseColor = colors[key] || '#94a3b8';
      return {
        name: key,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 26,
        data: chartData.map((d) => d[key] || 0),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${baseColor}E6` },
            { offset: 1, color: `${baseColor}73` },
          ]),
        },
        emphasis: { focus: 'series' },
      };
    });

    const totals = chartData.map((d) =>
      Object.keys(d)
        .filter((k) => k !== 'year')
        .reduce((sum, k) => sum + (d[k] || 0), 0)
    );
    series.push({
      name: 'Total',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 1.5, color: isLight ? '#334155' : '#cbd5e1' },
      itemStyle: { color: isLight ? '#334155' : '#cbd5e1' },
      data: totals,
      z: 8,
    });

    return {
      animationDuration: 350,
      tooltip: chartTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const entries = Array.isArray(params) ? (params as TooltipParam[]) : [];
          const bars = entries.filter((p) => p.seriesName !== 'Total');
          const total = bars.reduce((sum, p) => sum + (p.value || 0), 0);
          const year = entries.length > 0 ? entries[0].axisValue : '';
          let html = `<div style="font-weight:600;margin-bottom:8px">Year ${year}</div>`;
          for (const p of bars) {
            if (!p.value) continue;
            html += `<div style="display:flex;justify-content:space-between;gap:14px"><span>${p.seriesName}</span><span style="font-weight:600">${p.value}</span></div>`;
          }
          html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid ${CHART_TOOLTIP_BORDER};display:flex;justify-content:space-between"><span>Total</span><span style="font-weight:700">${total}</span></div>`;
          return html;
        },
      }),
      legend: {
        show: true,
        data: allKeys,
        right: '2%',
        top: '1%',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
        textStyle: {
          color: axisLabelColor,
          fontSize: 11,
          fontFamily: 'var(--font-plus-jakarta)',
        },
      },
      grid: { left: '3%', right: '3%', top: '10%', bottom: '4%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map((d) => d.year),
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: axisLabelColor, fontSize: 11 },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: gridLineColor, type: 'dashed' } },
      },
      series,
    };
  }, [allKeys, chartData, colors, isDarkMode]);

  const downloadCSV = async () => {
    if (availableYears.length === 0) return;
    setDownloadingCsv(true);
    try {
      const results = await Promise.all(
        availableYears.map(async (year) => {
          const rows = await client.governanceTimeline.getDetailedDataByYear({ year, includeRIPs });
          return (rows || []).map((row) => ({ ...row, yearBucket: year }));
        })
      );
      const flattened = results.flat() as DetailedData[];
      const cleaned = flattened.filter((row) => {
        if (!Number.isFinite(row.eipNumber) || row.eipNumber <= 0) return false;
        if (EXCLUDED_EIP_NUMBERS.has(row.eipNumber)) return false;
        if (String(row.title || '').trim().toLowerCase() === 'untitled' && !String(row.author || '').trim())
          return false;
        return true;
      });
      cleaned.sort((a, b) => {
        if (a.yearBucket !== b.yearBucket) return b.yearBucket - a.yearBucket;
        return Number(b.eipNumber) - Number(a.eipNumber);
      });

      const headers = [
        'year',
        'eip_number',
        'title',
        'author',
        'created_at',
        'type',
        'status',
        'category',
        'repository',
        'url',
      ];
      const rows = cleaned.map((row) => [
        csvEscape(row.yearBucket),
        csvEscape(row.eipNumber),
        csvEscape(row.title || ''),
        csvEscape(row.author || ''),
        csvEscape(row.createdAt || ''),
        csvEscape(row.type || ''),
        csvEscape(row.status || ''),
        csvEscape(row.category || ''),
        csvEscape(row.repository || ''),
        csvEscape(row.url || ''),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `governance-detailed-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <section id="governance-over-time" className={cn('relative w-full pt-2 pb-4', sectionClassName)}>
      <div className={containerClassName}>
        {/* Top Control Bar: Segmented Switch on Left, Include RIPs and CSV Export on Right */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {/* Segmented Pill Switch for Category / Status */}
          <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-sans font-medium shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('category')}
              className={cn(
                'rounded-full px-4 py-1 text-xs font-sans font-medium transition-all duration-150 cursor-pointer',
                viewMode === 'category'
                  ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
              )}
            >
              Category
            </button>
            <button
              type="button"
              onClick={() => setViewMode('status')}
              className={cn(
                'rounded-full px-4 py-1 text-xs font-sans font-medium transition-all duration-150 cursor-pointer',
                viewMode === 'status'
                  ? 'bg-[var(--ink)] text-[var(--paper)] font-semibold shadow-xs'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
              )}
            >
              Status
            </button>
          </div>

          {/* Right actions: Include RIPs toggle & compact CSV export icon button */}
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-sans font-medium text-[var(--ink-muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] select-none">
              <input
                type="checkbox"
                checked={includeRIPs}
                onChange={(e) => setIncludeRIPs(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--border)] bg-[var(--surface-2)] accent-[var(--brand)] focus:ring-0 cursor-pointer"
              />
              <span>Include RIPs</span>
            </label>

            <button
              type="button"
              onClick={downloadCSV}
              disabled={downloadingCsv || loading || chartData.length === 0}
              title={downloadingCsv ? 'Exporting CSV…' : 'Export CSV Report'}
              aria-label="Export CSV report"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {downloadingCsv ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Chart Card */}
        <div className="card p-4">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <InlineBrandLoader label={loadingLabel} size="md" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-96 items-center justify-center text-sm font-sans text-[var(--ink-muted)]">
              No data available for current filter selection.
            </div>
          ) : chartOption ? (
            <div className="relative" key={`${viewMode}-${includeRIPs}`}>
              <ReactECharts
                option={chartOption as object}
                style={{ height: '420px', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
              {watermark ? <ChartWatermark position="center" /> : null}
            </div>
          ) : null}

          {/* Unified Platform Chart Footer */}
          <ChartFooter />
        </div>
      </div>
    </section>
  );
}
