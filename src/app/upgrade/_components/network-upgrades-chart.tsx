'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, RotateCcw, Download, Info, ChevronDown, ChevronUp, Move } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import {
  rawData,
  eipTitles,
  upgradeMetaEIPs,
  upgradeDescriptions,
  professionalColorMap,
  pairedUpgradeNames,
  consensusSpecsLinks,
  executionSpecsLinks,
  type UpgradeData,
} from '@/data/network-upgrades';

// Process data for display
const processUpgradeData = () => {
  const processed: Array<{
    date: string;
    upgrade: string;
    eips: string[];
    isMeta: boolean;
    layer?: 'execution' | 'consensus';
    blockNumber?: number;
    forkEpoch?: number;
  }> = [];

  rawData.forEach((item: { upgrade: any; eips: any; date?: string; isMeta?: boolean; layer?: "execution" | "consensus" | undefined; blockNumber?: number | undefined; forkEpoch?: number | undefined; }) => {
    const metaEIP = upgradeMetaEIPs[item.upgrade];
    const processedEips = item.eips.map((eip: string) =>
      eip === 'NO-EIP' || eip === 'CONSENSUS' ? eip : eip.replace('EIP-', '')
    );

    if (processedEips.length > 0 && item.date) {
      processed.push({
        date: item.date,
        upgrade: item.upgrade,
        eips: processedEips,
        isMeta: false,
        layer: item.layer,
        blockNumber: item.blockNumber,
        forkEpoch: item.forkEpoch,
      });
    }

    if (metaEIP && item.date) {
      processed.push({
        date: item.date,
        upgrade: item.upgrade,
        eips: [metaEIP.replace('EIP-', '')],
        isMeta: true,
        layer: item.layer,
        blockNumber: item.blockNumber,
        forkEpoch: item.forkEpoch,
      });
    }
  });

  return processed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

};

const upgradeRows = processUpgradeData();
const allDates = Array.from(new Set(upgradeRows.map((r) => r.date))).sort();
const maxEips = Math.max(...upgradeRows.map((r) => r.eips.length || 1), 1);

