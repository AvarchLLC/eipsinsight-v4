'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { client } from '@/lib/orpc';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { ChartWatermark } from '@/components/chart-watermark';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { ChartInfo } from '@/components/aa/chart-info';

const COLORS: Record<string, string> = {
  'Contract calls': 'var(--chart-1)',
  'Plain transfers': 'var(--chart-2)',
  'Blob (EIP-4844)': 'var(--chart-4)',
  'Set-code (EIP-7702)': 'var(--chart-6)',
};

const TT_CONTENT = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--foreground)',
} as const;

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * L1 transaction composition: every mainnet transaction split into plain
 * transfers, contract calls, blob transactions, and set-code (EIP-7702) each
 * month. A richer ecosystem story than raw TPS. Reads the pre-aggregated
 * network.getTxComposition rollup.
 */
export function L1CompositionChart({ months = 24 }: { months?: number }) {
  const [rows, setRows] = useState<Array<Record<string, number | string>>>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxComposition({ months })
      .then((s) => {
        if (cancelled || !s || !s.buckets.length || !s.series.length) return;
        setLabels(s.series.map((x) => x.label));
        setRows(
          s.buckets.map((b, i) => {
            const row: Record<string, number | string> = { bucket: fmtBucket(b) };
            for (const x of s.series) row[x.label] = x.counts[i] ?? 0;
            return row;
          }),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  const hasData = rows.some((r) => labels.some((l) => (r[l] as number) > 0));

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">L1 transaction composition <ChartInfo text="Every mainnet transaction split by what it does: plain transfers, contract calls, blob transactions, and set-code (EIP-7702), per month. A truer picture than raw TPS." /></p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Mainnet transactions by what they do, per month: transfers, contract calls, blobs, set-code.
        </p>
      </div>

      <div className="relative h-[320px]">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center">
            <InlineBrandLoader />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Composition data is being aggregated. Run the tx rollup backfill to populate history.
          </div>
        ) : (
          <>
            <ChartWatermark position="center" />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={compact}
                  label={{ value: 'Transactions (per month)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [v.toLocaleString('en-US'), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {labels.map((label) => (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stackId="comp"
                    stroke={COLORS[label] ?? 'var(--chart-3)'}
                    fill={COLORS[label] ?? 'var(--chart-3)'}
                    fillOpacity={0.8}
                    strokeWidth={0}
                    isAnimationActive={false}
                  />
                ))}
                              <Brush dataKey="bucket" height={16} travellerWidth={8} stroke="var(--chart-3)" fill="transparent" tickFormatter={() => ""} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Contract calls and plain transfers dominate; blob and set-code volumes are new transaction classes. Live from mainnet.
      </p>
    </div>
  );
}
