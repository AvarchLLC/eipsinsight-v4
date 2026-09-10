'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { ChartInfo } from '@/components/aa/chart-info';
import { AA_BRUSH, usdCompact, usdFull, typeColor , type NetRange } from '@/components/aa/chart-kit';
import type { TxComposition } from '@/server/orpc/procedures/network';

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

type Mode = 'volume' | 'value';
const MODES: { key: Mode; label: string }[] = [
  { key: 'volume', label: 'Volume' },
  { key: 'value', label: 'Value ($)' },
];

/**
 * L1 transaction composition: every mainnet transaction split into plain
 * transfers, contract calls, blob transactions, and set-code (EIP-7702) each
 * month. Toggle between Volume (transaction count) and Value (fees paid in USD).
 * Reads the pre-aggregated network.getTxComposition rollup.
 */
export function L1CompositionChart({ range }: { range: NetRange }) {
  const [data, setData] = useState<TxComposition | null>(null);
  const [mode, setMode] = useState<Mode>('volume');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxComposition(range)
      .then((s) => {
        if (!cancelled && s && s.buckets.length && s.series.length) setData(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const { rows, labels } = useMemo(() => {
    if (!data) return { rows: [] as Array<Record<string, number | string>>, labels: [] as string[] };
    const labels = data.series.map((x) => x.label);
    const rows = data.buckets.map((b, i) => {
      const row: Record<string, number | string> = { bucket: fmtBucket(b) };
      for (const x of data.series) row[x.label] = (mode === 'value' ? x.usd[i] : x.counts[i]) ?? 0;
      return row;
    });
    return { rows, labels };
  }, [data, mode]);

  const hasData = rows.some((r) => labels.some((l) => (r[l] as number) > 0));
  const yFmt = mode === 'value' ? usdCompact : compact;
  const yLabel = mode === 'value' ? 'Fees paid (USD, per month)' : 'Transactions (txns, per month)';
  const valFmt = (v: number) => (mode === 'value' ? usdFull(v) : v.toLocaleString('en-US'));

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">L1 transaction composition <ChartInfo text="Every mainnet transaction split by what it does: plain transfers, contract calls, blob transactions, and set-code (EIP-7702), per month. Volume counts transactions; Value shows the fees each class paid in USD." /></p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mainnet transactions by what they do, per month: transfers, contract calls, blobs, set-code.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-card/60 p-0.5 text-[11px]">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                'rounded-md px-2 py-1 font-medium transition-colors',
                mode === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[320px]">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center">
            <InlineBrandLoader />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
            {mode === 'value' ? 'Fee value data is unavailable for this range.' : 'Composition data is being aggregated. Run the tx rollup backfill to populate history.'}
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
                  tickFormatter={yFmt}
                  label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [valFmt(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {labels.map((label) => (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stackId="comp"
                    stroke={typeColor(label)}
                    fill={typeColor(label)}
                    fillOpacity={0.8}
                    strokeWidth={0}
                    isAnimationActive={false}
                  />
                ))}
                <Brush dataKey="bucket" {...AA_BRUSH} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {mode === 'value'
          ? 'Value is the fees each transaction class paid, in USD. Live from mainnet.'
          : 'Contract calls and plain transfers dominate; blob and set-code are new transaction classes. Live from mainnet.'}
      </p>
    </div>
  );
}

