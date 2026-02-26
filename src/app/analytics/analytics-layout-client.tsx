"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Calendar, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Export Helper Functions ─────────────────────────────────────

/**
 * Convert array of objects to CSV string
 */
function jsonToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => `"${h}"`).join(",");

  // Create data rows
  const dataRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type TimeRange = "7d" | "30d" | "90d" | "1y" | "this_month" | "all" | "custom";
type RepoFilter = "all" | "eips" | "ercs" | "rips";
type SnapshotMode = "live" | "snapshot";

interface AnalyticsContextValue {
  timeRange: TimeRange;
  repoFilter: RepoFilter;
  snapshotMode: SnapshotMode;
  setTimeRange: (range: TimeRange) => void;
  setRepoFilter: (repo: RepoFilter) => void;
  setSnapshotMode: (mode: SnapshotMode) => void;
  exportData: (format: "csv" | "json") => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within AnalyticsLayout");
  }
  return context;
}

/**
 * Hook for child pages to handle export events
 * @param data - Function that returns the data to export
 * @param filename - Base filename (without extension)
 */
export function useAnalyticsExport(
  data: () => Record<string, unknown>[],
  filename: string
) {
  React.useEffect(() => {
    const handleExport = (event: Event) => {
      const customEvent = event as CustomEvent<{
        format: "csv" | "json";
        timeRange: string;
        repoFilter: string;
        snapshotMode: string;
      }>;
      
      const { format } = customEvent.detail;
      const exportData = data();

      if (exportData.length === 0) {
        console.warn("No data to export");
        alert("No data available to export");
        return;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}-${timestamp}.${format}`;

      if (format === "csv") {
        const csv = jsonToCSV(exportData);
        downloadFile(csv, fullFilename, "text/csv");
      } else {
        const json = JSON.stringify(exportData, null, 2);
        downloadFile(json, fullFilename, "application/json");
      }
    };

    window.addEventListener("analytics-export", handleExport);
    return () => window.removeEventListener("analytics-export", handleExport);
  }, [data, filename]);
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const repoOptions: { value: RepoFilter; label: string }[] = [
  { value: "all", label: "All Repositories" },
  { value: "eips", label: "EIPs" },
  { value: "ercs", label: "ERCs" },
  { value: "rips", label: "RIPs" },
];

const navItems = [
  { href: "/analytics/eips", label: "EIPs" },
  { href: "/analytics/prs", label: "PRs" },
  { href: "/analytics/editors", label: "Editors" },
  { href: "/analytics/reviewers", label: "Reviewers" },
  { href: "/analytics/authors", label: "Authors" },
  { href: "/analytics/contributors", label: "Contributors" },
];

function AnalyticsLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [timeRange, setTimeRangeState] = useState<TimeRange>(
    (searchParams.get("range") as TimeRange) || "this_month"
  );
  const [repoFilter, setRepoFilterState] = useState<RepoFilter>(
    (searchParams.get("repo") as RepoFilter) || "all"
  );
  const [snapshotMode, setSnapshotModeState] = useState<SnapshotMode>(
    (searchParams.get("snapshot") as SnapshotMode) || "live"
  );

  const setTimeRange = useCallback((range: TimeRange) => {
    setTimeRangeState(range);
    const params = new URLSearchParams(searchParams.toString());
    if (range === "this_month") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const setRepoFilter = useCallback((repo: RepoFilter) => {
    setRepoFilterState(repo);
    const params = new URLSearchParams(searchParams.toString());
    if (repo === "all") {
      params.delete("repo");
    } else {
      params.set("repo", repo);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const setSnapshotMode = useCallback((mode: SnapshotMode) => {
    setSnapshotModeState(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "live") {
      params.delete("snapshot");
    } else {
      params.set("snapshot", mode);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const exportData = useCallback((format: "csv" | "json") => {
    // Dispatch custom event that child pages can listen to
    const event = new CustomEvent('analytics-export', {
      detail: { format, timeRange, repoFilter, snapshotMode }
    });
    window.dispatchEvent(event);

    // Also log for debugging
    console.log(`Export triggered: ${format}`, { timeRange, repoFilter, snapshotMode });
  }, [timeRange, repoFilter, snapshotMode]);

  const contextValue = useMemo(
    () => ({
      timeRange,
      repoFilter,
      snapshotMode,
      setTimeRange,
      setRepoFilter,
      setSnapshotMode,
      exportData,
    }),
    [timeRange, repoFilter, snapshotMode, setTimeRange, setRepoFilter, setSnapshotMode, exportData]
  );

  const pageTitle = useMemo(() => {
    const seg = pathname?.split("/").filter(Boolean) || [];
    const last = seg[seg.length - 1];
    const titles: Record<string, string> = {
      eips: "EIP Analytics",
      prs: "PR Analytics",
      editors: "Editors",
      reviewers: "Reviewers",
      authors: "Authors",
      contributors: "Contributors",
    };
    return titles[last] || "Analytics";
  }, [pathname]);

  const pageSubtitle = useMemo(() => {
    if (pageTitle === "EIP Analytics")
      return "A high-level overview of Ethereum Standards by type, status, and lifecycle progress.";
    if (pageTitle === "PR Analytics") return "Pull request activity and merge trends.";
    return "Data-driven insights into Ethereum standards";
  }, [pageTitle]);

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Single merged header — not sticky */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Title + subtitle */}
              <div>
                <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {pageSubtitle}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Time Range */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-1.5">
                  <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="bg-transparent text-sm text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                  >
                    {timeRangeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Repo Filter */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-1.5">
                  <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <select
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value as RepoFilter)}
                    className="bg-transparent text-sm text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                  >
                    {repoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Snapshot Toggle */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-1.5">
                  <button
                    onClick={() =>
                      setSnapshotMode(snapshotMode === "live" ? "snapshot" : "live")
                    }
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      snapshotMode === "live"
                        ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
                        : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    {snapshotMode === "live" ? "Live" : "Snapshot"}
                  </button>
                </div>

                {/* Export */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-1.5">
                  <button
                    onClick={() => exportData("csv")}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                  <button
                    onClick={() => exportData("json")}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </AnalyticsContext.Provider>
  );
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
          Loading analytics…
        </div>
      }
    >
      <AnalyticsLayoutInner>{children}</AnalyticsLayoutInner>
    </Suspense>
  );
}
