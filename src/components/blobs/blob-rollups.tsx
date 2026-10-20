'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, Gauge, Layers, Package } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { BlobRollupEfficiency, RollupEfficiency } from '@/server/orpc/procedures/blob';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { usdCompact } from '@/components/aa/chart-kit';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';
import { CHART_TOOLTIP, ChartCard, L2Icon, ROLLUP_COLORS, compactNum, rangeKey, type Range } from './blob-shared';

const fillClass = (p: number | null) =>
  p == null
    ? 'text-muted-foreground'
    : p >= 90
      ? 'text-emerald-600 dark:text-emerald-400'
      : p >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

export function BlobRollupsTab({ range }: { range: Range }) {
  const [data, setData] = useState<BlobRollupEfficiency | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const dep = rangeKey(range);

  useEffect(() => {
    let cancelled = false;
    client.blob
      .getRollupEfficiency(range)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedKey(dep);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  const loading = !data || loadedKey !== dep;

  if (data && !data.available && !loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
        Rollup DA metrics are not available right now.
      </div>
    );
  }
  if (loading || !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60">
        <InlineBrandLoader />
      </div>
    );
  }

  const named = data.rollups.filter((r) => r.rollup.toLowerCase() !== 'unknown');
  const byBatching = [...named].sort((a, b) => b.blobsPerTx - a.blobsPerTx).slice(0, 10);
  const byFullness = [...named]
    .filter((r) => r.fullnessPct != null)
    .sort((a, b) => (b.fullnessPct ?? 0) - (a.fullnessPct ?? 0))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 text-[12px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Rollup DA cost-efficiency.</span> How economically each rollup
        uses Ethereum for data availability. <span className="font-medium text-foreground">Batching</span> (blobs per
        tx) and <span className="font-medium text-foreground">blob fill</span> (how full each 128&nbsp;KiB blob is)
        together show packing quality; <span className="font-medium text-foreground">cost per MB used</span> is what a
        rollup actually pays per megabyte of real data, after padding. A rollup posting near-empty blobs pays far more
        per useful byte even if its headline fee is small.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Batching efficiency"
          sub="blobs per batch tx"
          icon={Package}
          info="More blobs per transaction = fewer per-tx overheads amortized over more data. Higher is more efficient."
        >
          <HBar data={byBatching} dataKey="blobsPerTx" fmt={(v) => v.toFixed(1)} />
        </ChartCard>
        <ChartCard
          title="Blob fill"
          sub="% of 128 KiB used"
          icon={Gauge}
          info="Real blob fullness from Blobscan (usageSize ÷ capacity). Low fill means a rollup pays for space it doesn't use — the clearest packing-efficiency signal."
        >
          <HBar data={byFullness} dataKey="fullnessPct" fmt={(v) => `${v.toFixed(0)}%`} />
        </ChartCard>
      </div>

      {/* Leaderboard */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Boxes className="h-4 w-4 text-primary" /> Rollup DA leaderboard
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {compactNum(data.totalBlobs)} blobs · {usdCompact(data.totalCostUsd)} DA spend
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-semibold">#</th>
                <th className="px-2 py-2.5 text-left font-semibold">Rollup</th>
                <th className="px-3 py-2.5 text-right font-semibold">Blobs</th>
                <th className="px-3 py-2.5 text-right font-semibold">Batch txs</th>
                <th className="px-3 py-2.5 text-right font-semibold" title="Blobs per batch tx">Blobs/tx</th>
                <th className="px-3 py-2.5 text-right font-semibold" title="Avg blob fill (Blobscan)">Fill</th>
                <th className="px-3 py-2.5 text-right font-semibold">DA data</th>
                <th className="px-3 py-2.5 text-right font-semibold">DA cost</th>
                <th className="px-3 py-2.5 text-right font-semibold" title="DA cost per MB of data actually used">Cost/MB used</th>
                <th className="px-4 py-2.5 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.rollups.map((r, i) => (
                <tr key={r.rollup} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2.5 text-left font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <L2Icon name={r.rollup} size={18} color={ROLLUP_COLORS[i % ROLLUP_COLORS.length]} />
                      <span className="font-medium text-foreground">{r.rollup}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{compactNum(r.blobs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{compactNum(r.txs)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">{r.blobsPerTx.toFixed(1)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-mono tabular-nums', fillClass(r.fullnessPct))}>
                    {r.fullnessPct != null ? `${r.fullnessPct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{compactNum(r.dataGb)} GB</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">{usdCompact(r.totalCostUsd)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {r.costPerUsedMbUsd != null ? `$${r.costPerUsedMbUsd.toFixed(3)}` : r.costPerMbUsd > 0 ? `$${r.costPerMbUsd.toFixed(3)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-foreground">{r.sharePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Sources &amp; coverage.</span> Blob counts, txs and DA spend are
        from the BlobLens index (batcher addresses mapped to rollups; DA spend priced by the daily ETH/USD rate,
        corrupted-fee blocks excluded). <span className="font-medium text-foreground">Fill</span> is real blob fullness
        from <a href="https://blobscan.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Blobscan</a>{' '}
        (recent sample per rollup), which turns cost-per-MB into cost-per-MB <em>used</em>. Rollups Blobscan doesn&apos;t
        label show &quot;—&quot;. Amortized DA cost per L2 transaction still needs per-rollup L2 tx counts (no free
        source yet). <Layers className="inline h-3 w-3" />
      </p>
    </div>
  );
}

function HBar({
  data,
  dataKey,
  fmt,
}: {
  data: RollupEfficiency[];
  dataKey: 'blobsPerTx' | 'costPerMbUsd' | 'fullnessPct';
  fmt: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
        <XAxis type="number" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} />
        <YAxis type="category" dataKey="rollup" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={92} />
        <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v: number) => [fmt(Number(v)), '']} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={ROLLUP_COLORS[i % ROLLUP_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
