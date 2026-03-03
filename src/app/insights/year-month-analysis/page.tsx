"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { client } from "@/lib/orpc";
import { PageHeader, SectionSeparator } from "@/components/header";
import {
  ArrowLeft,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#64748b",
  Review: "#f59e0b",
  "Last Call": "#f97316",
  Final: "#10b981",
  Living: "#22d3ee",
  Stagnant: "#6b7280",
  Withdrawn: "#ef4444",
};

const CHANGE_LABELS: Record<string, string> = {
  "status-change": "Status",
  "content-change": "Content",
  "metadata-change": "Metadata",
};
const STATUS_ORDER = ["Draft", "Review", "Last Call", "Living", "Final", "Stagnant", "Withdrawn"] as const;

function csvEscape(v: string | number | null | undefined) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

function monthLabel(yyyyMm: string) {
  const d = new Date(`${yyyyMm}-01T00:00:00.000Z`);
  return Number.isNaN(d.getTime())
    ? yyyyMm
    : d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function DrilldownPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const repo = (searchParams.get("repo") || "all") as "all" | "eips" | "ercs" | "rips";
  const month = searchParams.get("month") || defaultMonth;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = 8;

  const [loading, setLoading] = useState(true);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof client.insights.getMonthlyDrilldown>> | null>(null);
  const [editors, setEditors] = useState<Array<{ editor: string; reviews: number; prsTouched: number; comments: number }>>([]);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [tableStatusFilter, setTableStatusFilter] = useState<string | null>(null);
  const [tableRepoFilter, setTableRepoFilter] = useState<"eips" | "ercs" | "rips" | null>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.insights.getAvailableMonths().then(setAvailableMonths).catch(console.error);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [drilldown, editorRows] = await Promise.all([
          client.insights.getMonthlyDrilldown({
            repo: tableRepoFilter ?? repo,
            month,
            status: tableStatusFilter ? [tableStatusFilter] : [],
            change: [],
            type: [],
            q: "",
            sort: "impact_desc",
            page,
            pageSize,
          }),
          client.insights.getEditorsLeaderboard({
            month,
            repo: repo === "all" ? undefined : repo,
          }),
        ]);

        setData(drilldown);
        setEditors(editorRows);
      } catch (err) {
        console.error("Monthly insight load failed", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [repo, month, page, pageSize, tableStatusFilter, tableRepoFilter]);

  useEffect(() => {
    setTableStatusFilter(null);
    setTableRepoFilter(null);
    setColumnSearch({});
  }, [repo, month]);

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    });
    if (!updates.page) next.set("page", "1");
    router.replace(`/insights/year-month-analysis?${next.toString()}`);
  };

  const summary = data?.summary;
  const rows = useMemo(() => data?.rows || [], [data?.rows]);
  const meta = data?.meta;
  const filteredRows = useMemo(() => {
    const active = Object.entries(columnSearch).filter(([, v]) => v.trim().length > 0);
    if (!active.length) return rows;
    return rows.filter((r) =>
      active.every(([k, v]) => {
        const q = v.trim().toLowerCase();
        switch (k) {
          case "proposal":
            return `${r.proposalKind}-${r.number} ${r.title || ""} ${r.repo}`.toLowerCase().includes(q);
          case "currentStatus":
            return (r.currentStatus || "").toLowerCase().includes(q);
          case "statusChange":
            return `${r.statusTransition?.from || ""} ${r.statusTransition?.to || ""} ${r.statusTransition?.changedAt || ""}`.toLowerCase().includes(q);
          case "changeEvidence":
            return `${r.changeSummary || ""} ${r.changedTypes.join(" ")}`.toLowerCase().includes(q);
          case "prLinkage":
            return `${r.primaryPrNumber || ""} ${r.allPrNumbers.join(" ")}`.toLowerCase().includes(q);
          case "author":
            return (r.author || "").toLowerCase().includes(q);
          case "metrics":
            return `${r.linkedPrCount} ${r.commits} ${r.filesChanged} ${r.discussionVolume}`.toLowerCase().includes(q);
          case "upgrade":
            return (r.upgradeTags || []).join(" ").toLowerCase().includes(q);
          default:
            return true;
        }
      })
    );
  }, [rows, columnSearch]);

  const statusRepoMatrix = useMemo(() => {
    const initRow = () => ({ eips: 0, ercs: 0, rips: 0 });
    const matrix: Record<string, { eips: number; ercs: number; rips: number }> = {};
    STATUS_ORDER.forEach((s) => { matrix[s] = initRow(); });

    for (const row of rows) {
      const status = row.currentStatus || "Unknown";
      if (!matrix[status]) matrix[status] = initRow();
      if (row.repo === "eips" || row.repo === "ercs" || row.repo === "rips") matrix[status][row.repo] += 1;
    }

    return matrix;
  }, [rows]);

  const changeBreakdownOption = useMemo(() => {
    const total = (summary?.statusChanges || 0) + (summary?.contentChanges || 0) + (summary?.metadataChanges || 0);
    const chartData = [
      { name: "Status Changes", value: summary?.statusChanges || 0, itemStyle: { color: "#f59e0b" } },
      { name: "Content Changes", value: summary?.contentChanges || 0, itemStyle: { color: "#22d3ee" } },
      { name: "Metadata Changes", value: summary?.metadataChanges || 0, itemStyle: { color: "#a78bfa" } },
    ].filter((d) => d.value > 0);

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15,23,42,0.96)",
        borderColor: "rgba(148,163,184,0.28)",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/><b>${params.value}</b> (${params.percent}%)`,
      },
      legend: {
        bottom: 0,
        left: "center",
        itemWidth: 14,
        itemHeight: 9,
        textStyle: { color: "#94a3b8", fontSize: 11 },
      },
      graphic: [
        {
          type: "text",
          left: "center",
          top: "39%",
          style: {
            text: String(total),
            fill: "#e5e7eb",
            fontSize: 24,
            fontWeight: 700,
            textAlign: "center",
          },
        },
        {
          type: "text",
          left: "center",
          top: "48%",
          style: {
            text: "changes",
            fill: "#94a3b8",
            fontSize: 11,
            textAlign: "center",
          },
        },
      ],
      series: [
        {
          type: "pie",
          radius: ["58%", "82%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          label: { show: false },
          data: chartData,
        },
      ],
    };
  }, [summary]);

  const editorBarOption = useMemo(() => {
    const top = [...editors].slice(0, 10).reverse();
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 120, right: 18, top: 10, bottom: 24 },
      xAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", fontSize: 11 },
        splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: top.map((e) => e.editor),
        axisLabel: { color: "#94a3b8", fontSize: 11 },
        axisLine: { lineStyle: { color: "#334155" } },
      },
      series: [
        {
          name: "Reviews",
          type: "bar",
          data: top.map((e) => e.reviews),
          barWidth: 14,
          itemStyle: { color: "#0ea5e9", borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: "right", color: "#cbd5e1", fontSize: 10 },
        },
      ],
    };
  }, [editors]);

  const exportCsv = async () => {
    try {
      const full = await client.insights.getMonthlyDrilldown({
        repo,
        month,
        status: [],
        change: [],
        type: [],
        q: "",
        sort: "impact_desc",
        page: 1,
        pageSize: 2000,
      });

      const header = [
        "proposal_id",
        "title",
        "repo",
        "current_status",
        "changed_types",
        "status_from",
        "status_to",
        "status_change_date",
        "primary_pr_number",
        "primary_pr_url",
        "all_pr_numbers",
        "month",
      ].join(",");

      const csvRows = full.rows.map((r) => [
        `${r.proposalKind}-${r.number}`,
        r.title || "",
        r.repo,
        r.currentStatus || "",
        r.changedTypes.map((ct) => CHANGE_LABELS[ct] || ct).join("|"),
        r.statusTransition?.from || "",
        r.statusTransition?.to || "",
        r.statusTransition?.changedAt || "",
        r.primaryPrNumber || "",
        r.primaryPrUrl || "",
        r.allPrNumbers.join("|"),
        month,
      ].map(csvEscape).join(","));

      const csv = [header, ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monthly-insight-${repo}-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
    }
  };

  const exportBreakdownCsv = () => {
    const lines: string[] = [];
    lines.push("section,metric,value");
    lines.push(["change_breakdown", "Status Changes", summary?.statusChanges || 0].map(csvEscape).join(","));
    lines.push(["change_breakdown", "Content Changes", summary?.contentChanges || 0].map(csvEscape).join(","));
    lines.push(["change_breakdown", "Metadata Changes", summary?.metadataChanges || 0].map(csvEscape).join(","));
    lines.push("");
    lines.push("status,eip,erc,rip,total");
    STATUS_ORDER.forEach((status) => {
      const e = statusRepoMatrix[status]?.eips || 0;
      const c = statusRepoMatrix[status]?.ercs || 0;
      const r = statusRepoMatrix[status]?.rips || 0;
      lines.push([status, e, c, r, e + c + r].map(csvEscape).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-change-breakdown-${repo}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEditorsDetailedCsv = async () => {
    try {
      const result = await client.insights.getEditorsLeaderboardDetailedExport({
        month,
        repo: repo === "all" ? undefined : repo,
      });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Editors detailed CSV export failed", err);
    }
  };

  const applySummaryFilter = (status: string, targetRepo: "eips" | "ercs" | "rips") => {
    setTableStatusFilter(status);
    setTableRepoFilter(targetRepo);
    setParams({ page: "1" });
    setTimeout(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const clearTableFilters = () => {
    setTableStatusFilter(null);
    setTableRepoFilter(null);
    setColumnSearch({});
    setParams({ page: "1" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full pb-10">
        <PageHeader
          eyebrow="Insights"
          indicator={{ icon: "chart", label: "Monthly", pulse: (summary?.totalChanged || 0) > 50 }}
          title={`Monthly Insight - ${monthLabel(month)}`}
          description={`Monthly governance movement for ${monthLabel(month)} across EIPs, ERCs, and RIPs, with clear status distribution and change signals.`}
          sectionId="monthly-insight"
        />
        <SectionSeparator className="pb-2" />

        <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
          <Link href="/insights" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Insights
          </Link>

          <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5 text-xs">
                {(["all", "eips", "ercs", "rips"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setParams({ repo: r === "all" ? null : r })}
                    className={`rounded-md px-2.5 py-1 ${repo === r ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {r === "all" ? "All" : r.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => setParams({ month: e.target.value })}
                  className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                >
                  {availableMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  {!availableMonths.includes(month) && <option value={month}>{monthLabel(month)}</option>}
                </select>
                <button
                  onClick={exportCsv}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted px-2 text-xs text-foreground hover:bg-muted/70"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid items-stretch gap-3 xl:grid-cols-12">
                <div className="xl:col-span-5 rounded-xl border border-border bg-card p-4">
                  <div className="mx-auto flex h-full w-full max-w-[860px] flex-col justify-center">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Summary</h3>
                      <button
                        onClick={exportCsv}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/35 bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Report
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/30">
                      <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/70">
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">EIP</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">ERC</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">RIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STATUS_ORDER.map((status) => (
                          <tr key={status} className="border-b border-border/50 last:border-b-0">
                            <td className="px-3 py-2.5 text-sm text-foreground">{status}</td>
                            <td className="px-3 py-2.5 text-center text-sm tabular-nums text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => applySummaryFilter(status, "eips")}
                                className="rounded px-1 hover:bg-muted hover:text-foreground"
                              >
                                {statusRepoMatrix[status]?.eips || 0}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-center text-sm tabular-nums text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => applySummaryFilter(status, "ercs")}
                                className="rounded px-1 hover:bg-muted hover:text-foreground"
                              >
                                {statusRepoMatrix[status]?.ercs || 0}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-center text-sm tabular-nums text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => applySummaryFilter(status, "rips")}
                                className="rounded px-1 hover:bg-muted hover:text-foreground"
                              >
                                {statusRepoMatrix[status]?.rips || 0}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-7 grid gap-4 lg:grid-cols-1">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Change Breakdown</h3>
                      <button
                        onClick={exportBreakdownCsv}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted px-2 text-[11px] text-foreground hover:bg-muted/70"
                      >
                        <Download className="h-3 w-3" /> CSV
                      </button>
                    </div>
                    <div className="h-[280px] min-h-[280px]">
                      <ReactECharts option={changeBreakdownOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Editors Leaderboard — {monthLabel(month)}</h3>
                  <button
                    onClick={exportEditorsDetailedCsv}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted px-2 text-[11px] text-foreground hover:bg-muted/70"
                  >
                    <Download className="h-3 w-3" /> Detailed CSV
                  </button>
                </div>
                {editors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No editor activity for this month.</p>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
                    <div className="h-[280px] rounded-lg border border-border bg-background/50 p-2">
                      <ReactECharts option={editorBarOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                    </div>
                    <div className="h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/70 scrollbar-track-transparent">
                      <div className="space-y-2">
                        {editors.slice(0, 8).map((ed, idx) => (
                          <div key={ed.editor} className="flex items-center gap-2.5 rounded-lg border border-border bg-background/60 px-2.5 py-2">
                            <span className="w-5 text-right text-xs font-semibold text-muted-foreground">{idx + 1}</span>
                            <img
                              src={`https://github.com/${ed.editor}.png`}
                              alt={ed.editor}
                              onError={(ev) => {
                                (ev.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ed.editor)}&background=0f172a&color=f8fafc&size=48`;
                              }}
                              className="h-8 w-8 rounded-full border border-border object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{ed.editor}</p>
                              <p className="text-[11px] text-muted-foreground">{ed.reviews} reviews · {ed.prsTouched} PRs · {ed.comments} comments</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={tableSectionRef} className="overflow-hidden rounded-xl border border-border bg-card">
                {(tableStatusFilter || tableRepoFilter || Object.values(columnSearch).some((v) => v.trim())) && (
                  <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Table filters:</span>
                    {tableStatusFilter && <span className="rounded border border-border bg-muted px-2 py-0.5 text-foreground">status: {tableStatusFilter}</span>}
                    {tableRepoFilter && <span className="rounded border border-border bg-muted px-2 py-0.5 text-foreground">repo: {tableRepoFilter.toUpperCase()}</span>}
                    <button onClick={clearTableFilters} className="ml-auto rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground hover:bg-muted/70">
                      Clear
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          ["proposal", "Proposal"],
                          ["currentStatus", "Current Status"],
                          ["statusChange", "Status Change"],
                          ["changeEvidence", "Change Evidence"],
                          ["prLinkage", "PR Linkage"],
                          ["author", "Author"],
                          ["metrics", "Metrics"],
                          ["upgrade", "Upgrade"],
                        ].map(([key, label]) => (
                          <th key={key} className="px-3 py-2 text-left">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                            <input
                              type="text"
                              value={columnSearch[key] || ""}
                              onChange={(e) => setColumnSearch((p) => ({ ...p, [key]: e.target.value }))}
                              placeholder="Search..."
                              className="mt-1 h-7 w-full rounded-md border border-border bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground/70"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                            No changed proposals found for {monthLabel(month)}.
                          </td>
                        </tr>
                      ) : filteredRows.map((r) => (
                        <tr key={`${r.repo}-${r.number}`} className="border-b border-border/60 hover:bg-muted/20">
                          <td className="px-3 py-2 align-top">
                            <Link href={r.proposalUrl} className="font-mono text-xs font-semibold text-primary hover:underline">
                              {r.proposalKind}-{r.number}
                            </Link>
                            <p className="max-w-[320px] truncate text-sm text-foreground">{r.title || "Untitled"}</p>
                            <p className="text-[10px] text-muted-foreground">{r.repo.toUpperCase()}</p>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.currentStatus] || "#94a3b8" }} />
                              {r.currentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                            {r.statusTransition ? (
                              <>
                                <p>{r.statusTransition.from || "Unknown"} {"->"} {r.statusTransition.to}</p>
                                <p>{new Date(r.statusTransition.changedAt).toLocaleDateString()}</p>
                              </>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="mb-1 flex flex-wrap gap-1">
                              {r.changedTypes.map((ct) => (
                                <span key={ct} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {CHANGE_LABELS[ct]}
                                </span>
                              ))}
                            </div>
                            <p className="max-w-[260px] text-xs text-muted-foreground">{r.changeSummary}</p>
                          </td>
                          <td className="px-3 py-2 align-top text-xs">
                            {r.primaryPrNumber ? (
                              <>
                                <Link href={r.primaryPrUrl || `/pr/${r.repo}/${r.primaryPrNumber}`} className="font-medium text-primary hover:underline">
                                  PR #{r.primaryPrNumber}
                                </Link>
                                <p className="text-muted-foreground">+{Math.max(0, r.allPrNumbers.length - 1)} more</p>
                              </>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground">{r.author || "—"}</td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                            <p>PRs: {r.linkedPrCount}</p>
                            <p>Commits: {r.commits}</p>
                            <p>Files: {r.filesChanged}</p>
                            <p>Discussion: {r.discussionVolume}</p>
                          </td>
                          <td className="px-3 py-2 align-top">
                            {r.upgradeTags.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="flex max-w-[180px] flex-wrap gap-1">
                                {r.upgradeTags.slice(0, 2).map((t) => (
                                  <span key={t} className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{t}</span>
                                ))}
                                {r.upgradeTags.length > 2 && <span className="text-[10px] text-muted-foreground">+{r.upgradeTags.length - 2}</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages} · {meta.total} rows</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setParams({ page: String(Math.max(1, meta.page - 1)) })}
                        disabled={meta.page <= 1}
                        className="inline-flex h-7 items-center rounded border border-border px-2 text-xs text-foreground disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setParams({ page: String(Math.min(meta.totalPages, meta.page + 1)) })}
                        disabled={meta.page >= meta.totalPages}
                        className="inline-flex h-7 items-center rounded border border-border px-2 text-xs text-foreground disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function YearMonthAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DrilldownPageContent />
    </Suspense>
  );
}
