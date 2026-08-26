"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Shuffle } from "lucide-react";
import { client } from "@/lib/orpc";
import { InlineBrandLoader } from "@/components/inline-brand-loader";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Breakdown = Awaited<ReturnType<typeof client.analytics.getEventDayProposalBreakdown>>[number];
type StatusChange = Awaited<ReturnType<typeof client.analytics.getEventDayStatusChanges>>[number];

function urlParam(k: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(k);
}

/** Resolve the active date window from the URL (defaults to this month). */
function useWindow() {
  const [win, setWin] = useState<{ from: string; to: string }>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { from: `${today.slice(0, 7)}-01`, to: today };
  });
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const mode = urlParam("mode") ?? "range";
    if (mode === "day") {
      const d = urlParam("day") || today;
      setWin({ from: d, to: d });
    } else {
      setWin({ from: urlParam("from") || `${today.slice(0, 7)}-01`, to: urlParam("to") || today });
    }
  }, []);
  return win;
}

export default function OfficeHoursAnalyticsTab() {
  const { from, to } = useWindow();
  const [breakdown, setBreakdown] = useState<Breakdown[] | null>(null);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      client.analytics.getEventDayProposalBreakdown({ date: from, to }).catch(() => [] as Breakdown[]),
      client.analytics.getEventDayStatusChanges({ date: from, to }).catch(() => [] as StatusChange[]),
    ]).then(([b, s]) => {
      if (!alive) return;
      setBreakdown(b);
      setStatusChanges(s);
    });
    return () => { alive = false; };
  }, [from, to]);

  const statusOption = useMemo(() => {
    const rows = breakdown ?? [];
    const byStatus = new Map<string, number>();
    rows.forEach((r) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.prsChecked));
    const data = [...byStatus.entries()].sort((a, b) => b[1] - a[1]);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 16, right: 16, bottom: 24, left: 8, containLabel: true },
      xAxis: { type: "category", data: data.map((d) => d[0]), axisLabel: { fontSize: 11 } },
      yAxis: { type: "value" },
      series: [{ type: "bar", barWidth: "50%", data: data.map((d) => d[1]), itemStyle: { color: "#6366f1", borderRadius: [4, 4, 0, 0] } }],
    };
  }, [breakdown]);

  if (breakdown === null) return <div className="py-16"><InlineBrandLoader size="md" label="Loading analytics…" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Breakdowns for <strong className="text-foreground">{from}</strong> to <strong className="text-foreground">{to}</strong> · adjust the range from the Overview tab.</p>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Proposals by status</div>
        {breakdown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No proposal activity in this window.</p>
        ) : (
          <div className="h-[320px] w-full"><ReactECharts option={statusOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge /></div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><Shuffle className="h-4 w-4 text-amber-500" /> Status changes ({statusChanges.length})</div>
        {statusChanges.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No status changes in this window.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {statusChanges.slice(0, 40).map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-1.5 text-sm">
                <span className="shrink-0 text-xs text-muted-foreground">{s.fromStatus ?? "—"} → {s.toStatus}</span>
                <span className="truncate text-right text-foreground">{s.label} <span className="text-muted-foreground">×{s.count}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
