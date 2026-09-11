"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { useAnalytics, useAnalyticsExport } from "../analytics-layout-client";
import { client } from "@/lib/orpc";
import {
  Loader2,
  Github,
  ArrowUpRight,
  AlertCircle,
  Download,
  Activity,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "@/components/header";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

interface IssueMonthlyPoint {
  month: string;
  created: number;
  closed: number;
  openAtMonthEnd: number;
}

interface IssueMonthlySummary {
  month: string;
  openIssues: number;
  newIssues: number;
  closedIssues: number;
}

interface OpenIssueState {
  totalOpen: number;
  medianAge: number;
  oldestIssue: {
    issueNumber: number;
    title: string | null;
    author: string | null;
    ageDays: number;
  } | null;
}

interface LabelStat {
  label: string;
  count: number;
}

interface OpenIssueRow {
  issueNumber: number;
  repo: string;
  title: string | null;
  author: string | null;
  createdAt: string;
  state: string;
  updatedAt: string | null;
  linkedEIPs: string | null;
  labels: string[];
  numComments: number;
}

function Section({ title, icon, children, action, className, id }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
          {id && (
            <CopyLinkButton sectionId={id} className="h-7 w-7 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function IssuesAnalyticsPage() {
  const { timeRange, repoFilter } = useAnalytics();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());

  const [monthlySeries, setMonthlySeries] = useState<IssueMonthlyPoint[]>([]);
  const [heroMonth, setHeroMonth] = useState<IssueMonthlySummary | null>(null);
  const [openSummary, setOpenSummary] = useState<OpenIssueState | null>(null);
  const [labelStats, setLabelStats] = useState<LabelStat[]>([]);
  const [openIssues, setOpenIssues] = useState<OpenIssueRow[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const repoParam = repoFilter === "all" ? undefined : repoFilter;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const contextMonth = selectedMonth ?? currentMonth;
        const [heroYearStr, heroMonthStr] = contextMonth.split("-");
        const heroYear = Number(heroYearStr);
        const heroMonthNum = Number(heroMonthStr);

        const [monthly, summary, labels, issues, openState] = await Promise.all([
          client.analytics.getIssueMonthlyActivity({ repo: repoParam }),
          client.analytics.getIssueMonthlySummary({
            year: Number.isFinite(heroYear) ? heroYear : now.getFullYear(),
            month: Number.isFinite(heroMonthNum) ? heroMonthNum : now.getMonth() + 1,
            repo: repoParam,
          }),
          client.analytics.getIssueLabels({ repo: repoParam }),
          client.analytics.getIssueOpenExport({ repo: repoParam, month: contextMonth }),
          client.analytics.getIssueOpenState({ repo: repoParam }),
        ]);

        setMonthlySeries(monthly);
        setHeroMonth(summary);
        setLabelStats(labels.slice(0, 20));
        setOpenIssues(issues);
        setOpenSummary(openState);
        setDataUpdatedAt(new Date());
      } catch (err) {
        console.error("Failed to fetch issue analytics:", err);
        setError("Failed to load issue analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repoFilter, repoParam, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth && monthlySeries.length > 0) {
      setSelectedMonth(monthlySeries[monthlySeries.length - 1].month);
    }
  }, [monthlySeries, selectedMonth]);

  const monthlyOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: {
        top: 0,
        textStyle: { color: "var(--muted-foreground)", fontSize: 11 },
      },
      grid: { top: 36, left: 38, right: 22, bottom: 50 },
      xAxis: {
        type: "category",
        data: monthlySeries.map((m) => m.month),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--muted-foreground)", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)", type: "dashed" } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, start: 0, end: 100 },
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 6,
          height: 18,
          borderColor: "rgba(148,163,184,0.22)",
          backgroundColor: "rgba(148,163,184,0.08)",
          fillerColor: "rgba(34,211,238,0.22)",
          handleSize: 10,
          showDetail: false,
          start: 0,
          end: 100,
        },
      ],
      series: [
        { name: "Created", type: "bar", data: monthlySeries.map((m) => m.created), itemStyle: { color: "#60A5FA", borderRadius: [6, 6, 0, 0] } },
        { name: "Closed", type: "bar", data: monthlySeries.map((m) => m.closed), itemStyle: { color: "#F59E0B", borderRadius: [6, 6, 0, 0] } },
        { name: "Open EOM", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: monthlySeries.map((m) => m.openAtMonthEnd), lineStyle: { width: 2.5, color: "#A78BFA" }, itemStyle: { color: "#A78BFA" } },
      ],
    };
  }, [monthlySeries]);

  const monthContext = selectedMonth || heroMonth?.month || "Latest";
  const nextUpdateAt = useMemo(() => new Date(dataUpdatedAt.getTime() + 24 * 60 * 60 * 1000), [dataUpdatedAt]);
  const totalOpen = openSummary?.totalOpen ?? 0;

  const downloadObjectRowsCsv = useCallback(
    (rows: Array<Record<string, unknown>>, filename: string) => {
      if (!rows.length) return;
      const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      const escapeCsv = (value: unknown) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`;
      const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const downloadOpenIssuesDetailedCSV = useCallback(() => {
    const generatedAt = new Date().toISOString();
    const rows: Array<Record<string, string | number | null>> = openIssues.map((issue) => ({
      issue_number: issue.issueNumber,
      repo: issue.repo,
      title: issue.title,
      author: issue.author,
      state: issue.state,
      labels: issue.labels.join("; "),
      linked_eips: issue.linkedEIPs,
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      num_comments: issue.numComments,
      month_context: monthContext,
      repo_filter: repoFilter,
      generated_at: generatedAt,
    }));
    downloadObjectRowsCsv(
      rows,
      `eip-open-issues-detailed-${repoFilter}-${monthContext}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [downloadObjectRowsCsv, monthContext, openIssues, repoFilter]);

  useAnalyticsExport(() => {
    const combined: Record<string, unknown>[] = [];
    monthlySeries.forEach((item) => combined.push({ type: "monthly", ...item }));
    labelStats.forEach((item) => combined.push({ type: "labels", ...item }));
    openIssues.forEach((issue) => combined.push({ type: "open_issue", ...issue }));
    return combined;
  }, `analytics-issues-${repoFilter}`);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <InlineBrandLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Open Issues", value: totalOpen, sub: `Median age: ${openSummary?.medianAge != null ? `${openSummary.medianAge}d` : "–"}`, icon: <Github className="h-5 w-5" /> },
          { label: `Created (${heroMonth?.month ?? ""})`, value: heroMonth?.newIssues ?? 0, sub: "Current month", icon: <Activity className="h-5 w-5" /> },
          { label: "Closed", value: heroMonth?.closedIssues ?? 0, sub: "Current month", icon: <AlertCircle className="h-5 w-5" /> },
          { label: "Active", value: heroMonth?.openIssues ?? 0, sub: "In current month", icon: <Loader2 className="h-5 w-5" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{kpi.value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <Section
        id="issue-trend"
        title="Open Issue trend by month"
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">Context: {monthContext}</span>
            <LastUpdated timestamp={dataUpdatedAt} />
          </div>
        }
      >
        {monthlySeries.length > 0 ? (
          <div className="h-[380px] w-full">
            <ReactECharts
              option={monthlyOption}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No monthly data available.</p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Created</strong> and <strong className="text-foreground">Closed</strong> count issues
          by what happened to them within each month. <strong className="text-foreground">Open EOM</strong> ={" "}
          <em>Open at End of Month</em>: issues still open on the last day of that month (the running backlog).
        </p>
      </Section>

      <Section id="issue-labels" title="Label distribution" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="space-y-2">
          {labelStats.length > 0 ? (
            labelStats.map((label) => {
              const maxCount = Math.max(...labelStats.map((l) => l.count));
              const percentage = (label.count / maxCount) * 100;
              return (
                <div key={label.label} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-medium text-foreground">{label.label}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs text-muted-foreground">{label.count}</span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">No labels found.</p>
          )}
        </div>
      </Section>

      <Section
        id="open-issues-section"
        title="Open Issues"
        icon={<Github className="h-4 w-4" />}
        action={
          <button
            onClick={downloadOpenIssuesDetailedCSV}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">Snapshot of currently open issues in selected repository scope.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repo</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Author</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comments</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {openIssues.map((issue) => {
                const [org, repoName] = issue.repo.split("/");
                const url = `https://github.com/${org}/${repoName}/issues/${issue.issueNumber}`;
                const repoShort = repoName.toLowerCase();
                return (
                  <tr key={`${issue.repo}-${issue.issueNumber}`} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <td className="py-2 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/issue/${repoShort}/${issue.issueNumber}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                          #{issue.issueNumber}
                        </Link>
                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Open on GitHub">
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="max-w-xs truncate py-2 pr-4 text-foreground/90">{issue.title || <span className="text-muted-foreground">No title</span>}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{repoName}</td>
                    <td className="py-2 pr-4 text-foreground/80">{issue.author || <span className="text-muted-foreground">Unknown</span>}</td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">{issue.numComments}</td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">{issue.createdAt}</td>
                  </tr>
                );
              })}
              {openIssues.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No open issues found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openSummary?.oldestIssue && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Oldest issue:</strong> #{openSummary.oldestIssue.issueNumber} by {openSummary.oldestIssue.author} ({openSummary.oldestIssue.ageDays}d old) —{" "}
              {openSummary.oldestIssue.title}
            </span>
          </div>
        )}
      </Section>
    </div>
  );
}
