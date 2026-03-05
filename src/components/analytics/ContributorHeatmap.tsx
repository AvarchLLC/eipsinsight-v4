"use client";

import React, { useMemo } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface HeatmapData {
  date: string;
  count: number;
}

interface ContributorHeatmapProps {
  data: HeatmapData[];
}

/**
 * Calculates the color intensity level based on contribution count
 * Returns a CSS class for Tailwind styling
 */
function getIntensityClass(count: number): string {
  if (count === 0) return "bg-slate-100/40 dark:bg-slate-900/40";
  if (count <= 2) return "bg-cyan-300/40 dark:bg-cyan-900/40";
  if (count <= 5) return "bg-cyan-400/60 dark:bg-cyan-800/60";
  if (count <= 10) return "bg-cyan-500/80 dark:bg-cyan-700/80";
  return "bg-cyan-600/100 dark:bg-cyan-600/100";
}

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Creates a map of dates to contribution counts for O(1) lookup
 */
function createDateMap(data: HeatmapData[]): Map<string, number> {
  const map = new Map<string, number>();
  data.forEach((item) => {
    map.set(item.date, item.count);
  });
  return map;
}

/**
 * Gets the week number for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Groups dates by week for efficient grid rendering
 */
function groupDatesByWeek(
  data: HeatmapData[]
): Array<{ weekStart: Date; days: Array<{ date: string; count: number }> }> {
  if (data.length === 0) return [];

  // Sort data by date
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));

  // Create date map for O(1) lookup
  const dateMap = createDateMap(sortedData);

  // Get date range
  const startDate = new Date(sortedData[0].date + "T00:00:00Z");
  const endDate = new Date(sortedData[sortedData.length - 1].date + "T00:00:00Z");

  // Get the first Monday on or before the start date
  const firstMonday = getWeekStart(startDate);

  // Generate all weeks and fill in the data
  const weeks: Array<{
    weekStart: Date;
    days: Array<{ date: string; count: number }>;
  }> = [];
  let currentWeek = new Date(firstMonday);

  while (currentWeek <= endDate) {
    const weekDays: Array<{ date: string; count: number }> = [];

    // For each day of the week (Monday-Sunday)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(currentWeek);
      day.setDate(day.getDate() + dayOffset);

      const dateStr = day.toISOString().split("T")[0];
      const count = dateMap.get(dateStr) ?? 0;

      weekDays.push({ date: dateStr, count });
    }

    weeks.push({ weekStart: new Date(currentWeek), days: weekDays });

    // Move to next week
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  return weeks;
}

/**
 * ContributorHeatmap Component
 * Displays a GitHub-style calendar heatmap showing daily contribution activity
 */
export function ContributorHeatmap({ data }: ContributorHeatmapProps) {
  // Pre-group weeks to avoid re-grouping on every render
  const weeks = useMemo(() => groupDatesByWeek(data), [data]);

  if (weeks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No activity data available
        </p>
      </div>
    );
  }

  // Get day labels for reference
  const dayLabels = ["M", "W", "F", "S"];
  const dayLabelIndices = [0, 2, 4, 6]; // Monday, Wednesday, Friday, Sunday

  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1">
            {/* Empty space for header alignment */}
            <div className="h-6" />

            {/* Day labels */}
            {dayLabels.map((label, i) => (
              <div
                key={`label-${i}`}
                className="h-3 w-6 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-semibold"
              >
                {dayLabels[dayLabelIndices.indexOf(dayLabelIndices[i])]}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={`week-${weekIdx}`} className="flex flex-col gap-1">
              {/* Week number / month label - shown on first week column */}
              {weekIdx === 0 || 
              (weekIdx > 0 &&
                weeks[weekIdx].weekStart.getMonth() !==
                  weeks[weekIdx - 1].weekStart.getMonth()) ? (
                <div className="h-6 flex items-center px-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    {week.weekStart.toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </span>
                </div>
              ) : (
                <div className="h-6" />
              )}

              {/* Days in week */}
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const dayData = week.days[dayIdx];
                if (!dayData) return null;

                const intensityClass = getIntensityClass(dayData.count);
                const formattedDate = formatDate(dayData.date);

                return (
                  <Tooltip key={`${week.weekStart.toISOString()}-${dayIdx}`}>
                    <TooltipTrigger asChild>
                      <button
                        className={`h-3 w-3 rounded border border-slate-200 dark:border-slate-700 transition-opacity hover:opacity-80 ${intensityClass}`}
                        aria-label={`${formattedDate}: ${dayData.count} contributions`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <div className="whitespace-nowrap">
                        {formattedDate} —{" "}
                        <span className="font-semibold">
                          {dayData.count}{" "}
                          {dayData.count === 1 ? "contribution" : "contributions"}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Contribution activity:
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Less
          </span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded border border-slate-200 bg-slate-100/40 dark:border-slate-700 dark:bg-slate-900/40" />
            <div className="h-3 w-3 rounded border border-slate-200 bg-cyan-300/40 dark:border-slate-700 dark:bg-cyan-900/40" />
            <div className="h-3 w-3 rounded border border-slate-200 bg-cyan-400/60 dark:border-slate-700 dark:bg-cyan-800/60" />
            <div className="h-3 w-3 rounded border border-slate-200 bg-cyan-500/80 dark:border-slate-700 dark:bg-cyan-700/80" />
            <div className="h-3 w-3 rounded border border-slate-200 bg-cyan-600 dark:border-slate-700 dark:bg-cyan-600" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">More</span>
        </div>
      </div>
    </div>
  );
}
