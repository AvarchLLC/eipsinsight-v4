'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Info, Loader2, Download, Filter, Eye, EyeOff } from 'lucide-react';
import { client } from '@/lib/orpc';

// Aligned with Active Proposals bento grid colors
const categoryColors: Record<string, string> = {
  'Core': '#10b981',      // Emerald
  'ERC': '#22d3ee',       // Cyan
  'Networking': '#60a5fa', // Blue
  'Interface': '#a78bfa', // Violet
  'Meta': '#f472b6',      // Pink
  'Informational': '#94a3b8', // Slate
  'RIP': '#fb923c',       // Orange
};

const statusColors: Record<string, string> = {
  'Draft': '#22d3ee',     // Cyan
  'Review': '#60a5fa',    // Blue
  'Last Call': '#fbbf24', // Amber
  'Final': '#10b981',     // Emerald
  'Living': '#22d3ee',    // Cyan
  'Withdrawn': '#94a3b8', // Slate
  'Stagnant': '#64748b',  // Slate dim
};

type TimelinePoint = {
  year: number;
  total: number;
  breakdown: Array<{ key: string; count: number }>;
};

type ChartDataPoint = {
  year: number;
  [key: string]: number;
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
};

export default function GovernanceOverTime() {
  const [viewMode, setViewMode] = useState<'category' | 'status'>('category');
  const [includeRIPs, setIncludeRIPs] = useState(true);
  const [categoryData, setCategoryData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const chartRef = useRef<ReactECharts>(null);

  // Get available years
  const availableYears = useMemo(() => {
    const sourceData = viewMode === 'category' ? categoryData : statusData;
    return sourceData.map(d => d.year).sort((a, b) => b - a);
  }, [categoryData, statusData, viewMode]);

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

  // Fetch detailed data when year is selected
  useEffect(() => {
    if (selectedYear === null) {
      setDetailedData([]);
      return;
    }

    async function fetchDetailedData() {
      setLoadingDetails(true);
      try {
        const data = await client.governanceTimeline.getDetailedDataByYear({
          year: selectedYear as number,
          includeRIPs
        });
        setDetailedData(data || []);
      } catch (error) {
        console.error('Failed to fetch detailed data:', error);
        setDetailedData([]);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchDetailedData();
  }, [selectedYear, includeRIPs]);

  // Transform data for ECharts
  const chartData: ChartDataPoint[] = useMemo(() => {
    const sourceData = viewMode === 'category' ? categoryData : statusData;
    
    const allKeys = new Set<string>();
    sourceData.forEach(point => {
      point.breakdown.forEach(item => {
        allKeys.add(item.key);
      });
    });
    
    return sourceData.map(point => {
      const dataPoint: ChartDataPoint = { year: point.year };
      allKeys.forEach(key => {
        dataPoint[key] = 0;
      });
      point.breakdown.forEach(item => {
        dataPoint[item.key] = item.count;
      });
      return dataPoint;
    });
  }, [viewMode, categoryData, statusData]);

  // Get all possible keys
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'year') keys.add(key);
      });
    });
    return Array.from(keys);
  }, [chartData]);

  // Get visible keys (excluding hidden ones)
  const visibleKeys = useMemo(() => {
    return allKeys.filter(key => !hiddenKeys.has(key));
  }, [allKeys, hiddenKeys]);

  const colors = viewMode === 'category' ? categoryColors : statusColors;

  // Compute compact insight
  const insight = useMemo(() => {
    if (chartData.length === 0) return null;
    
    if (viewMode === 'category') {
      // Find peak year
      const peakYear = chartData.reduce((max, d) => {
        const total = Object.keys(d).filter(k => k !== 'year').reduce((sum, k) => sum + (d[k] || 0), 0);
        const maxTotal = Object.keys(max).filter(k => k !== 'year').reduce((sum, k) => sum + (max[k] || 0), 0);
        return total > maxTotal ? d : max;
      });
      
      const peakTotal = Object.keys(peakYear).filter(k => k !== 'year').reduce((sum, k) => sum + (peakYear[k] || 0), 0);
      const ercCount = peakYear.ERC || 0;
      const ercPercentage = peakTotal > 0 ? Math.round((ercCount / peakTotal) * 100) : 0;
      
      if (ercPercentage > 30) {
        return `Peak activity: ${peakYear.year} · ERC-dominated (${ercPercentage}%)`;
      } else {
        return `Peak activity: ${peakYear.year} · ${peakTotal} proposals`;
      }
    } else {
      // Status mode insight
      const finalizedYears = chartData.filter(d => (d.Final || 0) > 0);
      if (finalizedYears.length > 0) {
        const recentFinalized = finalizedYears.slice(-3);
        const avgFinalized = recentFinalized.reduce((sum, d) => sum + (d.Final || 0), 0) / recentFinalized.length;
        return `Recent throughput: ${Math.round(avgFinalized)}/year avg`;
      }
    }
    return null;
  }, [chartData, viewMode]);

  // Get total counts per key for legend
  const keyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'year') {
          totals[key] = (totals[key] || 0) + (point[key] || 0);
        }
      });
    });
    return totals;
  }, [chartData]);

  // Toggle key visibility
  const toggleKey = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Download CSV
  const downloadCSV = () => {
    if (detailedData.length === 0) return;

    const headers = ['EIP Number', 'Title', 'Author', 'Created At', 'Type', 'Status', 'Category', 'Repository', 'URL'];
    const rows = detailedData.map(item => [
      item.eipNumber,
      `"${item.title.replace(/"/g, '""')}"`,
      item.author,
      item.createdAt,
      item.type,
      item.status,
      item.category,
      item.repository,
      item.url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `governance-data-${selectedYear || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ECharts option configuration - Protocol Telemetry Aesthetic
  const chartOption = useMemo(() => {
    if (chartData.length === 0) return null;

    const barSeries = visibleKeys.map(key => {
      const baseColor = colors[key] || '#64748B';
      return {
        name: key,
        type: 'bar' as const,
        stack: 'total',
        data: chartData.map(d => d[key] || 0),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${baseColor}99` },
            { offset: 1, color: `${baseColor}4D` }
          ]),
          borderRadius: [0, 0, 0, 0],
          shadowBlur: 0,
          borderWidth: 0,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 2,
            shadowColor: `${baseColor}30`,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${baseColor}CC` },
              { offset: 1, color: `${baseColor}80` }
            ])
          }
        }
      };
    });

    // Add total overlay line (subtle dots)
    const totalLineData = chartData.map(d => 
      Object.keys(d).filter(k => k !== 'year').reduce((sum, k) => sum + (d[k] || 0), 0)
    );
    
    const lineSeries = {
      name: 'Total',
      type: 'line' as const,
      data: totalLineData,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { opacity: 0 },
      itemStyle: {
        color: 'rgba(203, 213, 225, 0.6)',
        shadowBlur: 0,
      },
      z: 10
    };

    const series = [...barSeries, lineSeries] as any;

    return {
      backgroundColor: 'transparent',
      // Soft glass-like tooltip
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const,
          shadowStyle: {
            color: 'rgba(96, 165, 250, 0.1)' // Soft shadow
          }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.85)', // Translucent dark
        borderColor: 'rgba(148, 163, 184, 0.2)', // Soft border
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#E2E8F0',
          fontSize: 12
        },
        extraCssText: 'min-width: 220px;',
        formatter: (params: any) => {
          // Filter out the "Total" line series from tooltip
          const barParams = params.filter((p: any) => p.seriesName !== 'Total');
          const total = barParams.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
          let result = `<div style="font-weight: 500; margin-bottom: 10px; color: #F1F5F9;">Year ${params[0].axisValue}</div>`;
          barParams.forEach((param: any) => {
            if (param.value > 0) {
              result += `<div style="margin: 6px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; background: ${param.color}; border-radius: 2px; margin-right: 10px;"></span>
                <span style="color: #CBD5E1;">${param.seriesName}</span>
                <span style="margin-left: auto; font-weight: 600; color: #F1F5F9;">${param.value}</span>
              </div>`;
            }
          });
          result += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); display: flex; justify-content: space-between;">
            <span style="color: #94A3B8;">Total</span>
            <span style="font-weight: 600; color: #E5E7EB;">${total}</span>
          </div>`;
          return result;
        }
      },
      legend: {
        show: false, // Hide native legend - using custom legend instead
        data: visibleKeys,
        top: 0,
        textStyle: {
          color: 'rgba(203, 213, 225, 0.45)', // Reduced opacity if shown
          fontSize: 10
        },
        itemGap: 20,
        itemWidth: 12,
        itemHeight: 8,
        selected: Object.fromEntries(
          allKeys.map(key => [key, !hiddenKeys.has(key)])
        )
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '12%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: chartData.map(d => d.year),
        axisLabel: {
          color: '#94A3B8',
          fontSize: 11,
          rotate: 0, // Horizontal, not tilted
          interval: 'auto'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.15)', // Very soft line
            width: 1
          }
        },
        axisTick: {
          show: false // No ticks
        },
        splitLine: {
          show: false // No split lines on x-axis
        }
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          color: '#94A3B8',
          fontSize: 11
        },
        axisLine: {
          show: false // No axis line
        },
        axisTick: {
          show: false // No ticks
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.08)',
            type: 'dashed',
            width: 1,
          }
        }
      },
      dataZoom: [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
          bottom: 0, // Closer to chart
          height: 25, // Smaller height
          handleSize: 8,
          handleStyle: {
            color: 'rgba(96, 165, 250, 0.6)', // Translucent handle
            borderColor: 'rgba(96, 165, 250, 0.3)',
            borderWidth: 1
          },
          dataBackground: {
            areaStyle: {
              color: 'rgba(96, 165, 250, 0.05)' // Very subtle
            },
            lineStyle: {
              color: 'rgba(96, 165, 250, 0.2)', // Soft line
              width: 1
            }
          },
          selectedDataBackground: {
            areaStyle: {
              color: 'rgba(96, 165, 250, 0.1)' // Slightly more visible
            },
            lineStyle: {
              color: 'rgba(96, 165, 250, 0.4)',
              width: 1
            }
          },
          textStyle: {
            color: '#94A3B8',
            fontSize: 10
          },
          borderColor: 'rgba(148, 163, 184, 0.1)' // Soft border
        },
        {
          type: 'inside' as const,
          xAxisIndex: [0],
          start: 0,
          end: 100
        }
      ],
      series
    };
  }, [chartData, visibleKeys, colors, hiddenKeys, allKeys]);

  // Handle legend select change
  const onLegendSelectChanged = (params: any) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (params.selected[params.name] === false) {
        next.add(params.name);
      } else {
        next.delete(params.name);
      }
      return next;
    });
  };

  return (
    <section id="governance-over-time" className="relative w-full pt-2 pb-4">
      <header className="mb-4">
        <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
          Governance Over Time
        </h2>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">
          How proposals have evolved across categories and lifecycle stages
        </p>
      </header>
      <div className="w-full max-w-full px-0">
        
          {/* Compact Insight Chip */}
          {insight && (
            <div className="mb-6 w-full max-w-full">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 dark:bg-cyan-500/10 border border-slate-300 dark:border-cyan-500/20 px-4 py-1.5 text-xs text-slate-700 dark:text-cyan-300">
                <span>📈</span>
                <span>{insight}</span>
              </div>
            </div>
          )}

          {/* Two-Column Layout: Chart + Controls/Legend */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 w-full max-w-full">
            {/* Left: Chart */}
            <div>
              {/* Chart Container - Primary Signal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="rounded-2xl border border-slate-200 dark:border-slate-700/20 bg-white dark:bg-slate-900/70 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-cyan-400" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-96 text-slate-400">
                    No data available
                  </div>
                ) : chartOption ? (
                  <div className="relative" key={`${viewMode}-${includeRIPs}`}>
                    <ReactECharts
                      ref={chartRef}
                      option={chartOption}
                      style={{ height: '480px', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                      onEvents={{
                        legendselectchanged: onLegendSelectChanged
                      }}
                    />
                  </div>
                ) : null}
              </motion.div>

              {/* Year Chips - Below Chart */}
              {availableYears.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                  {availableYears.slice(0, 4).map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year === selectedYear ? null : year)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        selectedYear === year
                          ? 'bg-slate-200 dark:bg-cyan-500/20 text-slate-800 dark:text-cyan-300 border border-slate-300 dark:border-cyan-500/30 dark:shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-slate-300 dark:border-slate-700/30 hover:border-slate-400 dark:hover:border-slate-600/50'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                  {availableYears.length > 4 && (
                    <select
                      value={selectedYear && availableYears.slice(0, 4).includes(selectedYear) ? '' : (selectedYear || '')}
                      onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-cyan-500/30 border border-slate-300 dark:border-slate-700/30 hover:border-slate-400 dark:hover:border-slate-600/50 transition-colors"
                    >
                      <option value="">More...</option>
                      {availableYears.slice(4).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Right: Controls + Legend */}
            <div className="space-y-4">
              {/* Compact Controls */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-900/40 p-3 backdrop-blur-md space-y-3">
              {/* Category/Status Toggle */}
                <div className="flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800/30">
                <button
                  onClick={() => setViewMode('category')}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'category'
                        ? 'bg-slate-200 dark:bg-cyan-500/20 text-slate-800 dark:text-cyan-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setViewMode('status')}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'status'
                        ? 'bg-slate-200 dark:bg-cyan-500/20 text-slate-800 dark:text-cyan-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  Status
                </button>
              </div>

              {/* RIP Filter */}
                <label className="flex items-center gap-2 text-xs text-slate-400/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRIPs}
                  onChange={(e) => setIncludeRIPs(e.target.checked)}
                    className="rounded border-slate-600/50 bg-slate-800/30 text-cyan-500 focus:ring-cyan-500"
                />
                Include RIPs
              </label>
            </div>

              {/* Analytical Legend with Counts */}
              {!loading && chartData.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-900/40 p-3 backdrop-blur-md space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Legend</div>
                  <div className="space-y-1.5">
                    {Object.keys(colors).map(key => {
                      const isHidden = hiddenKeys.has(key);
                      const color = colors[key] || '#64748B';
                      const total = keyTotals[key] || 0;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleKey(key)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md transition-all ${
                            isHidden
                              ? 'bg-slate-100 dark:bg-slate-800/20 text-slate-500 dark:text-slate-500/60'
                              : 'bg-slate-200 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-sm"
                              style={{
                                backgroundColor: color,
                                opacity: isHidden ? 0.2 : 0.8,
                                boxShadow: isHidden ? 'none' : `0 0 4px ${color}50`
                              }}
                            />
                            <span className="text-xs font-medium">{key}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums">{total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            </div>

        {/* Compact Table - Only show when year selected */}
        {selectedYear && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 w-full max-w-full rounded-xl border border-slate-200 dark:border-slate-700/20 bg-white dark:bg-slate-900/30 p-4 backdrop-blur-xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedYear} · {detailedData.length} {detailedData.length === 1 ? 'proposal' : 'proposals'}
              </h3>
              {detailedData.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 bg-slate-200 dark:bg-cyan-400/10 text-slate-700 dark:text-cyan-300 hover:bg-slate-300 dark:hover:bg-cyan-400/15 transition-all text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              )}
            </div>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 dark:text-cyan-400" />
              </div>
            ) : detailedData.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No data available for {selectedYear}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-950/90 backdrop-blur-md z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700/20">
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">EIP #</th>
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">Title</th>
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">Meta</th>
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/30">
                    {detailedData
                      .filter(item => item.eipNumber && item.eipNumber > 0) // Filter out invalid entries
                      .map((item) => {
                        const statusColor = statusColors[item.status] || '#64748B';
                        const meta = `${item.category || item.type || 'Unknown'}${item.author && item.author !== 'Unknown' ? ` · ${item.author}` : ''}`;
                        return (
                          <tr key={item.eipNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors relative group">
                            {/* Row Heat - Left Accent Bar */}
                            <td className="absolute left-0 top-0 h-full w-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: statusColor }} />
                            <td className="px-3 py-2 text-xs font-mono text-slate-700 dark:text-cyan-300/90">{item.eipNumber}</td>
                            <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300/90">{item.title || 'Untitled'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-sm border ${
                              item.status === 'Final' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' :
                              item.status === 'Draft' ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20' :
                              item.status === 'Review' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20' :
                              item.status === 'Last Call' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20' :
                              item.status === 'Withdrawn' ? 'bg-slate-500/15 text-slate-400 border-slate-500/20' :
                              'bg-slate-500/15 text-slate-500 border-slate-500/20'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-slate-400/80">{meta}</td>
                          <td className="px-3 py-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 dark:text-cyan-400/90 hover:text-slate-900 dark:hover:text-cyan-300 text-xs transition-colors"
                            >
                              →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </section>
  );
}
