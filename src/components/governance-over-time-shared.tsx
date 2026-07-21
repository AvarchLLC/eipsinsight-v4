'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { ChevronDown, ChevronUp, Download, Table } from 'lucide-react';
import { client } from '@/lib/orpc';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
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

function toggleInList<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type FilterPillsProps = {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

function FilterPills({ label, options, selected, onToggle }: FilterPillsProps) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={`${label}-${value}`}
              type="button"
              onClick={() => onToggle(value)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground'
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedSeriesFilters, setSelectedSeriesFilters] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [showTable, setShowTable] = useState(true);

  const [detailedData, setDetailedData] = useState<DetailedData[]>([]);

  useEffect(() => {
    const detectTheme = () => {
      if (typeof window === 'undefined') return;
      const isDark = document.documentElement.classList.contains('dark') ||
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

  const timelineData = useMemo(() => (viewMode === 'category' ? categoryData : statusData), [viewMode, categoryData, statusData]);

  const availableYears = useMemo(() => timelineData.map((d) => d.year).sort((a, b) => b - a), [timelineData]);

  useEffect(() => {
    if (availableYears.length === 0) return;
    if (selectedYears.length === 0) return;
    setSelectedYears((prev) => prev.filter((y) => availableYears.includes(y)));
  }, [availableYears, selectedYears.length]);

  useEffect(() => {
    if (availableYears.length === 0) {
      setDetailedData([]);
      return;
    }

    async function fetchAllYearDetails() {
      setLoadingDetails(true);
      try {
        const results = await Promise.all(
          availableYears.map(async (year) => {
            const rows = await client.governanceTimeline.getDetailedDataByYear({ year, includeRIPs });
            return (rows || []).map((row) => ({ ...row, yearBucket: year }));
          })
        );
        const flattened = results.flat() as DetailedData[];
        flattened.sort((a, b) => {
          if (a.yearBucket !== b.yearBucket) return b.yearBucket - a.yearBucket;
          return Number(b.eipNumber) - Number(a.eipNumber);
        });
        setDetailedData(flattened);
      } catch (error) {
        console.error('Failed to fetch detailed data:', error);
        setDetailedData([]);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchAllYearDetails();
  }, [availableYears, includeRIPs]);

  const colors = useMemo(() => (viewMode === 'category' ? CATEGORY_COLOR_MAP : STATUS_COLOR_MAP), [viewMode]);

  const cleanedDetailedData = useMemo(() => {
    return detailedData.filter((row) => {
      if (!Number.isFinite(row.eipNumber) || row.eipNumber <= 0) return false;
      if (EXCLUDED_EIP_NUMBERS.has(row.eipNumber)) return false;
      if (String(row.title || '').trim().toLowerCase() === 'untitled' && !String(row.author || '').trim()) return false;
      return true;
    });
  }, [detailedData]);

  const statusOptions = useMemo(() => Array.from(new Set(cleanedDetailedData.map((d) => d.status).filter(Boolean))).sort(), [cleanedDetailedData]);
  const categoryOptions = useMemo(() => Array.from(new Set(cleanedDetailedData.map((d) => d.category).filter(Boolean))).sort(), [cleanedDetailedData]);
  const repoOptions = useMemo(() => Array.from(new Set(cleanedDetailedData.map((d) => d.repository).filter(Boolean))).sort(), [cleanedDetailedData]);
  const typeOptions = useMemo(() => Array.from(new Set(cleanedDetailedData.map((d) => d.type).filter(Boolean))).sort(), [cleanedDetailedData]);

  const rowMatchesFilters = useCallback((row: DetailedData) => {
    if (selectedYears.length > 0 && !selectedYears.includes(row.yearBucket)) return false;
    if (selectedSeriesFilters.length > 0) {
      if (viewMode === 'category' && !selectedSeriesFilters.includes(row.category || row.type || '')) return false;
      if (viewMode === 'status' && !selectedSeriesFilters.includes(row.status || '')) return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(row.status || '')) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(row.category || '')) return false;
    if (selectedRepos.length > 0 && !selectedRepos.includes(row.repository || '')) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(row.type || '')) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const searchable = `${row.eipNumber} ${row.title} ${row.author} ${row.status} ${row.category} ${row.repository} ${row.type}`.toLowerCase();
    return searchable.includes(q);
  }, [
    selectedYears,
    selectedSeriesFilters,
    selectedStatuses,
    selectedCategories,
    selectedRepos,
    selectedTypes,
    searchQuery,
    viewMode,
  ]);

  const filteredDetailedData = useMemo(() => cleanedDetailedData.filter(rowMatchesFilters), [
    cleanedDetailedData,
    rowMatchesFilters,
  ]);

  const chartData = useMemo(() => {
    const byYear = new Map<number, Record<string, number>>();
    for (const row of filteredDetailedData) {
      const year = row.yearBucket;
      const key = viewMode === 'category' ? (row.category || row.type || 'Unknown') : (row.status || 'Unknown');
      if (!byYear.has(year)) byYear.set(year, {});
      const bucket = byYear.get(year)!;
      bucket[key] = (bucket[key] || 0) + 1;
    }

    const rows: ChartDataPoint[] = Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, map]) => ({ year, ...map }));

    return rows;
  }, [filteredDetailedData, viewMode]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'year') keys.add(key);
      });
    });
    return Array.from(keys).sort();
  }, [chartData]);

  const keyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'year') totals[key] = (totals[key] || 0) + (point[key] || 0);
      });
    });
    return totals;
  }, [chartData]);

  useEffect(() => {
    setSelectedSeriesFilters((prev) => {
      const next = prev.filter((k) => allKeys.includes(k));
      if (next.length === prev.length && next.every((value, idx) => value === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [allKeys]);

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
        barMaxWidth: 24,
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

    const totals = chartData.map((d) => Object.keys(d).filter((k) => k !== 'year').reduce((sum, k) => sum + (d[k] || 0), 0));
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
      legend: { show: false },
      grid: { left: '4%', right: '4%', top: '10%', bottom: '14%', containLabel: true },
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
      dataZoom: [
        { type: 'slider', show: true, xAxisIndex: [0], start: 0, end: 100, bottom: 0, height: 24 },
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 },
      ],
      series,
    };
  }, [allKeys, chartData, colors, isDarkMode]);

  const onChartClick = (params: unknown) => {
    const entry = params as ChartClickParam;
    const year = Number(entry?.name);
    if (Number.isFinite(year) && year > 0) {
      setSelectedYears((prev) => toggleInList(prev, year).sort((a, b) => b - a));
    }
    if (entry?.seriesName && entry.seriesName !== 'Total') {
      setSelectedSeriesFilters((prev) => toggleInList(prev, entry.seriesName as string));
    }
  };

  const clearFilters = () => {
    setSelectedYears([]);
    setSelectedSeriesFilters([]);
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedRepos([]);
    setSelectedTypes([]);
    setSearchQuery('');
  };

  const downloadCSV = () => {
    if (filteredDetailedData.length === 0) return;
    const headers = ['year', 'eip_number', 'title', 'author', 'created_at', 'type', 'status', 'category', 'repository', 'url'];
    const rows = filteredDetailedData.map((row) => [
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
  };

  return (
    <section id="governance-over-time" className={cn('relative w-full pt-2 pb-4', sectionClassName)}>
      <div className={containerClassName}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 rounded-lg bg-muted/60 p-1">
            <button
              onClick={() => setViewMode('category')}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                viewMode === 'category' ? 'bg-primary/10 border border-primary/40 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Category
            </button>
            <button
              onClick={() => setViewMode('status')}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                viewMode === 'status' ? 'bg-primary/10 border border-primary/40 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Status
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeRIPs}
                onChange={(e) => setIncludeRIPs(e.target.checked)}
                className="rounded border-border bg-muted/40 text-primary focus:ring-primary"
              />
              Include RIPs
            </label>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
            >
              <Table className="h-3 w-3" />
              {showTable ? 'Hide table' : 'Show table'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
          {loading || loadingDetails ? (
            <div className="flex h-96 items-center justify-center">
              <InlineBrandLoader label={loadingLabel} size="md" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-96 items-center justify-center text-muted-foreground">No data available for current filter selection.</div>
          ) : chartOption ? (
            <div className="relative" key={`${viewMode}-${includeRIPs}-${selectedYears.join('-')}`}>
              <ReactECharts
                option={chartOption as object}
                style={{ height: '480px', width: '100%' }}
                opts={{ renderer: 'svg' }}
                onEvents={{ click: onChartClick }}
              />
              {watermark ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="select-none text-sm font-medium tracking-[0.06em] text-foreground/12 dark:text-foreground/16 sm:text-base">
                    EIPsInsight.com
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loading && !loadingDetails && chartData.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2">
              {allKeys.map((key) => {
                const color = colors[key] || '#94a3b8';
                const active = selectedSeriesFilters.includes(key);
                return (
                  <button
                    key={`series-chip-${key}`}
                    type="button"
                    onClick={() => setSelectedSeriesFilters((prev) => toggleInList(prev, key))}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    style={{
                      borderColor: `${color}66`,
                      backgroundColor: active ? `${color}33` : `${color}1A`,
                    }}
                  >
                    {key}: {keyTotals[key] || 0}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-card/60">
          <button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Multi-Select Drilldown Filters</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              {filtersCollapsed ? 'Show' : 'Hide'}
              {filtersCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </span>
          </button>

          {!filtersCollapsed ? (
            <div className="space-y-3 border-t border-border px-3 py-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                >
                  Clear Filters
                </button>
              </div>

              <FilterPills
                label="Years"
                options={availableYears.map(String)}
                selected={selectedYears.map(String)}
                onToggle={(value) => {
                  const y = Number(value);
                  if (!Number.isFinite(y)) return;
                  setSelectedYears((prev) => toggleInList(prev, y).sort((a, b) => b - a));
                }}
              />
              <FilterPills
                label={viewMode === 'category' ? 'Category Focus' : 'Status Focus'}
                options={allKeys}
                selected={selectedSeriesFilters}
                onToggle={(v) => setSelectedSeriesFilters((prev) => toggleInList(prev, v))}
              />
              <FilterPills label="Status" options={statusOptions} selected={selectedStatuses} onToggle={(v) => setSelectedStatuses((prev) => toggleInList(prev, v))} />
              <FilterPills label="Category" options={categoryOptions} selected={selectedCategories} onToggle={(v) => setSelectedCategories((prev) => toggleInList(prev, v))} />
              <FilterPills label="Repository" options={repoOptions} selected={selectedRepos} onToggle={(v) => setSelectedRepos((prev) => toggleInList(prev, v))} />
              <FilterPills label="Type" options={typeOptions} selected={selectedTypes} onToggle={(v) => setSelectedTypes((prev) => toggleInList(prev, v))} />

              <label className="block">
                <span className="mb-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search EIP number, title, author, status, category..."
                  className="h-8 w-full rounded-md border border-border bg-muted/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
            </div>
          ) : null}
        </div>

        {showTable ? (
          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Filtered EIPs · {filteredDetailedData.length.toLocaleString()} rows
              </h3>
              <button
                onClick={downloadCSV}
                disabled={filteredDetailedData.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex h-32 items-center justify-center">
                <InlineBrandLoader label="Loading filtered metadata..." size="sm" />
              </div>
            ) : filteredDetailedData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No EIPs match current filter selection.</div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <tr className="border-b border-border/70 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Year</th>
                      <th className="px-3 py-2">EIP #</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Repository</th>
                      <th className="px-3 py-2">Author</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetailedData.map((row) => (
                      <tr key={`${row.yearBucket}-${row.repository}-${row.eipNumber}`} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.yearBucket}</td>
                        <td className="px-3 py-2 font-mono text-primary">{row.eipNumber}</td>
                        <td className="px-3 py-2 text-foreground">{row.title || 'Untitled'}</td>
                        <td className="px-3 py-2 text-foreground">{row.status || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.category || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.type || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.repository || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.author || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.createdAt || '—'}</td>
                        <td className="px-3 py-2">
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