export function NetworkUpgradesChart() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [hoveredData, setHoveredData] = useState<{
    date: string;
    upgrade: string;
    eip: string;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showLayerInfo, setShowLayerInfo] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const minWidth = Math.max(2800, allDates.length * 140);
        const width = Math.max(containerRef.current.clientWidth, minWidth);
        const height = Math.max(400, maxEips * 35 + 150);
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const margin = { top: 60, right: 40, bottom: 140, left: 100 };
  const { width, height } = dimensions;

  const dateToUpgradeMap = upgradeRows.reduce((acc, row) => {
    if (!acc[row.date]) {
      acc[row.date] = pairedUpgradeNames[row.date] || row.upgrade;
    } else if (!pairedUpgradeNames[row.date] && !acc[row.date].includes(row.upgrade)) {
      acc[row.date] = `${acc[row.date]} / ${row.upgrade}`;
    }
    return acc;
  }, {} as Record<string, string>);

  const xScale = scaleBand({
    domain: allDates,
    range: [margin.left, width - margin.right],
    padding: 0.1,
  });

  const yScale = scaleLinear({
    domain: [0, maxEips + 1],
    range: [height - margin.bottom, margin.top],
  });

  const resetZoom = () => {
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMousePos(newMousePos);

    if (isDragging && zoomLevel > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      setOffset((prev) => ({
        x: prev.x - dx / zoomLevel,
        y: prev.y - dy / zoomLevel,
      }));
    }
  };

  const handleEipClick = (eip: string, upgrade: string) => {
    if (eip === 'CONSENSUS') {
      const link = consensusSpecsLinks[upgrade];
      if (link) window.open(link, '_blank');
    } else if (eip === 'NO-EIP') {
      const link = executionSpecsLinks[upgrade];
      if (link) window.open(link, '_blank');
    } else {
      const eipNumber = eip.replace('EIP-', '').replace('-removed', '');
      router.push(`/eip/${eipNumber}`);
    }
  };

  const downloadCSV = () => {
    const sortedData = [...rawData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const headers = [
      '#',
      'Upgrade',
      'Date',
      'Execution Layer',
      'Consensus Layer',
      'Block Number',
      'Fork Epoch',
      'Meta EIP',
      'EIPs',
    ];

    const rows = sortedData.map((upgrade, index) => {
      const metaEIP = upgradeMetaEIPs[upgrade.upgrade] || '';
      const eips = upgrade.eips
        .filter((e: string) => e !== 'NO-EIP' && e !== 'CONSENSUS')
        .map((e: string) => e.replace('EIP-', ''))
        .join('; ');

      return [
        sortedData.length - index,
        upgrade.upgrade,
        upgrade.date,
        upgrade.layer === 'execution' ? upgrade.upgrade : '',
        upgrade.layer === 'consensus' ? upgrade.upgrade : '',
        upgrade.blockNumber || '',
        upgrade.forkEpoch || '',
        metaEIP,
        eips,
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ethereum_network_upgrades.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals for each DATE
  const dateTotals: Record<string, { core: number; meta: number; execution: number; consensus: number }> = {};
  rawData.forEach((item) => {
    const dateKey = String(item.date);
    if (!dateTotals[dateKey]) {
      dateTotals[dateKey] = { core: 0, meta: 0, execution: 0, consensus: 0 };
    }

    const metaEIP = upgradeMetaEIPs[item.upgrade];
    const coreCount = item.eips.filter((eip) => {
      if (eip === 'NO-EIP' || eip === 'CONSENSUS') return false;
      const eipNumber = eip.replace('EIP-', '').replace('-removed', '');
      const eipInfo = eipTitles[eipNumber];
      return eipInfo && eipInfo.category === 'Core';
    }).length;

    dateTotals[item.date].core += coreCount;
    if (metaEIP) dateTotals[item.date].meta += 1;

    if (item.layer === 'execution') {
      dateTotals[item.date].execution += coreCount;
    } else if (item.layer === 'consensus') {
      dateTotals[item.date].consensus += coreCount;
    }
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg border border-cyan-400/20 bg-slate-950/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-cyan-400/10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-md font-bold text-white mb-1">Comprehensive timeline of Ethereum network upgrades and their associated EIP implementations</h3>

          </div>
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex gap-1 rounded-lg bg-slate-900/95 backdrop-blur-md border border-cyan-400/20 p-1">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z * 1.2, 3))}
                disabled={zoomLevel >= 3}
                className={cn(
                  'p-2 rounded-md transition-all text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z / 1.2, 0.5))}
                disabled={zoomLevel <= 0.5}
                className={cn(
                  'p-2 rounded-md transition-all text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={resetZoom}
                disabled={zoomLevel === 1 && offset.x === 0 && offset.y === 0}
                className={cn(
                  'p-2 rounded-md transition-all text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            {/* Export Button */}
            <button
              onClick={downloadCSV}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-all text-sm font-medium"
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Layer Info Toggle */}
        <button
          onClick={() => setShowLayerInfo(!showLayerInfo)}
          className="mt-3 flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          <span>{showLayerInfo ? 'Hide' : 'Show'} Layer Information</span>
          {showLayerInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {/* Layer Info Panel */}
        <AnimatePresence>
          {showLayerInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="p-3 rounded-lg border border-cyan-400/20 bg-slate-900/50 backdrop-blur-sm">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Understanding Layer Badges</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Network upgrades are categorized by the layer of the Ethereum protocol they modify:
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          ⚙️ Execution Layer
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Protocol changes implemented through EIPs. These affect transaction execution, gas mechanics, smart contracts, and the EVM.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-400/30">
                          ⛓️ Consensus Layer
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Beacon Chain upgrades that affect proof-of-stake consensus, validators, attestations, and the beacon chain protocol.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chart Container */}
      <div
        className="relative overflow-auto bg-slate-900/30"
        style={{ height: `${height + 10}px`, minHeight: '400px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {zoomLevel > 1 && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-cyan-400/20 px-2.5 py-1.5">
            <Move className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-medium">Drag to pan</span>
          </div>
        )}

        <svg
          width={width}
          height={height}
          viewBox={`${offset.x} ${offset.y} ${width / zoomLevel} ${height / zoomLevel}`}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            minWidth: `${width}px`,
            display: 'block',
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <Group>
            <AxisBottom
              top={height - margin.bottom + 20}
              scale={xScale}
              tickFormat={(date) => {
                return dateToUpgradeMap[date as string] || (date as string);
              }}
              tickLabelProps={() => ({
                fontSize: 10,
                textAnchor: 'middle',
                fill: '#9CA3AF',
                fontWeight: '600',
                dy: '0.33em',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              })}
              numTicks={allDates.length}
            />

            {/* Date badges */}
            {allDates.map((date) => {
              const x = xScale(date);
              if (x == null) return null;

              return (
                <g key={`date-badge-${date}`}>
                  <rect
                    x={x + xScale.bandwidth() / 2 - 35}
                    y={height - margin.bottom + 75}
                    width={70}
                    height={16}
                    fill="#1A202C"
                    stroke="#4A5568"
                    strokeWidth={0.5}
                    rx={4}
                    opacity={0.95}
                  />
                  <text
                    x={x + xScale.bandwidth() / 2}
                    y={height - margin.bottom + 85}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#CBD5E0"
                    fontWeight="600"
                  >
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </text>
                </g>
              );
            })}

            <AxisLeft
              left={margin.left}
              scale={yScale}
              tickLabelProps={() => ({
                fontSize: 10,
                textAnchor: 'end',
                fill: '#9CA3AF',
              })}
            />

            {/* EIP bars */}
            {upgradeRows.map(({ date, upgrade, eips, isMeta, layer }, i) => {
              const x = xScale(date);
              if (x == null) return null;

              // Get all rows for this date (both execution and consensus)
              const allRowsForDate = upgradeRows.filter((r) => r.date === date && !r.isMeta);
              const baseEipCount = allRowsForDate.reduce((sum, r) => sum + r.eips.length, 0);

              // Calculate position for this specific EIP
              let yPosition = 0;
              if (!isMeta) {
                let countBefore = 0;
                for (const row of allRowsForDate) {
                  if (row.upgrade === upgrade) {
                    const indexInRow = row.eips.indexOf(eips[0]);
                    if (indexInRow >= 0) {
                      yPosition = countBefore + indexInRow + 1;
                      break;
                    }
                  }
                  countBefore += row.eips.length;
                }
              }

              return eips.map((eip, j) => {
                const finalYPosition = isMeta ? 0 : yPosition + j;
                const y = yScale(finalYPosition);
                const isRemoved = eip.includes('-removed');
                const color = isRemoved
                  ? '#EF4444'
                  : isMeta
                    ? '#8B5CF6'
                    : professionalColorMap[upgrade] || '#6B7280';

                return (
                  <Group key={`${date}-${upgrade}-${eip}-${j}-${isMeta}`}>
                    {/* Core Total label */}
                    {!isMeta &&
                      i === upgradeRows.findIndex((r) => r.date === date && !r.isMeta) &&
                      j === 0 &&
                      dateTotals[date] &&
                      dateTotals[date].core > 0 && (
                        <text
                          x={x + xScale.bandwidth() / 2}
                          y={yScale(baseEipCount + 1.5)}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize={9}
                          fontWeight="700"
                          style={{
                            pointerEvents: 'none',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                          }}
                        >
                          {dateTotals[date].core} Core Total
                        </text>
                      )}

                    <rect
                      x={x}
                      y={y}
                      width={xScale.bandwidth()}
                      height={18}
                      fill={color}
                      rx={2}
                      stroke={isRemoved ? '#B91C1C' : isMeta ? '#6D28D9' : 'none'}
                      strokeWidth={isRemoved ? 2 : isMeta ? 1.5 : 0}
                      strokeDasharray={isMeta ? '3,2' : 'none'}
                      style={{
                        cursor: 'pointer',
                        opacity: hoveredData?.eip === eip ? 1 : isRemoved ? 0.75 : isMeta ? 0.85 : 0.9,
                      }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredData({ date, upgrade, eip });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        setHoveredData(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEipClick(eip, upgrade);
                      }}
                    />

                    {/* Layer badge */}
                    {!isMeta && layer && eip !== 'NO-EIP' && eip !== 'CONSENSUS' && (
                      <text
                        x={x + 3}
                        y={y + 6}
                        fontSize={5}
                        fill="#FFFFFF"
                        fontWeight="600"
                        style={{
                          pointerEvents: 'none',
                          opacity: 0.7,
                        }}
                      >
                        {layer === 'execution' ? 'E' : 'C'}
                      </text>
                    )}

                    {/* Removed indicator */}
                    {isRemoved && (
                      <line
                        x1={x + 2}
                        y1={y + 9}
                        x2={x + xScale.bandwidth() - 2}
                        y2={y + 9}
                        stroke="#FCA5A5"
                        strokeWidth={2}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {/* EIP number text */}
                    <text
                      x={x + xScale.bandwidth() / 2}
                      y={y + 13}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize={isMeta ? 8 : 9}
                      fontWeight="600"
                      fontStyle={isMeta ? 'italic' : 'normal'}
                      textDecoration={isRemoved ? 'line-through' : 'none'}
                      style={{
                        pointerEvents: 'none',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    >
                      {eip.replace('-removed', '')}
                    </text>
                  </Group>
                );
              });
            })}
          </Group>
        </svg>

        {/* Tooltip */}
        {hoveredData && (() => {
          const currentUpgradeData = upgradeRows.find((r) => r.upgrade === hoveredData.upgrade && !r.isMeta);
          const cleanEipNumber = hoveredData.eip.replace('-removed', '');
          const isRemoved = hoveredData.eip.includes('-removed');
          const eipInfo =
            hoveredData.eip !== 'CONSENSUS' && hoveredData.eip !== 'NO-EIP'
              ? eipTitles[cleanEipNumber]
              : null;
          const upgradeData = rawData.find((r: { upgrade: string; }) => r.upgrade === hoveredData.upgrade);
          const coreEipsCount =
            upgradeData?.eips.filter((eip: string) => {
              if (eip === 'NO-EIP' || eip === 'CONSENSUS') return false;
              const eipNumber = eip.replace('EIP-', '').replace('-removed', '');
              const eipInfo = eipTitles[eipNumber];
              return eipInfo && eipInfo.category === 'Core';
            }).length || 0;
          const metaEIP = upgradeMetaEIPs[hoveredData.upgrade];
          const isMetaEIP = metaEIP && hoveredData.eip === metaEIP.replace('EIP-', '');

          const tooltipWidth = 280;
          const tooltipHeight = 220;
          const offsetX = 15;
          const offsetY = 15;
          const padding = 10;
          const containerWidth = containerRef.current?.clientWidth || width;
          const containerHeight = containerRef.current?.clientHeight || height;

          let tooltipX = mousePos.x + offsetX;
          let tooltipY = mousePos.y + offsetY;

          if (tooltipX + tooltipWidth + padding > containerWidth) {
            tooltipX = mousePos.x - tooltipWidth - offsetX;
          }

          if (tooltipY + tooltipHeight + padding > containerHeight) {
            tooltipY = mousePos.y - tooltipHeight - offsetY;
          }

          if (tooltipX < padding) {
            tooltipX = padding;
          }

          if (tooltipY < padding) {
            tooltipY = padding;
          }

          return (
            <div
              className="absolute z-20 bg-slate-900/95 backdrop-blur-md border-2 border-cyan-400/40 rounded-lg p-4 shadow-2xl pointer-events-none"
              style={{
                top: `${tooltipY}px`,
                left: `${tooltipX}px`,
                width: `${tooltipWidth}px`,
                maxHeight: `${tooltipHeight}px`,
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-bold',
                      isRemoved
                        ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                        : hoveredData.eip === 'CONSENSUS'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                          : hoveredData.eip === 'NO-EIP'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    )}
                  >
                    {isRemoved
                      ? `⚠️ REMOVED: EIP-${cleanEipNumber}`
                      : hoveredData.eip === 'CONSENSUS'
                        ? '🔗 Consensus'
                        : hoveredData.eip === 'NO-EIP'
                          ? '⚠️ Irregular'
                          : `EIP-${hoveredData.eip}`}
                  </span>
                  {upgradeData?.layer && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold',
                        upgradeData.layer === 'consensus'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      )}
                    >
                      {upgradeData.layer === 'consensus' ? '⛓️ Consensus' : '⚙️ Execution'}
                    </span>
                  )}
                </div>

                {eipInfo && (
                  <div className="p-2 rounded-md bg-cyan-500/10 border border-cyan-400/20">
                    <p className="text-xs font-semibold text-white leading-tight">{eipInfo.title}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-white">{hoveredData.upgrade}</p>
                  {upgradeDescriptions[hoveredData.upgrade] && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {upgradeDescriptions[hoveredData.upgrade]}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-700/50 space-y-1">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      📅{' '}
                      {new Date(hoveredData.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {upgradeData?.blockNumber && (
                      <span>🧱 {upgradeData.blockNumber.toLocaleString()}</span>
                    )}
                    {upgradeData?.forkEpoch && (
                      <span>🔱 {upgradeData.forkEpoch.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/50">
                  <p className="text-[10px] text-cyan-400 font-medium">
                    {hoveredData.eip === 'CONSENSUS' || hoveredData.eip === 'NO-EIP'
                      ? '💡 Click for GitHub specs'
                      : '💡 Click for full details'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
