'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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

const C_TX = 'var(--chart-4)';
const C_PER = 'var(--chart-2)';

const TT_CONTENT = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--foreground)',
} as const;

const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`);

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Blob usage (EIP-4844): blob transactions per month and average blobs per
 * transaction, so L2 data-availability demand and its intensity are both
 * visible. Reads network.getBlobStats.
 */
export function BlobUsageChart({ months = 24 }: { months?: number }) {
  const [rows, setRows] = useState<Array<{ bucket: string; blobTx: number; blobsPerTx: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getBlobStats({ months })
      .then((s) => {
        if (cancelled || !s || !s.buckets.length) return;
        setRows(s.buckets.map((b, i) => ({ bucket: fmtBucket(b), blobTx: s.blobTx[i] ?? 0, blobsPerTx: s.blobsPerTx[i] ?? 0 })));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  const hasData = rows.some((r) => r.blobTx > 0);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Blob usage (EIP-4844) <ChartInfo text="EIP-4844 blob usage: bars are blob transactions per month (L2 data-availability demand); the line is average blobs per transaction (how much data each carries)." /></p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Blob transactions per month (bars) and average blobs per transaction (line): L2 data-availability demand and its intensity.
        </p>
      </div>

      <div className="relative h-[280px]">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center">
            <InlineBrandLoader />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            Blob data is being aggregated. Run the tx rollup backfill to populate history.
          </div>
        ) : (
          <>
            <ChartWatermark position="center" />
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  yAxisId="tx"
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={compact}
                  label={{ value: 'Blob transactions', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <YAxis
                  yAxisId="per"
                  orientation="right"
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  domain={[0, 6]}
                  tickFormatter={(v) => `${v}`}
                  label={{ value: 'Blobs per tx', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [name === 'Blobs per tx' ? v.toFixed(2) : v.toLocaleString('en-US'), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar yAxisId="tx" dataKey="blobTx" name="Blob transactions" fill={C_TX} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Line yAxisId="per" type="monotone" dataKey="blobsPerTx" name="Blobs per tx" stroke={C_PER} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        More blob transactions means more L2 activity; more blobs per transaction means each one carries more data. Live from mainnet.
      </p>
    </div>
  );
}
