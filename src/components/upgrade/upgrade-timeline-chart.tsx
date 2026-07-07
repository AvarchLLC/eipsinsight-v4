'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Plus, Minus, RotateCcw, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type StatusType = 'included' | 'scheduled' | 'declined' | 'considered' | 'proposed';

interface EIPData {
  date: string;
  included: string[];
  scheduled: string[];
  declined: string[];
  considered: string[];
  proposed: string[];
}

interface UpgradeTimelineChartProps {
  data: EIPData[];
  upgradeName: string;
}

const COLOR_SCHEME: Record<StatusType, string> = {
  included: '#10B981', // emerald-500
  scheduled: '#06B6D4', // cyan-500
  considered: '#F59E0B', // amber-500
  declined: '#EF4444', // red-500
  proposed: '#8B5CF6', // violet-500
};

const LEGEND_LABELS: Record<StatusType, string> = {
  included: 'INCLUDED',
  scheduled: 'SFI',
  considered: 'CFI',
  declined: 'DFI',
  proposed: 'PFI',
};

export function UpgradeTimelineChart({ data, upgradeName }: UpgradeTimelineChartProps) {
  const router = useRouter();
  const [scrollIndex, setScrollIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEip, setHoveredEip] = useState<{
    eip: string;
    type: StatusType;
    date: string;
    statusCounts: {
      included: number;
      scheduled: number;
      considered: number;
      declined: number;
      proposed: number;
    };
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const dataToRender = Array.isArray(data) ? data : [];
  const maxVisibleRows = 20;
  const visibleData = [...dataToRender].reverse().slice(scrollIndex, scrollIndex + maxVisibleRows);

  const MIN_ITEMS_DISPLAYED = 7;
  const maxItems = Math.max(
    MIN_ITEMS_DISPLAYED,
    ...dataToRender.map(
      (d) =>
        (d.included?.length || 0) +
        (d.scheduled?.length || 0) +
        (d.considered?.length || 0) +
        (d.declined?.length || 0) +
        (d.proposed?.length || 0)
    )
  );

  // Auto-scale boxes based on the number of EIPs
  // For upgrades with fewer EIPs (historical), use smaller boxes
  // For upgrades with many EIPs (Pectra/Fusaka), use larger boxes
  const cubeSize = maxItems <= 10 ? 16 : maxItems <= 15 ? 20 : 24;
  const blockHeight = cubeSize;
  const blockWidth = cubeSize * 1.8;
  const padding = maxItems <= 10 ? 60 : maxItems <= 15 ? 70 : 80;
  const rowHeight = cubeSize + (maxItems <= 10 ? 8 : 10);

  const blockSpacing = maxItems <= 10 ? 3 : 4;
  const xScale = scaleLinear({
    domain: [0, maxItems],
    range: [0, maxItems * (blockWidth + blockSpacing)],
  });
  const chartWidth = xScale(maxItems) + 200;
  const chartPaddingBottom = 30;
  const chartHeight = visibleData.length * rowHeight + chartPaddingBottom;

  const resetZoom = () => {
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    },
    [zoomLevel]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Calculate mouse position relative to container (scroll-aware)
      if (chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left + chartContainerRef.current.scrollLeft,
          y: e.clientY - rect.top + chartContainerRef.current.scrollTop,
        });
      }
      
      if (!isDragging || zoomLevel <= 1) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => ({
        x: prev.x - dx / zoomLevel,
        y: prev.y - dy / zoomLevel,
      }));
    },
    [isDragging, zoomLevel]
  );

  const changeStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      included: 'INCLUDED',
      scheduled: 'SFI',
      considered: 'CFI',
      declined: 'DFI',
      proposed: 'PFI',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const downloadReport = () => {
    const rows = [...dataToRender].reverse().map((d) => ({
      date: d.date,
      included: d.included?.join(', ') || '-',
      considered: d.considered?.join(', ') || '-',
      declined: d.declined?.join(', ') || '-',
      scheduled: d.scheduled?.join(', ') || '-',
      proposed: d.proposed?.join(', ') || '-',
    }));

    const headers = ['ChangeDate', 'Included', 'Considered', 'Declined', 'Scheduled', 'Proposed'];
    const csv = [
      headers,
      ...rows.map((r) => [
        r.date,
        `"${r.included}"`,
        `"${r.considered}"`,
        `"${r.declined}"`,
        `"${r.scheduled}"`,
        `"${r.proposed}"`,
      ]),
    ]
      .map((r) => r.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${upgradeName.toLowerCase()}_network_upgrade.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/70">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
          <div className="flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">EIP Composition Timeline</h3>
            <p className="text-sm text-muted-foreground leading-snug">
              Track EIP inclusion stages for <span className="text-foreground font-medium">{upgradeName}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Zoom Controls */}
            <div className="flex gap-0.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border p-1">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z * 1.2, 3))}
                disabled={zoomLevel >= 3}
                className={cn(
                  'p-1 rounded transition-all text-muted-foreground hover:text-primary hover:bg-primary/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Zoom in"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z / 1.2, 0.5))}
                disabled={zoomLevel <= 0.5}
                className={cn(
                  'p-1 rounded transition-all text-muted-foreground hover:text-primary hover:bg-primary/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Zoom out"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                onClick={resetZoom}
                disabled={zoomLevel === 1 && offset.x === 0 && offset.y === 0}
                className={cn(
                  'p-1 rounded transition-all text-muted-foreground hover:text-primary hover:bg-primary/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Reset"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
            {/* Export Button */}
            <button
              onClick={downloadReport}
              className="h-8 px-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15 transition-colors text-xs font-medium flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2.5 pt-2.5 border-t border-border/70 flex flex-wrap gap-2 justify-center items-center">
          {(Object.entries(COLOR_SCHEME) as [StatusType, string][]).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="h-1.5 w-1.5 rounded-full border border-white/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-muted-foreground">{LEGEND_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="relative overflow-auto bg-muted/30"
        style={{ height: `${chartHeight + 8}px`, minHeight: '450px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredEip(null);
        }}
      >
        {zoomLevel > 1 && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-card/90 backdrop-blur-md border border-border px-2 py-1">
            <span className="text-xs text-primary font-medium">Drag to pan</span>
          </div>
        )}

        <svg
          viewBox={`${offset.x} ${offset.y} ${chartWidth / zoomLevel} ${chartHeight / zoomLevel}`}
          preserveAspectRatio="xMinYMin meet"
          style={{
            width: '100%',
            height: 'auto',
            minWidth: `${chartWidth}px`,
            display: 'block',
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <Group top={padding} left={padding}>
            {visibleData.map((item, rowIndex) => {
              const allEips: { eip: string; type: StatusType }[] = [
                ...(item.included ?? []).map((eip) => ({ eip, type: 'included' as const })),
                ...(item.scheduled ?? []).map((eip) => ({ eip, type: 'scheduled' as const })),
                ...(item.considered ?? []).map((eip) => ({ eip, type: 'considered' as const })),
                ...(item.declined ?? []).map((eip) => ({ eip, type: 'declined' as const })),
                ...(item.proposed ?? []).map((eip) => ({ eip, type: 'proposed' as const })),
              ];

              return (
                <Group key={rowIndex} top={rowIndex * rowHeight}>
                  <Group left={80}>
                    {allEips.map((d, i) => {
                      const eipNum = d.eip.replace(/EIP-/, '');
                      return (
                        <g
                          key={i}
                          onClick={() => router.push(`/eip/${eipNum}`)}
                          className="cursor-pointer"
                          onMouseEnter={() => {
                            setHoveredEip({
                              ...d,
                              date: item.date,
                              statusCounts: {
                                included: item.included?.length || 0,
                                scheduled: item.scheduled?.length || 0,
                                considered: item.considered?.length || 0,
                                declined: item.declined?.length || 0,
                                proposed: item.proposed?.length || 0,
                              },
                            });
                          }}
                          onMouseLeave={() => setHoveredEip(null)}
                        >
                          <rect
                            x={xScale(i)}
                            y={0}
                            width={blockWidth}
                            height={blockHeight}
                            rx={3}
                            fill={COLOR_SCHEME[d.type]}
                            stroke="#1e293b"
                            strokeWidth={0.8}
                            className="transition-opacity hover:opacity-90"
                          />
                          <text
                            x={xScale(i) + blockWidth / 2}
                            y={blockHeight / 1.5}
                            fontSize={maxItems <= 10 ? 9 : 10}
                            textAnchor="middle"
                            fill="white"
                            fontWeight="600"
                            className="pointer-events-none select-none"
                          >
                            {eipNum}
                          </text>
                        </g>
                      );
                    })}
                  </Group>
                </Group>
              );
            })}

            {/* Y-Axis Labels: Dates */}
            {visibleData.map((item, rowIndex) => {
              const yPos = rowIndex * rowHeight + blockHeight / 1.5;
              return (
                <g key={`ylabel-${rowIndex}`}>
                  <text
                    x={0}
                    y={yPos}
                    fontSize={maxItems <= 10 ? 9 : 10}
                    fontWeight="600"
                    fill="#94a3b8"
                    textAnchor="start"
                    className="select-none"
                  >
                    {new Date(item.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </text>
                </g>
              );
            })}
          </Group>
        </svg>

        {/* Tooltip */}
        {hoveredEip && chartContainerRef.current && (() => {
          const tooltipWidth = 240;
          const tooltipHeight = 160;
          const gap = 12; // space below cursor
          
          // Position tooltip relative to container (works with scroll + zoom)
          const containerRect = chartContainerRef.current.getBoundingClientRect();
          const containerWidth = chartContainerRef.current.scrollWidth;
          const containerHeight = chartContainerRef.current.scrollHeight;
          
          let left = mousePos.x + gap;
          let top = mousePos.y + gap;
          
          // Prevent overflow within container
          if (left + tooltipWidth > containerWidth) {
            left = mousePos.x - tooltipWidth - gap;
          }
          if (top + tooltipHeight > containerHeight) {
            top = mousePos.y - tooltipHeight - gap;
          }
          
          return (
            <div
              className="absolute z-[9999] bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-2xl pointer-events-none"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${tooltipWidth}px`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-white"
                    style={{ backgroundColor: COLOR_SCHEME[hoveredEip.type] }}
                  >
                    EIP-{hoveredEip.eip.replace(/EIP-/, '')}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {changeStatus(hoveredEip.type)}
                  </span>
                </div>
                
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(hoveredEip.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                  })}
                </p>
                
                <div className="pt-2 border-t border-border/70">
                  <p className="text-xs font-semibold text-foreground mb-1.5">EIP counts:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground">Included: {hoveredEip.statusCounts.included}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                      <span className="text-muted-foreground">SFI: {hoveredEip.statusCounts.scheduled}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-muted-foreground">CFI: {hoveredEip.statusCounts.considered}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-muted-foreground">DFI: {hoveredEip.statusCounts.declined}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                      <span className="text-muted-foreground">PFI: {hoveredEip.statusCounts.proposed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
