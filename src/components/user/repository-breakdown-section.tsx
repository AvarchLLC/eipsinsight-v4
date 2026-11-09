"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";

type ActivityDetail = {
  actionType: string;
  repo: string | null;
  occurredAt: string;
};

type Bucket = {
  key: string;
  label: string;
  total: number;
  commits: number;
  prs: number;
  reviews: number;
  comments: number;
};

function repoKey(repo: string | null) {
  if (!repo) return "unknown";
  if (repo.includes("EIPs")) return "eips";
  if (repo.includes("ERCs")) return "ercs";
  if (repo.includes("RIPs")) return "rips";
  return "other";
}

function metricForAction(actionType: string): "commits" | "prs" | "reviews" | "comments" {
  if (actionType === "committed") return "commits";
  if (actionType === "reviewed") return "reviews";
  if (actionType === "commented" || actionType === "issue_comment") return "comments";
  return "prs";
}

function toCsvValue(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const content = [headers.join(","), ...rows.map((r) => headers.map((h) => toCsvValue(r[h])).join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RepositoryBreakdownSection({
  actor,
  activities,
}: {
  actor: string;
  activities: ActivityDetail[];
}) {
  const buckets = useMemo(() => {
    const base: Record<string, Bucket> = {
      eips: { key: "eips", label: "EIPs", total: 0, commits: 0, prs: 0, reviews: 0, comments: 0 },
      ercs: { key: "ercs", label: "ERCs", total: 0, commits: 0, prs: 0, reviews: 0, comments: 0 },
      rips: { key: "rips", label: "RIPs", total: 0, commits: 0, prs: 0, reviews: 0, comments: 0 },
      other: { key: "other", label: "Other", total: 0, commits: 0, prs: 0, reviews: 0, comments: 0 },
      unknown: { key: "unknown", label: "Unknown", total: 0, commits: 0, prs: 0, reviews: 0, comments: 0 },
    };

    for (const activity of activities) {
      const key = repoKey(activity.repo);
      const metric = metricForAction(activity.actionType);
      base[key].total += 1;
      base[key][metric] += 1;
    }

    return Object.values(base).filter((b) => b.total > 0).sort((a, b) => b.total - a.total);
  }, [activities]);

  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  const csvRows = buckets.map((b) => ({
    actor,
    repositoryFamily: b.label,
    totalActivities: b.total,
    commits: b.commits,
    prs: b.prs,
    reviews: b.reviews,
    comments: b.comments,
    percentage: total > 0 ? ((b.total / total) * 100).toFixed(2) : "0.00",
  }));

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
            Repository Breakdown
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Contribution distribution by repository family</p>
        </div>
        <button
          onClick={() => downloadCsv(`${actor.replace(/\s+/g, "-").toLowerCase()}-repository-breakdown.csv`, csvRows)}
          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15"
        >
          <Download className="h-3.5 w-3.5" />
          Download Reports
        </button>
      </div>

      <div className="space-y-3">
        {buckets.map((bucket) => {
          const pct = total > 0 ? (bucket.total / total) * 100 : 0;
          return (
            <div key={bucket.key} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{bucket.label}</p>
                <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
              </div>
              <div className="mb-3 h-2 rounded-full bg-muted/60">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
                <div><span className="text-muted-foreground">Total</span><p className="font-semibold text-foreground">{bucket.total}</p></div>
                <div><span className="text-muted-foreground">Commits</span><p className="font-semibold text-foreground">{bucket.commits}</p></div>
                <div><span className="text-muted-foreground">PRs</span><p className="font-semibold text-foreground">{bucket.prs}</p></div>
                <div><span className="text-muted-foreground">Reviews</span><p className="font-semibold text-foreground">{bucket.reviews}</p></div>
                <div><span className="text-muted-foreground">Comments</span><p className="font-semibold text-foreground">{bucket.comments}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
