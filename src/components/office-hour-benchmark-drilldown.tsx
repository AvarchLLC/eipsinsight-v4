"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, X } from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

export type DrilldownFilter = {
  title: string;
  actor?: string;
  from: string;
  to: string;
  metric?: "all" | "reviews" | "merged" | "closed";
  ohDates?: string[];
};

type DrilldownRow = {
  prNumber: number;
  repoName: string;
  repoType: string;
  title: string;
  state: string;
  mergedAt: string | null;
  editors: string[];
  reviews: number;
  comments: number;
  merges: number;
  eipNumbers: number[];
  lastEventAt: string;
  githubUrl: string;
};

export function OfficeHourBenchmarkDrilldown({
  filter,
  onClose,
}: {
  filter: DrilldownFilter;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<DrilldownRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.analytics
      .getEditorPrDrilldown({
        actor: filter.actor,
        from: filter.from,
        to: filter.to,
        metric: filter.metric ?? "all",
        ohDates: filter.ohDates,
      })
      .then((res) => {
        if (!cancelled) setRows(res);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{filter.title}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {filter.from} to {filter.to} · {loading ? "Loading PRs..." : `${rows.length} PR${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close drilldown table"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading PR activity from database...
        </div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No matching PR records found in this window.
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pl-2 pr-3">PR</th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2 text-right">Reviews</th>
                <th className="px-2 py-2 text-right">Comments</th>
                <th className="py-2 pl-2 pr-2 text-right">Last Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r) => (
                <tr key={`${r.repoName}-${r.prNumber}`} className="hover:bg-muted/30">
                  <td className="py-2 pl-2 pr-3 whitespace-nowrap font-mono">
                    <a
                      href={r.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      {r.repoType}#{r.prNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-2 py-2 max-w-[320px] truncate text-foreground">
                    {r.title}
                    {r.eipNumbers.length > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        ({r.eipNumbers.slice(0, 3).map((n) => `EIP-${n}`).join(", ")})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                        r.state === "merged"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : r.state === "closed"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      )}
                    >
                      {r.state}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">{r.reviews}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">{r.comments}</td>
                  <td className="py-2 pl-2 pr-2 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {r.lastEventAt.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
