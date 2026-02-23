"use client";

import React, { useState, useEffect, useMemo } from "react";
import { client } from "@/lib/orpc";
import { Loader2, ArrowLeft, Rocket, ExternalLink } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UpgradeInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [upgrades, setUpgrades] = useState<Array<{
    id: number; slug: string; name: string | null; metaEip: number | null;
    eipCount: number; createdAt: string | null;
  }>>([]);
  const [compositionChanges, setCompositionChanges] = useState<Array<{
    month: string; upgrade: string; eventType: string; count: number;
  }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const u = await client.insights.getUpgradeTimeline();
        setUpgrades(u);

        const c = await client.insights.getUpgradeCompositionChanges({});
        setCompositionChanges(c);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const compositionData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {};
    for (const c of compositionChanges) {
      if (!byMonth[c.month]) byMonth[c.month] = {};
      const key = c.eventType ?? "unknown";
      byMonth[c.month][key] = (byMonth[c.month][key] ?? 0) + c.count;
    }
    return Object.entries(byMonth)
      .map(([month, types]) => ({ month, ...types }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [compositionChanges]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    compositionChanges.forEach((c) => types.add(c.eventType ?? "unknown"));
    return Array.from(types);
  }, [compositionChanges]);

  const eventColors = ["#34d399", "#ef4444", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href="/insights" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />Back to Insights
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">Upgrade Insights</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">What shipped, why, and what changed.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
        ) : (
          <>
            {/* Upgrade Timeline */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Upgrade Timeline</h3>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700/50" />

                <div className="space-y-6">
                  {upgrades.map((upgrade) => (
                    <div key={upgrade.id} className="flex gap-4">
                      <div className="relative z-10 shrink-0">
                        <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                          <Rocket className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 p-4 flex-1">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                            {upgrade.name || upgrade.slug}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{upgrade.createdAt ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            {upgrade.eipCount} EIP{upgrade.eipCount !== 1 ? "s" : ""}
                          </span>
                          {upgrade.metaEip && (
                            <span className="text-slate-600 dark:text-slate-400">
                              Meta: EIP-{upgrade.metaEip}
                            </span>
                          )}
                          <Link
                            href={`/upgrade/${upgrade.slug}`}
                            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                          >
                            View details <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upgrades.length === 0 && <p className="text-slate-600 dark:text-slate-400 text-sm pl-14">No upgrade data available</p>}
                </div>
              </div>
            </div>

            {/* Composition Changes Over Time */}
            {compositionData.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Composition Changes Over Time</h3>
                <ChartContainer
                  config={Object.fromEntries(eventTypes.map((t, i) => [t, { label: t, color: eventColors[i % eventColors.length] }])) as ChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart data={compositionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => v.slice(2)} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {eventTypes.map((t, i) => (
                      <Bar key={t} dataKey={t} stackId="a" fill={eventColors[i % eventColors.length]} name={t} />
                    ))}
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
