"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusTransitionStackedChartProps {
  data: Array<Record<string, string | number>>;
  statuses?: string[];
  colors?: Record<string, string>;
  statusDescriptions?: Record<string, string>;
  title?: string;
  description?: string;
  showLegend?: boolean;
}

const DEFAULT_COLORS: Record<string, string> = {
  Draft: "#64748b",
  Review: "#f59e0b",
  "Last Call": "#f97316",
  Final: "#10b981",
  Living: "#22d3ee",
  Stagnant: "#6b7280",
  Withdrawn: "#ef4444",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  Draft: "Initial proposal stage - still being refined and revised",
  Review: "Under community and editor review - gathering feedback",
  "Last Call": "Final review period before becoming Final",
  Final: "Accepted and finalized - implementation ready",
  Living: "Continuously updated standard (never reaches Final)",
  Stagnant: "Inactive for 6+ months - needs revival or withdrawal",
  Withdrawn: "Removed from consideration - no longer active",
};

/**
 * StatusTransitionStackedChart Component
 * Displays proposal status transitions over time as grouped bar chart.
 * Each month shows separate bars for each status (Draft, Review, Final, etc.)
 */
export function StatusTransitionStackedChart({
  data,
  statuses,
  colors = DEFAULT_COLORS,
  statusDescriptions = STATUS_DESCRIPTIONS,
  title = "Proposal Status Flow",
  description = "Distribution of proposals across statuses over time",
  showLegend = true,
}: StatusTransitionStackedChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        months: [],
        statusList: [],
        monthGroups: [],
        maxValue: 0,
      };
    }

    // Determine which statuses to display
    const statusList =
      statuses ||
      Object.keys(data[0])
        .filter((k) => k !== "month")
        .sort((a, b) => {
          const aIndex = Object.keys(DEFAULT_COLORS).indexOf(a);
          const bIndex = Object.keys(DEFAULT_COLORS).indexOf(b);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

    const months = data.map((d) => d.month);
    
    // Find max value across all statuses and months
    const maxValue = Math.max(
      1,
      ...data.flatMap((d) =>
        statusList.map((status) => Number(d[status] || 0))
      )
    );

    // Create grouped bar data for each month
    const monthGroups = data.map((d) => {
      const bars = statusList.map((status) => ({
        status,
        value: Number(d[status] || 0),
        color: colors[status] || "#999",
        description: statusDescriptions[status],
      }));

      return {
        month: d.month as string,
        bars,
      };
    });

    return {
      months,
      statusList,
      monthGroups,
      maxValue,
    };
  }, [data, statuses, colors, statusDescriptions]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const { months, statusList, monthGroups, maxValue } = chartData;

  // Calculate responsive dimensions for single month display
  const padding = { top: 40, right: 24, bottom: 80, left: 60 };
  const barWidth = 56; // Much wider bars
  const barGap = 20; // Larger gaps between bars
  const totalBarWidth = statusList.length * (barWidth + barGap);
  const chartWidth = Math.max(800, totalBarWidth + padding.left + padding.right + 100);
  const chartHeight = 420;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="inline-block min-w-full">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="mx-auto"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Y-axis */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-300 dark:text-slate-600"
              />

              {/* X-axis */}
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-300 dark:text-slate-600"
              />

              {/* Grid lines and Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = padding.top + (1 - fraction) * plotHeight;
                const value = Math.round(maxValue * fraction);
                return (
                  <g key={`grid-${fraction}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      className="text-slate-200 dark:text-slate-700"
                      opacity="0.5"
                    />
                    <text
                      x={padding.left - 12}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      className="fill-muted-foreground font-medium"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* Status Bars - Centered */}
              {monthGroups[0] && monthGroups[0].bars.map((bar, barIndex) => {
                const startX = (chartWidth - totalBarWidth + barGap) / 2;
                const barX = startX + barIndex * (barWidth + barGap);
                const barHeight = Math.max(2, (bar.value / maxValue) * plotHeight);
                const barY = chartHeight - padding.bottom - barHeight;

                return (
                  <g key={`bar-${barIndex}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g className="cursor-pointer">
                          {/* Bar with gradient effect */}
                          <defs>
                            <linearGradient id={`grad-${barIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: bar.color, stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: bar.color, stopOpacity: 0.7 }} />
                            </linearGradient>
                          </defs>
                          <rect
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={`url(#grad-${barIndex})`}
                            rx="4"
                            ry="4"
                            className="transition-all duration-300 hover:opacity-90"
                            style={{
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                            }}
                          />
                          {/* Value label on top of bar */}
                          {bar.value > 0 && (
                            <text
                              x={barX + barWidth / 2}
                              y={barY - 8}
                              textAnchor="middle"
                              fontSize="14"
                              fontWeight="600"
                              className="fill-foreground"
                            >
                              {bar.value}
                            </text>
                          )}
                        </g>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: bar.color }}
                            />
                            <div className="text-sm font-bold">{bar.status}</div>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-foreground">{bar.value}</span>{" "}
                            {bar.value === 1 ? "proposal" : "proposals"}
                          </div>
                          {bar.description && (
                            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                              {bar.description}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Status label below bar */}
                    <text
                      x={barX + barWidth / 2}
                      y={chartHeight - padding.bottom + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="500"
                      className="fill-muted-foreground"
                    >
                      {bar.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Month Display */}
        {monthGroups.length > 0 && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-foreground">
                {monthGroups[0].month}
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Legend with Descriptions */}
        {showLegend && statusList.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Reference
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {statusList.map((status) => (
                <Tooltip key={status}>
                  <TooltipTrigger asChild>
                    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 hover:bg-muted/40 transition-colors cursor-help">
                      <div
                        className="h-4 w-4 rounded mt-0.5 flex-shrink-0"
                        style={{ backgroundColor: colors[status] || "#999" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground mb-0.5">
                          {status}
                        </div>
                        {statusDescriptions[status] && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {statusDescriptions[status]}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="max-w-xs">
                      <div className="font-semibold mb-1">{status}</div>
                      <div className="text-xs">{statusDescriptions[status]}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
