"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Search, Sparkles, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { client } from "@/lib/orpc";
import { CHART_AXIS, CHART_GRID } from "@/lib/chart-colors";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type ProfileResult = Awaited<ReturnType<typeof client.analytics.getContributorProfile>>;

export function ContributorLookupPanel({
  from,
  to,
  initialActor = "",
}: {
  from?: string;
  to?: string;
  initialActor?: string;
}) {
  const [query, setQuery] = useState(initialActor);
  const [selected, setSelected] = useState(initialActor);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.analytics
      .getContributorRankings({ limit: 100, sortBy: "total" })
      .then((rows) => {
        if (!cancelled) setCandidates(rows.map((r) => r.actor));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selected.toLowerCase()) return [];
    return candidates.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  }, [query, selected, candidates]);

  const lookup = (handle: string) => {
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) return;
    setSelected(clean);
    setQuery(clean);
    setLoading(true);
    setErr(null);
    client.analytics
      .getContributorProfile({ actor: clean, from, to, limit: 150, months: 24 })
      .then((res) => setProfile(res))
      .catch(() => {
        setProfile(null);
        setErr(`No contributor activity found for "${clean}" in this range.`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selected) lookup(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const creativeScore = profile
    ? profile.summary.reviews * 3 +
      profile.summary.prsAuthored * 2 +
      profile.summary.statusChanges * 2 +
      profile.summary.comments +
      profile.summary.commits
    : 0;

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Contributor Lookup
          </h2>
          <p className="text-xs text-muted-foreground">
            Search any GitHub handle across EIPs, ERCs, and RIPs to inspect reviews, authored PRs, and activity over time.
          </p>
        </div>
        {(from || to) && (
          <span className="font-mono text-[11px] text-muted-foreground">
            Window: {from ?? "Start"} to {to ?? "Now"}
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup(query)}
              placeholder="Search contributor handle — e.g. SamWilsn, jochem-brouwer, tony..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelected("");
                  setProfile(null);
                  setErr(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => lookup(query)}
            disabled={loading || !query.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => lookup(s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted"
              >
                <span className="font-mono font-medium text-foreground">{s}</span>
                <span className="text-[10px] text-muted-foreground">Select</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {err && <p className="text-xs text-rose-500">{err}</p>}

      {profile && (
        <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">{profile.actor}</span>
                <Link
                  href={`/user/${profile.actor}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Full profile <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Active: {profile.summary.firstActivity?.slice(0, 10) ?? "-"} to{" "}
                {profile.summary.lastActivity?.slice(0, 10) ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.repoBreakdown.map((r) => (
                <span
                  key={r.repo}
                  className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground"
                >
                  {r.repo}: <strong>{r.count.toLocaleString()}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Metrics + Creative Score* */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            <div className="rounded-lg border border-border/70 bg-card p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-1 font-mono text-lg font-bold">{profile.summary.totalActivities.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">PRs Authored</p>
              <p className="mt-1 font-mono text-lg font-bold">{profile.summary.prsAuthored.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reviews</p>
              <p className="mt-1 font-mono text-lg font-bold">{profile.summary.reviews.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comments</p>
              <p className="mt-1 font-mono text-lg font-bold">{profile.summary.comments.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-card p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status Changes</p>
              <p className="mt-1 font-mono text-lg font-bold">{profile.summary.statusChanges.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Creative Score*
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-primary">{creativeScore.toLocaleString()}</p>
            </div>
          </div>

          {/* Per-Contributor Monthly Activity Chart */}
          {profile.monthlyActivity.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Activity Over Time (Monthly)</p>
              <ChartContainer
                config={{ total: { label: "Activities", color: "#3b82f6" } }}
                className="h-48 w-full"
              >
                <ResponsiveContainer>
                  <BarChart data={profile.monthlyActivity} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            * <strong>Creative Score</strong> is a weighted EIPsInsight engagement metric: Reviews × 3 + PRs Authored × 2 +
            Status Changes × 2 + Comments × 1 + Commits × 1.
          </p>
        </div>
      )}
    </section>
  );
}
