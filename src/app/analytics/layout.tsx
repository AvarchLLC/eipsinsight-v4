"use client";

import React, { createContext, useContext, useState, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Calendar, Database } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "30d" | "90d" | "1y" | "all" | "custom";
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

const timeRangeOptions: { value: TimeRange; label: string }[] = [
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
    (searchParams.get("range") as TimeRange) || "30d"
  );
  const [repoFilter, setRepoFilterState] = useState<RepoFilter>(
    (searchParams.get("repo") as RepoFilter) || "all"
  );
  const [snapshotMode, setSnapshotModeState] = useState<SnapshotMode>(
    (searchParams.get("snapshot") as SnapshotMode) || "live"
  );

  const setTimeRange = (range: TimeRange) => {
    setTimeRangeState(range);
    const params = new URLSearchParams(searchParams.toString());
    if (range === "30d") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setRepoFilter = (repo: RepoFilter) => {
    setRepoFilterState(repo);
    const params = new URLSearchParams(searchParams.toString());
    if (repo === "all") {
      params.delete("repo");
    } else {
      params.set("repo", repo);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setSnapshotMode = (mode: SnapshotMode) => {
    setSnapshotModeState(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "live") {
      params.delete("snapshot");
    } else {
      params.set("snapshot", mode);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const exportData = (format: "csv" | "json") => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}`, { timeRange, repoFilter, snapshotMode });
  };

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
    [timeRange, repoFilter, snapshotMode]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Global Controls Header */}
        <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Data-driven insights into Ethereum standards
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Time Range */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="bg-transparent text-sm text-slate-300 border-none outline-none cursor-pointer"
                  >
                    {timeRangeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Repo Filter */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-1">
                  <Database className="h-4 w-4 text-slate-400" />
                  <select
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value as RepoFilter)}
                    className="bg-transparent text-sm text-slate-300 border-none outline-none cursor-pointer"
                  >
                    {repoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Snapshot Toggle */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-1">
                  <button
                    onClick={() =>
                      setSnapshotMode(snapshotMode === "live" ? "snapshot" : "live")
                    }
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      snapshotMode === "live"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-slate-700/50 text-slate-400 hover:text-slate-300"
                    )}
                  >
                    {snapshotMode === "live" ? "Live" : "Snapshot"}
                  </button>
                </div>

                {/* Export */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/30 p-1">
                  <button
                    onClick={() => exportData("csv")}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                  <div className="h-4 w-px bg-slate-700" />
                  <button
                    onClick={() => exportData("json")}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
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
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading analytics…
        </div>
      }
    >
      <AnalyticsLayoutInner>{children}</AnalyticsLayoutInner>
    </Suspense>
  );
}
