'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PRVolumeChartProps {
  data: Array<{
    month: string;
    created: number;
    merged: number;
    closed: number;
    openAtMonthEnd: number;
  }>;
}

export function PRVolumeChart({ data }: PRVolumeChartProps) {
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

  // Format month for display
  const formattedData = useMemo(() => {
    return data.map(item => ({
      month: item.month,
      monthDisplay: new Date(item.month + '-01').toLocaleDateString('en-US', { 
        month: 'short', 
        year: isMobile ? '2-digit' : 'numeric' 
      }),
      created: item.created,
      merged: -item.merged, // Negative for below axis
      closed: -item.closed, // Negative for below axis
      openAtMonthEnd: item.openAtMonthEnd,
    }));
  }, [data, isMobile]);

  // Calculate initial datazoom range (Oct 2024 to latest)
  const initialDataZoomRange = useMemo(() => {
    if (!formattedData || formattedData.length === 0) return { start: 0, end: 100 };
    
    const oct2024Index = formattedData.findIndex(d => d.month >= '2024-10');
    const totalMonths = formattedData.length;
    
    if (oct2024Index === -1) {
      // If Oct 2024 not found, show last 6 months
      return { start: Math.max(0, ((totalMonths - 6) / totalMonths) * 100), end: 100 };
    }
    
    const startPercent = (oct2024Index / totalMonths) * 100;
    return { start: startPercent, end: 100 };
  }, [formattedData]);

  // Download CSV
  const downloadCSV = () => {
    if (!data || data.length === 0) return;

    const headers = ['Month', 'Created', 'Merged', 'Closed', 'Open at Month End'];
    const rows = data.map(item => [
      item.month,
      item.created,
      item.merged,
      item.closed,
      item.openAtMonthEnd
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pr-monthly-activity-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ECharts option configuration - Protocol Telemetry Aesthetic
  const chartOption = useMemo(() => {
    const months = formattedData.map(d => d.monthDisplay);
    const createdData = formattedData.map(d => d.created);
    const mergedData = formattedData.map(d => d.merged);
    const closedData = formattedData.map(d => d.closed);
    const openDataRaw = formattedData.map(d => d.openAtMonthEnd);

    // Find max absolute values for symmetric y-axis
    const maxCreated = Math.max(...createdData, 0);
    const maxMerged = Math.abs(Math.min(...mergedData, 0));
    const maxClosed = Math.abs(Math.min(...closedData, 0));
    const maxOpen = Math.max(...openDataRaw, 0);
    
    // Calculate offset for open line (max of merged/closed, similar to old code)
    const getmin = Math.max(maxMerged, maxClosed);
    
    // Calculate y-axis range for main axis (bars)
    const maxValue = Math.max(maxCreated, maxMerged, maxClosed) * 1.1;
    
    // For open PRs line alignment:
    // The line should align with the zero line of the main axis
    // We offset the open data by getmin so it starts at the zero line
    const openData = openDataRaw.map(open => open + getmin);
    const maxOpenWithOffset = Math.max(...openData, 0);
    
    // Calculate the range for the secondary y-axis
    // It should have the same scale as the main axis for proper alignment
    const secondaryAxisMax = Math.max(maxOpenWithOffset, maxValue);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const,
          shadowStyle: {
            color: 'rgba(6, 182, 212, 0.1)'
          }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#E2E8F0',
          fontSize: isMobile ? 11 : 12
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 500; margin-bottom: 10px; color: #F1F5F9;">${params[0].axisValue}</div>`;
          
          // Calculate getmin for this tooltip (max of merged/closed)
          const getmin = Math.max(
            ...params
              .filter((p: any) => p.seriesName === 'Merged' || p.seriesName === 'Closed')
              .map((p: any) => Math.abs(p.value)),
            0
          );
          
          params.forEach((param: any) => {
            if (param.seriesName === 'Open PRs') {
              // Adjust display value: subtract the offset to show actual open count
              const actualOpen = param.value - getmin;
              result += `<div style="margin: 6px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 2px; background: ${param.color}; margin-right: 10px; box-shadow: 0 0 6px ${param.color}40;"></span>
                <span style="color: #CBD5E1;">${param.seriesName}</span>
                <span style="margin-left: auto; font-weight: 600; color: #F1F5F9;">${actualOpen}</span>
              </div>`;
            } else {
              const value = Math.abs(param.value);
              result += `<div style="margin: 6px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; background: ${param.color}; border-radius: 2px; margin-right: 10px; box-shadow: 0 0 6px ${param.color}40;"></span>
                <span style="color: #CBD5E1;">${param.seriesName}</span>
                <span style="margin-left: auto; font-weight: 600; color: #F1F5F9;">${value}</span>
              </div>`;
            }
          });
          
          return result;
        }
      },
      legend: {
        show: true,
        data: ['Created', 'Merged', 'Closed', 'Open PRs'],
        top: 0,
        textStyle: {
          color: 'rgba(203, 213, 225, 0.7)',
          fontSize: isMobile ? 10 : 11
        },
        itemGap: isMobile ? 12 : 20,
        itemWidth: 10,
        itemHeight: 8
      },
      grid: {
        left: isMobile ? '8%' : '6%',
        right: '4%',
        bottom: isMobile ? '20%' : '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: months,
        axisLabel: {
          color: '#94A3B8',
          fontSize: isMobile ? 9 : 11,
          rotate: isMobile ? -45 : -30,
          interval: 'auto'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.15)',
            width: 1
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'PR Count',
          nameLocation: 'middle',
          nameGap: 50,
          nameTextStyle: {
            color: '#94A3B8',
            fontSize: 11
          },
          axisLabel: {
            color: '#94A3B8',
            fontSize: isMobile ? 9 : 11,
            formatter: (value: number) => Math.abs(value).toString()
          },
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(148, 163, 184, 0.08)',
              type: 'dashed',
              width: 1
            }
          },
          min: -maxValue,
          max: maxValue
        },
        {
          type: 'value' as const,
          name: 'Open PRs',
          nameLocation: 'middle',
          nameGap: 50,
          nameTextStyle: {
            color: '#94A3B8',
            fontSize: 11
          },
          axisLabel: {
            color: '#94A3B8',
            fontSize: isMobile ? 9 : 11,
            formatter: (value: number) => {
              // Adjust label to show actual open count (subtract offset)
              const actualValue = value - getmin;
              return actualValue >= 0 ? actualValue.toString() : '';
            }
          },
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          // Align the open PRs axis properly with the main axis
          // The secondary axis should have its zero point (getmin) align with main axis zero
          // Use the same scale range for proper visual alignment
          min: getmin,
          max: secondaryAxisMax * 1.1,
          position: 'right'
        }
      ],
      dataZoom: [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          start: initialDataZoomRange.start,
          end: initialDataZoomRange.end,
          bottom: 0,
          height: 25,
          handleSize: 8,
          handleStyle: {
            color: 'rgba(6, 182, 212, 0.6)',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            borderWidth: 1
          },
          dataBackground: {
            areaStyle: {
              color: 'rgba(6, 182, 212, 0.05)'
            },
            lineStyle: {
              color: 'rgba(6, 182, 212, 0.2)',
              width: 1
            }
          },
          selectedDataBackground: {
            areaStyle: {
              color: 'rgba(6, 182, 212, 0.1)'
            },
            lineStyle: {
              color: 'rgba(6, 182, 212, 0.4)',
              width: 1
            }
          },
          textStyle: {
            color: '#94A3B8',
            fontSize: 10
          },
          borderColor: 'rgba(148, 163, 184, 0.1)'
        },
        {
          type: 'inside' as const,
          xAxisIndex: [0],
          start: initialDataZoomRange.start,
          end: initialDataZoomRange.end
        }
      ],
      series: [
        {
          name: 'Created',
          type: 'bar' as const,
          data: createdData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#06B6D499' },
              { offset: 1, color: '#06B6D44D' }
            ]),
            borderRadius: [4, 4, 0, 0],
            shadowBlur: 12,
            shadowOffsetY: -1,
            shadowColor: '#06B6D450'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: '#06B6D480',
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#06B6D4CC' },
                { offset: 1, color: '#06B6D480' }
              ])
            }
          }
        },
        {
          name: 'Merged',
          type: 'bar' as const,
          data: mergedData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10B98199' },
              { offset: 1, color: '#10B9814D' }
            ]),
            borderRadius: [0, 0, 0, 0],
            shadowBlur: 12,
            shadowOffsetY: 1,
            shadowColor: '#10B98150'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: '#10B98180',
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#10B981CC' },
                { offset: 1, color: '#10B98180' }
              ])
            }
          }
        },
        {
          name: 'Closed',
          type: 'bar' as const,
          data: closedData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#F43F5E99' },
              { offset: 1, color: '#F43F5E4D' }
            ]),
            borderRadius: [0, 0, 4, 4],
            shadowBlur: 12,
            shadowOffsetY: 1,
            shadowColor: '#F43F5E50'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: '#F43F5E80',
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#F43F5ECC' },
                { offset: 1, color: '#F43F5E80' }
              ])
            }
          }
        },
        {
          name: 'Open PRs',
          type: 'line' as const,
          yAxisIndex: 1,
          data: openData,
          symbol: 'circle',
          symbolSize: isMobile ? 4 : 6,
          lineStyle: {
            color: '#F59E0B',
            width: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(245, 158, 11, 0.4)'
          },
          itemStyle: {
            color: '#F59E0B',
            shadowBlur: 6,
            shadowColor: 'rgba(245, 158, 11, 0.5)'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(245, 158, 11, 0.7)'
            }
          },
          z: 10
        }
      ]
    };
  }, [formattedData, isMobile, initialDataZoomRange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Monthly PR Activity</h3>
          <p className="text-xs text-slate-400">Created (above), merged/closed (below), and open PRs (line)</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>
      
      <div className="w-full h-[350px] sm:h-[400px] lg:h-[500px]">
        <ReactECharts
          option={chartOption}
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </div>
    </motion.div>
  );
}
