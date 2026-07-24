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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { LastUpdated } from "@/components/analytics/LastUpdated";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { chartTooltip, CHART_TOOLTIP_FG, CHART_TOOLTIP_BORDER } from '@/lib/chart-theme';

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
const STATUS_LOOKUP = new Map(STATUS_ORDER.map((status) => [status.toLowerCase(), status]));

function normalizeStatusLabel(raw: string | null | undefined): string {
  const value = (raw || "").trim();
  if (!value) return "Unknown";
  const canonical = STATUS_LOOKUP.get(value.toLowerCase());
  if (canonical) return canonical;
  return value;
}
const CATEGORY_LINE_COLORS = [
  "#10b981",
  "#60a5fa",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb923c",
  "#94a3b8",
];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestChangeDescriptor(row: {
  statusTransition: { changedAt: string } | null;
  primaryPrMergedAt: string | null;
  latestChangedAt: string;
  changedTypes: string[];
}) {
  const candidates: Array<{ source: string; at: string }> = [];
  if (row.statusTransition?.changedAt) {
    candidates.push({ source: "Status transition", at: row.statusTransition.changedAt });
  }
  if (row.primaryPrMergedAt) {
    candidates.push({ source: "PR merged", at: row.primaryPrMergedAt });
  }
  if (row.changedTypes.includes("metadata-change")) {
    candidates.push({ source: "Metadata update", at: row.latestChangedAt });
  }

  const latest = candidates
    .filter((c) => !!c.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

  if (!latest) {
    return { source: "Event", at: row.latestChangedAt };
  }
  return latest;
}

function availableMonthsDefaultStart(toMonth: string) {
  const end = new Date(`${toMonth}-01T00:00:00.000Z`);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface MonthlyDrilldownProps {
  initialMonth?: string;
  basePath?: string;
}

export function MonthlyDrilldown({ initialMonth, basePath = "/insights" }: MonthlyDrilldownProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const repo = (searchParams.get("repo") || "all") as "all" | "eips" | "ercs" | "rips";
  const month = initialMonth || searchParams.get("month") || defaultMonth;
  const historyFrom = searchParams.get("from") || availableMonthsDefaultStart(defaultMonth);
  const historyTo = searchParams.get("to") || month;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  // Larger page so the client-side Week filter has the whole month's changes to work with
  // (status-change-filtered months are well under this).
  const pageSize = 60;

  const [loading, setLoading] = useState(true);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<Date>(new Date());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof client.insights.getMonthlyDrilldown>> | null>(null);
  const [summaryRows, setSummaryRows] = useState<Array<Awaited<ReturnType<typeof client.insights.getMonthlyDrilldown>>["rows"][number]>>([]);
  const [editors, setEditors] = useState<Array<{ editor: string; totalActions: number; prsTouched: number; eipsActions: number; ercsActions: number; ripsActions: number }>>([]);
  const [draftFinalHistory, setDraftFinalHistory] = useState<Array<{ month: string; draft: number; final: number }>>([]);
  const [historyUpdatedAt, setHistoryUpdatedAt] = useState<string | null>(null);
  const [statusTrendStatus, setStatusTrendStatus] = useState<string>("Review");
  const [statusCategoryTrend, setStatusCategoryTrend] = useState<Array<{ month: string; category: string; count: number }>>([]);
  const [statusCategoryUpdatedAt, setStatusCategoryUpdatedAt] = useState<string | null>(null);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [tableStatusFilter, setTableStatusFilter] = useState<string | null>(null);
  const [tableRepoFilter, setTableRepoFilter] = useState<"eips" | "ercs" | "rips" | null>(null);
  // Defaults tuned for the newsletter: status changes, most recent first.
  const [changeFilter, setChangeFilter] = useState<"all" | "status-change" | "content-change" | "metadata-change">("status-change");
  const [sortFilter, setSortFilter] = useState<"updated_desc" | "status_first" | "prs_desc" | "impact_desc">("updated_desc");
  const [globalSearch, setGlobalSearch] = useState("");
  const [rangeDays, setRangeDays] = useState<number | null>(null); // null = all time
  const tableSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.insights.getAvailableMonths().then(setAvailableMonths).catch(console.error);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [drilldown, summaryDrilldown, editorRows, draftFinalHistoryRes, statusCategoryTrendRes] = await Promise.all([
          client.insights.getMonthlyDrilldown({
            repo: tableRepoFilter ?? repo,
            month,
            status: tableStatusFilter ? [tableStatusFilter] : [],
            change: changeFilter === "all" ? [] : [changeFilter],
            type: [],
            q: globalSearch.trim(),
            sort: sortFilter,
            page,
            pageSize,
          }),
          client.insights.getMonthlyDrilldown({
            repo,
            month,
            status: [],
            change: [],
            type: [],
            q: "",
            sort: "updated_desc",
            page: 1,
            pageSize: 2000,
          }),
          client.analytics.getMonthlyEditorLeaderboard({
            monthYear: month,
            repo: repo === "all" ? undefined : repo,
            limit: 20,
          }),
          client.insights.getDraftVsFinalHistory({
            repo: repo === "all" ? undefined : repo,
            fromMonth: historyFrom,
            toMonth: historyTo,
          }),
          client.insights.getStatusCategoryTrend({
            repo: repo === "all" ? undefined : repo,
            status: statusTrendStatus,
            fromMonth: historyFrom,
            toMonth: historyTo,
          }),
        ]);

        setData(drilldown);
        setSummaryRows(summaryDrilldown.rows);
        setEditors(editorRows.items.map((row) => ({
          editor: row.actor,
          totalActions: row.totalActions,
          prsTouched: row.prsTouched,
          eipsActions: row.eipsActions ?? 0,
          ercsActions: row.ercsActions ?? 0,
          ripsActions: row.ripsActions ?? 0,
        })));
        setDraftFinalHistory(draftFinalHistoryRes.rows);
        setHistoryUpdatedAt(draftFinalHistoryRes.updatedAt);
        setStatusCategoryTrend(statusCategoryTrendRes.rows);
        setStatusCategoryUpdatedAt(statusCategoryTrendRes.updatedAt);
        setDataUpdatedAt(draftFinalHistoryRes.updatedAt ? new Date(draftFinalHistoryRes.updatedAt) : new Date());
      } catch (err) {
        console.error("Monthly insight load failed", err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [repo, month, page, pageSize, tableStatusFilter, tableRepoFilter, changeFilter, sortFilter, globalSearch, historyFrom, historyTo, statusTrendStatus]);

  useEffect(() => {
    setTableStatusFilter(null);
    setTableRepoFilter(null);
    setColumnSearch({});
    setRangeDays(null);
  }, [repo, month]);

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    });
    if (!updates.page) next.set("page", "1");

    // If month is updated, we might need to redirect to the new path if we're in [year]/[month]
    if (updates.month) {
      const [y, m] = updates.month.split("-");
      router.push(`/insights/${y}/${parseInt(m, 10)}?${next.toString()}`);
    } else {
      router.replace(`${basePath}?${next.toString()}`);
    }
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
          case "latestChange":
            return `${r.latestChangedAt || ""} ${r.statusTransition?.changedAt || ""}`.toLowerCase().includes(q);
          default:
            return true;
        }
      })
    );
  }, [rows, columnSearch]);

  // Rolling "last N days" window for the newsletter — anchored to the most recent change in view,
  // so it works whether you're looking at the current month or a past one.
  const rangeFilteredRows = useMemo(() => {
    if (rangeDays == null) return filteredRows;
    const rowTime = (r: { statusTransition: { changedAt: string } | null; latestChangedAt: string }) => {
      const at = r.statusTransition?.changedAt || r.latestChangedAt;
      const t = at ? new Date(at).getTime() : NaN;
      return Number.isNaN(t) ? null : t;
    };
    let ref = 0;
    for (const r of filteredRows) {
      const t = rowTime(r);
      if (t != null && t > ref) ref = t;
    }
    if (!ref) ref = Date.now();
    const cutoff = ref - rangeDays * 86_400_000;
    return filteredRows.filter((r) => {
      const t = rowTime(r);
      return t != null && t >= cutoff;
    });
  }, [filteredRows, rangeDays]);

  const statusRepoMatrix = useMemo(() => {
    const initRow = () => ({ eips: 0, ercs: 0, rips: 0 });
    const matrix: Record<string, { eips: number; ercs: number; rips: number }> = {};
    STATUS_ORDER.forEach((s) => { matrix[s] = initRow(); });

    for (const row of summaryRows) {
      if (!row.changedTypes.includes("status-change") || !row.statusTransition?.to) continue;
      const status = normalizeStatusLabel(row.statusTransition.to);
      if (!matrix[status]) matrix[status] = initRow();
      if (row.repo === "eips" || row.repo === "ercs" || row.repo === "rips") matrix[status][row.repo] += 1;
    }

    return matrix;
  }, [summaryRows]);

  const visibleStatusOrder = useMemo(() => {
    const seen = new Set<string>(STATUS_ORDER);
    const dynamic = Object.keys(statusRepoMatrix)
      .filter((status) => !seen.has(status))
      .sort((a, b) => a.localeCompare(b));
    return [...STATUS_ORDER, ...dynamic];
  }, [statusRepoMatrix]);

  const changeBreakdownOption = useMemo(() => {
    const total = (summary?.statusChanges || 0) + (summary?.contentChanges || 0) + (summary?.metadataChanges || 0);
    const chartData = [
      { name: "Status Changes", value: summary?.statusChanges || 0, itemStyle: { color: "#f59e0b" } },
      { name: "Content Changes", value: summary?.contentChanges || 0, itemStyle: { color: "#22d3ee" } },
      { name: "Metadata Changes", value: summary?.metadataChanges || 0, itemStyle: { color: "#a78bfa" } },
    ].filter((d) => d.value > 0);

    return {
      tooltip: chartTooltip({
        trigger: "item",
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}<br/><b>${params.value}</b> (${params.percent}%)`,
      }),
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
      tooltip: chartTooltip({
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ seriesName: string; value: number; color: string; dataIndex: number }>) => {
          if (!params?.length) return "";
          const idx = params[0]?.dataIndex ?? 0;
          const row = top[idx];
          const eips = row?.eipsActions ?? 0;
          const ercs = row?.ercsActions ?? 0;
          const rips = row?.ripsActions ?? 0;
          const total = row?.totalActions ?? (eips + ercs + rips);

          const lines = [
            `<div style="margin-bottom:6px;font-weight:600;color:${CHART_TOOLTIP_FG}">${row?.editor ?? ""}</div>`,
            ...params.map((p) => `<span style="display:inline-block;margin-right:8px;color:${p.color}">●</span>${p.seriesName}: <b>${Number(p.value || 0)}</b>`),
            `<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${CHART_TOOLTIP_BORDER}">Total: <b>${total}</b></div>`,
          ];
          return lines.join("<br/>");
        },
      }),
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
          name: "EIPs",
          type: "bar",
          stack: "repos",
          data: top.map((e) => e.eipsActions),
          barWidth: 14,
          itemStyle: { color: "#22c55e", borderRadius: [0, 0, 0, 0] },
        },
        {
          name: "ERCs",
          type: "bar",
          stack: "repos",
          data: top.map((e) => e.ercsActions),
          barWidth: 14,
          itemStyle: { color: "#60a5fa", borderRadius: [0, 0, 0, 0] },
        },
        {
          name: "RIPs",
          type: "bar",
          stack: "repos",
          data: top.map((e) => e.ripsActions),
          barWidth: 14,
          itemStyle: { color: "#f59e0b", borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: "right",
            color: "#cbd5e1",
            fontSize: 10,
            formatter: (params: { dataIndex: number }) => {
              const total = top[params.dataIndex]?.totalActions ?? 0;
              return total > 0 ? String(total) : "";
            },
          },
        },
      ],
    };
  }, [editors]);

  const draftVsFinalOption = useMemo(() => {
    const months = draftFinalHistory.map((row) => monthLabel(row.month));
    return {
      tooltip: chartTooltip({ trigger: "axis" }),
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: "#94a3b8", fontSize: 11 },
      },
      grid: { left: 36, right: 18, top: 40, bottom: 28 },
      xAxis: {
        type: "category",
        data: months,
        boundaryGap: false,
        axisLabel: { color: "#94a3b8", fontSize: 11, rotate: months.length > 8 ? 35 : 0 },
        axisLine: { lineStyle: { color: "#334155" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", fontSize: 11 },
        splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
      },
      series: [
        {
          name: "Draft",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: draftFinalHistory.map((row) => row.draft),
          lineStyle: { width: 3, color: "#60a5fa" },
          itemStyle: { color: "#60a5fa" },
          areaStyle: { color: "rgba(96,165,250,0.14)" },
        },
        {
          name: "Final",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: draftFinalHistory.map((row) => row.final),
          lineStyle: { width: 3, color: "#10b981" },
          itemStyle: { color: "#10b981" },
          areaStyle: { color: "rgba(16,185,129,0.12)" },
        },
      ],
    };
  }, [draftFinalHistory]);

  const statusCategoryOption = useMemo(() => {
    const months = Array.from(new Set(statusCategoryTrend.map((row) => row.month))).sort();
    const categories = Array.from(new Set(statusCategoryTrend.map((row) => row.category)));
    const monthLabels = months.map((m) => monthLabel(m));
    const series = categories.map((category, index) => ({
      name: category,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      data: months.map((monthKey) => (
        statusCategoryTrend.find((row) => row.month === monthKey && row.category === category)?.count ?? 0
      )),
      lineStyle: { width: 2.5, color: CATEGORY_LINE_COLORS[index % CATEGORY_LINE_COLORS.length] },
      itemStyle: { color: CATEGORY_LINE_COLORS[index % CATEGORY_LINE_COLORS.length] },
    }));

    return {
      tooltip: chartTooltip({ trigger: "axis" }),
      legend: {
        top: 0,
        left: 0,
        textStyle: { color: "#94a3b8", fontSize: 11 },
      },
      grid: { left: 36, right: 18, top: 62, bottom: 28 },
      xAxis: {
        type: "category",
        data: monthLabels,
        boundaryGap: false,
        axisLabel: { color: "#94a3b8", fontSize: 11, rotate: monthLabels.length > 8 ? 35 : 0 },
        axisLine: { lineStyle: { color: "#334155" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#94a3b8", fontSize: 11 },
        splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
      },
      series,
    };
  }, [statusCategoryTrend]);

  const exportDraftFinalCsv = () => {
    const header = ["month", "draft", "final"].join(",");
    const rows = draftFinalHistory.map((row) =>
      [row.month, row.draft, row.final].map(csvEscape).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draft-vs-final-history-${repo}-${historyFrom}-to-${historyTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStatusCategoryCsv = () => {
    const header = ["month", "status", "category", "count"].join(",");
    const rows = statusCategoryTrend.map((row) =>
      [row.month, statusTrendStatus, row.category, row.count].map(csvEscape).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `status-category-trend-${statusTrendStatus.toLowerCase().replace(/\s+/g, "-")}-${repo}-${historyFrom}-to-${historyTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    visibleStatusOrder.forEach((status) => {
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
      const result = await client.analytics.exportMonthlyEditorLeaderboardDetailedCSV({
        monthYear: month,
        limit: 20,
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
    tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTableStatusFilter(status);
    setTableRepoFilter(targetRepo);
    setParams({ page: "1" });
  };

  const clearTableFilters = () => {
    setTableStatusFilter(null);
    setTableRepoFilter(null);
    setColumnSearch({});
    setChangeFilter("status-change");
    setSortFilter("updated_desc");
    setGlobalSearch("");
    setRangeDays(null);
    setParams({ page: "1" });
  };

  const changeTabs: Array<{ key: typeof changeFilter; label: string }> = [
    { key: "status-change", label: "Status changes" },
    { key: "content-change", label: "Content" },
    { key: "metadata-change", label: "Metadata" },
    { key: "all", label: "All changes" },
  ];
  const sortOptions: Array<{ key: typeof sortFilter; label: string }> = [
    { key: "updated_desc", label: "Most recent" },
    { key: "status_first", label: "Status changes first" },
    { key: "prs_desc", label: "Most PRs" },
    { key: "impact_desc", label: "Highest impact" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full pb-10">
        <PageHeader
          eyebrow="Insights"
          indicator={{ icon: "chart", label: "Monthly", pulse: (summary?.totalChanged || 0) > 50 }}
          title={`Monthly Insight - ${monthLabel(month)}`}
          description={`Monthly governance movement for ${monthLabel(month)} across EIPs, ERCs, and RIPs, with clear status distribution and change signals.`}
          sectionId="insights"
        />
        <SectionSeparator className="pb-2" />

        <div className="mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6">
          <Link href="/insights/hub" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> More Insights
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
              <InlineBrandLoader size="md" label="Loading monthly insight..." />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid items-stretch gap-3 xl:grid-cols-12">
                <div className="xl:col-span-5 rounded-xl border border-border bg-card p-4">
                  <div className="mx-auto flex h-full w-full max-w-[860px] flex-col justify-center">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Status Transition Summary</h3>
                      <button
                        onClick={exportCsv}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/35 bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Report
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-muted-foreground">
                      Monthly status-transition entries: <span className="font-semibold text-foreground">{summary?.statusChanges || 0}</span>
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
                        {visibleStatusOrder.map((status) => (
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
                    <div className="relative h-[280px] min-h-[280px]">
                      <ReactECharts option={changeBreakdownOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 backdrop-blur-sm">
                        EIPsInsight.com
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                      <LastUpdated timestamp={dataUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
                      <span className="text-xs text-muted-foreground">Monthly change mix</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Editors Leaderboard - {monthLabel(month)}</h3>
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
                      <div className="relative h-full">
                        <ReactECharts option={editorBarOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 backdrop-blur-sm">
                          EIPsInsight.com
                        </div>
                      </div>
                    </div>
                    <div className="h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/70 scrollbar-track-transparent">
                      <div className="space-y-2">
        {editors.slice(0, 8).map((ed, idx) => (
                          <div
                            key={ed.editor}
                            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
                              ed.editor.toLowerCase() === "abcoathup"
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-border bg-background/60"
                            }`}
                          >
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
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{ed.editor}</p>
                                {ed.editor.toLowerCase() === "abcoathup" && (
                                  <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                    Associate Editor
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{ed.totalActions} actions · {ed.prsTouched} PRs touched</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <LastUpdated timestamp={dataUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
                  <span className="text-xs text-muted-foreground">Editorial activity snapshot</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Draft vs Final History</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Monthly status transitions from {monthLabel(historyFrom)} to {monthLabel(historyTo)}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={historyFrom}
                      onChange={(e) => setParams({ from: e.target.value, page: "1" })}
                      className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                    >
                      {availableMonths.map((m) => <option key={`from-${m}`} value={m}>From {monthLabel(m)}</option>)}
                      {!availableMonths.includes(historyFrom) && <option value={historyFrom}>From {monthLabel(historyFrom)}</option>}
                    </select>
                    <select
                      value={historyTo}
                      onChange={(e) => setParams({ to: e.target.value, page: "1" })}
                      className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                    >
                      {availableMonths.map((m) => <option key={`to-${m}`} value={m}>To {monthLabel(m)}</option>)}
                      {!availableMonths.includes(historyTo) && <option value={historyTo}>To {monthLabel(historyTo)}</option>}
                    </select>
                    <button
                      onClick={exportDraftFinalCsv}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/35 bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                  </div>
                </div>
                <div className="relative h-[320px] rounded-lg border border-border bg-background/40 p-2">
                  <ReactECharts option={draftVsFinalOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                  <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 backdrop-blur-sm">
                    EIPsInsight.com
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  {historyUpdatedAt ? (
                    <LastUpdated timestamp={historyUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
                  ) : (
                    <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">No historical changes in this range</span>
                  )}
                  <span className="text-xs text-muted-foreground">Historical monthly trend</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Category Trend by Status</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Monthly proposals entering <span className="text-foreground">{statusTrendStatus}</span>, split by category from {monthLabel(historyFrom)} to {monthLabel(historyTo)}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={historyFrom}
                      onChange={(e) => setParams({ from: e.target.value, page: "1" })}
                      className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                    >
                      {availableMonths.map((m) => <option key={`trend-from-${m}`} value={m}>From {monthLabel(m)}</option>)}
                      {!availableMonths.includes(historyFrom) && <option value={historyFrom}>From {monthLabel(historyFrom)}</option>}
                    </select>
                    <select
                      value={historyTo}
                      onChange={(e) => setParams({ to: e.target.value, page: "1" })}
                      className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                    >
                      {availableMonths.map((m) => <option key={`trend-to-${m}`} value={m}>To {monthLabel(m)}</option>)}
                      {!availableMonths.includes(historyTo) && <option value={historyTo}>To {monthLabel(historyTo)}</option>}
                    </select>
                    <select
                      value={statusTrendStatus}
                      onChange={(e) => setStatusTrendStatus(e.target.value)}
                      className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button
                      onClick={exportStatusCategoryCsv}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/35 bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Detailed CSV
                    </button>
                  </div>
                </div>
                <div className="relative h-[340px] rounded-lg border border-border bg-background/40 p-2">
                  <ReactECharts option={statusCategoryOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
                  <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 backdrop-blur-sm">
                    EIPsInsight.com
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  {statusCategoryUpdatedAt ? (
                    <LastUpdated timestamp={statusCategoryUpdatedAt} prefix="Updated" showAbsolute className="bg-muted/40 text-xs" />
                  ) : (
                    <span className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">No category activity in this range</span>
                  )}
                  <span className="text-xs text-muted-foreground">Category-level historical view</span>
                </div>
              </div>

              <div ref={tableSectionRef} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Proposal Changes - {monthLabel(month)}
                    {rangeDays != null ? ` · last ${rangeDays} days` : ""}
                  </h3>
                  <span className="text-xs text-muted-foreground">{rangeFilteredRows.length} shown</span>
                </div>
                {/* Filter bar — defaults to status changes, most recent first. */}
                <div className="space-y-2.5 border-b border-border bg-muted/20 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                      {changeTabs.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => { setChangeFilter(tab.key); setParams({ page: "1" }); }}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${changeFilter === tab.key ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <select
                      value={tableRepoFilter ?? "all"}
                      onChange={(e) => { setTableRepoFilter(e.target.value === "all" ? null : (e.target.value as "eips" | "ercs" | "rips")); setParams({ page: "1" }); }}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                      aria-label="Repository"
                    >
                      <option value="all">All repos</option>
                      <option value="eips">EIPs</option>
                      <option value="ercs">ERCs</option>
                      <option value="rips">RIPs</option>
                    </select>
                    <select
                      value={tableStatusFilter ?? "all"}
                      onChange={(e) => { setTableStatusFilter(e.target.value === "all" ? null : e.target.value); setParams({ page: "1" }); }}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                      aria-label="Target status"
                    >
                      <option value="all">Any status</option>
                      {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={sortFilter}
                      onChange={(e) => { setSortFilter(e.target.value as typeof sortFilter); setParams({ page: "1" }); }}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                      aria-label="Sort"
                    >
                      {sortOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                    <input
                      value={globalSearch}
                      onChange={(e) => { setGlobalSearch(e.target.value); setParams({ page: "1" }); }}
                      placeholder="Search proposals, authors…"
                      className="h-8 flex-1 min-w-[160px] rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/70"
                    />
                    <button onClick={clearTableFilters} className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground hover:bg-muted/60">
                      Reset
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Show</span>
                    {[
                      { days: null as number | null, label: "All this month" },
                      { days: 7, label: "Last 7 days" },
                      { days: 14, label: "Last 14 days" },
                      { days: 30, label: "Last 30 days" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setRangeDays(opt.days)}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${rangeDays === opt.days ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                          ["latestChange", "Latest Change"],
                          ["metrics", "Metrics"],
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
                      {rangeFilteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                            No {changeFilter === "all" ? "changed" : changeTabs.find((t) => t.key === changeFilter)?.label.toLowerCase()} proposals found for {monthLabel(month)}{rangeDays != null ? ` in the last ${rangeDays} days` : ""}.
                          </td>
                        </tr>
                      ) : rangeFilteredRows.map((r) => (
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
                                <p>{formatDateTime(r.statusTransition.changedAt)}</p>
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
                            {(() => {
                              const latest = latestChangeDescriptor(r);
                              return (
                                <>
                                  <p className="font-medium text-foreground/90">{latest.source}</p>
                                  <p>{formatDateTime(latest.at)}</p>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                            <p>PRs: {r.linkedPrCount}</p>
                            <p>Commits: {r.commits}</p>
                            <p>Files: {r.filesChanged}</p>
                            <p>Discussion: {r.discussionVolume}</p>
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
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
