"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, Database, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

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
  customFromMonth: string;
  customToMonth: string;
  setTimeRange: (range: TimeRange) => void;
  setRepoFilter: (repo: RepoFilter) => void;
  setSnapshotMode: (mode: SnapshotMode) => void;
  setCustomFromMonth: (month: string) => void;
  setCustomToMonth: (month: string) => void;
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
        toast.error("No data available to export");
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

      toast.success(`${format.toUpperCase()} export started`, {
        description: fullFilename,
      });
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

function AnalyticsLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [timeRange, setTimeRangeState] = useState<TimeRange>(
    (searchParams.get("range") as TimeRange) || "all"
  );
  const [repoFilter, setRepoFilterState] = useState<RepoFilter>(
    (searchParams.get("repo") as RepoFilter) || "all"
  );
  const [snapshotMode, setSnapshotModeState] = useState<SnapshotMode>(
    (searchParams.get("snapshot") as SnapshotMode) || "live"
  );
  const [customFromMonth, setCustomFromMonthState] = useState<string>(
    searchParams.get("fromMonth") || ""
  );
  const [customToMonth, setCustomToMonthState] = useState<string>(
    searchParams.get("toMonth") || ""
  );

  const [localFromMonth, setLocalFromMonth] = useState<string>(
    searchParams.get("fromMonth") || ""
  );
  const [localToMonth, setLocalToMonth] = useState<string>(
    searchParams.get("toMonth") || ""
  );

  React.useEffect(() => {
    setLocalFromMonth(customFromMonth);
  }, [customFromMonth]);

  React.useEffect(() => {
    setLocalToMonth(customToMonth);
  }, [customToMonth]);

  const handleApplyCustomRange = useCallback(() => {
    if (!localFromMonth || !localToMonth) {
      toast.error("Please select both start and end months");
      return;
    }
    if (localFromMonth > localToMonth) {
      toast.error("Start month cannot be after end month");
      return;
    }
    
    setCustomFromMonthState(localFromMonth);
    setCustomToMonthState(localToMonth);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("fromMonth", localFromMonth);
    params.set("toMonth", localToMonth);
    router.replace(`${pathname}?${params.toString()}`);
    
    toast.success("Date range applied");
  }, [localFromMonth, localToMonth, searchParams, router, pathname]);

  const setTimeRange = useCallback((range: TimeRange) => {
    setTimeRangeState(range);
    const params = new URLSearchParams(searchParams.toString());
    if (range === "all") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const setCustomFromMonth = useCallback((month: string) => {
    setCustomFromMonthState(month);
    const params = new URLSearchParams(searchParams.toString());
    if (!month) params.delete("fromMonth");
    else params.set("fromMonth", month);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  const setCustomToMonth = useCallback((month: string) => {
    setCustomToMonthState(month);
    const params = new URLSearchParams(searchParams.toString());
    if (!month) params.delete("toMonth");
    else params.set("toMonth", month);
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
      customFromMonth,
      customToMonth,
      setTimeRange,
      setRepoFilter,
      setSnapshotMode,
      setCustomFromMonth,
      setCustomToMonth,
      exportData,
    }),
    [
      timeRange,
      repoFilter,
      snapshotMode,
      customFromMonth,
      customToMonth,
      setTimeRange,
      setRepoFilter,
      setSnapshotMode,
      setCustomFromMonth,
      setCustomToMonth,
      exportData,
    ]
  );

  const pageTitle = useMemo(() => {
    const seg = pathname?.split("/").filter(Boolean) || [];
    const last = seg[seg.length - 1];
    const titles: Record<string, string> = {
      eips: "EIP Analytics",
      prs: "PR Analytics",
      issues: "Issues Analytics",
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
    if (pageTitle === "Issues Analytics") return "Open issues tracking and activity analytics.";
    return "Data-driven insights into Ethereum standards";
  }, [pageTitle]);

  return (
    <AnalyticsContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background">
        {/* Single merged header — not sticky */}
        <div className="border-b border-border bg-card/80">
          <div className="mx-auto w-full px-3 py-5 sm:px-4 lg:px-5 xl:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Title + subtitle */}
              <div>
                <h1 className="dec-title persona-title text-balance text-2xl font-semibold tracking-tight leading-[1.1] sm:text-3xl">
                  {pageTitle}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pageSubtitle}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Time Range */}
                <div className="relative flex items-center rounded-lg border border-border bg-muted/65 px-2.5 py-1.5 shadow-sm transition-all hover:border-primary/40 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                    className="bg-transparent text-sm font-semibold text-foreground/90 pl-1.5 pr-6 outline-none cursor-pointer appearance-none"
                  >
                    {timeRangeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {timeRange === "custom" && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/65 p-1.5 shadow-sm">
                    <input
                      type="month"
                      value={localFromMonth}
                      onChange={(e) => setLocalFromMonth(e.target.value)}
                      className="h-7 rounded-md border border-border/70 bg-background/60 px-2 text-xs text-foreground outline-none focus:border-primary/45 focus:ring-1 focus:ring-primary/20"
                      aria-label="Custom range start month"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="month"
                      value={localToMonth}
                      min={localFromMonth || undefined}
                      onChange={(e) => setLocalToMonth(e.target.value)}
                      className="h-7 rounded-md border border-border/70 bg-background/60 px-2 text-xs text-foreground outline-none focus:border-primary/45 focus:ring-1 focus:ring-primary/20"
                      aria-label="Custom range end month"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Repo Filter */}
                <div className="relative flex items-center rounded-lg border border-border bg-muted/65 px-2.5 py-1.5 shadow-sm transition-all hover:border-primary/40 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
                  <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value as RepoFilter)}
                    className="bg-transparent text-sm font-semibold text-foreground/90 pl-1.5 pr-6 outline-none cursor-pointer appearance-none"
                  >
                    {repoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full px-3 py-6 sm:px-4 lg:px-5 xl:px-6">
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
        <div className="min-h-screen bg-background">
          <InlineBrandLoader size="md" label="Loading analytics..." />
        </div>
      }
    >
      <AnalyticsLayoutInner>{children}</AnalyticsLayoutInner>
    </Suspense>
  );
}
