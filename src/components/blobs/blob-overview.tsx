'use client';

import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, Database, DollarSign, Fuel, Gauge, Layers, TrendingUp } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { BlobOverview as BlobOverviewData } from '@/server/orpc/procedures/blob';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { usdCompact } from '@/components/aa/chart-kit';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import {
  CHART_TOOLTIP,
  ChartCard,
  Metric,
  bucketFormatter,
  compactNum,
  forkMarkers,
  rangeKey,
  type Range,
} from './blob-shared';

export function BlobOverviewTab({ range, onBounds }: { range: Range; onBounds?: (b: { min: string; max: string }) => void }) {
  const [data, setData] = useState<BlobOverviewData | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const dep = rangeKey(range);

  useEffect(() => {
    let cancelled = false;
    client.blob
      .getOverview(range)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoadedKey(dep);
        if (d.available && onBounds) onBounds({ min: d.dataMin, max: d.dataMax });
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
        Live blob metrics are not available right now. The data source (BlobLens) may be unreachable.
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric icon={Boxes} accent="text-blue-500" label="Total blobs" value={compactNum(data.totalBlobs)} />
        <Metric icon={Database} accent="text-violet-500" label="DA data" value={`${compactNum(data.totalDataGb)} GB`} />
        <Metric icon={DollarSign} accent="text-emerald-500" label="DA spend" value={usdCompact(data.totalDaSpendUsd)} />
        <Metric icon={Layers} accent="text-cyan-500" label="Avg blobs/block" value={data.avgBlobsPerBlock.toFixed(2)} />
        <Metric icon={Fuel} accent="text-amber-500" label="Avg blob fee" value={data.avgFeeGwei.toFixed(4)} sub="gwei" />
        <Metric icon={Gauge} accent="text-rose-500" label="Avg utilization" value={`${data.avgUtilPct.toFixed(0)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Blob throughput" sub="blobs per bucket" icon={TrendingUp}>
          <Trend data={data} kind="volume" />
        </ChartCard>
        <ChartCard title="Blob base fee" sub="gwei, avg per bucket" icon={Fuel}>
          <Trend data={data} kind="fee" />
        </ChartCard>
        <ChartCard title="Blob utilization" sub="% of blob cap used" icon={Gauge}>
          <Trend data={data} kind="util" />
        </ChartCard>
        <ChartCard title="Cost per blob" sub="USD, avg per bucket" icon={DollarSign}>
          <Trend data={data} kind="cost" />
        </ChartCard>
      </div>

      <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Source: <span className="font-medium text-foreground">BlobLens</span> ClickHouse index, from the Dencun
        activation (EIP-4844, Mar 13 2024). One blob carries 128&nbsp;KiB of data; DA spend prices the blob base fee by
        the daily ETH/USD rate. Fee &amp; cost figures exclude a corrupted source window (early 2026) with implausible
        recorded fees; throughput and utilization use all blocks.
      </p>
    </div>
  );
}

function Trend({ data, kind }: { data: BlobOverviewData; kind: 'volume' | 'fee' | 'util' | 'cost' }) {
  const fmt = bucketFormatter(data.granularity);
  const markers = forkMarkers(data.series, data.from, data.to);
  const common = [
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />,
    <XAxis
      key="x"
      dataKey="bucket"
      tickFormatter={fmt}
      tick={{ fill: CHART_AXIS, fontSize: 10 }}
      tickLine={false}
      axisLine={false}
      minTickGap={28}
    />,
    <Tooltip key="tip" contentStyle={CHART_TOOLTIP} labelFormatter={(v) => fmt(String(v))} />,
    ...markers.map((m) => (
      <ReferenceLine
        key={m.label}
        x={m.x}
        stroke="var(--muted-foreground)"
        strokeDasharray="3 3"
        strokeOpacity={0.6}
        label={{ value: m.label, position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 9 }}
      />
    )),
  ];

  if (kind === 'volume') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="blobVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => compactNum(Number(v))} />
          <Area type="monotone" dataKey="blobs" name="Blobs" stroke="#3b82f6" fill="url(#blobVol)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'fee') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => Number(v).toFixed(3)} />
          <Line type="monotone" dataKey="feeGwei" name="Base fee (gwei)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'util') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="blobUtil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={40} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Area type="monotone" dataKey="utilPct" name="Utilization %" stroke="#f43f5e" fill="url(#blobUtil)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        {common}
        <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
        <Line type="monotone" dataKey="costUsdPerBlob" name="Cost / blob (USD)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
