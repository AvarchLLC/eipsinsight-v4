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
import { ChartInfo } from '@/components/aa/chart-info';

// Stable colour per transaction type (keyed by the label the procedure returns).
const COLORS: Record<string, string> = {
  'EIP-1559': 'var(--chart-1)',
  Legacy: 'var(--chart-8)',
  'EIP-4844': 'var(--chart-4)',
  'EIP-7702': 'var(--chart-2)',
  'EIP-2930': 'var(--chart-6)',
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

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ym
    : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Transaction Type Market Share: the share of all mainnet transactions using
 * each typed-transaction format, month by month. Answers "how fast does each new
 * transaction standard take over?" Data from BlobLens via network.getTxTypeSeries.
 */
export function TxTypeShareChart({ months = 24 }: { months?: number }) {
  const [rows, setRows] = useState<Array<Record<string, number | string>>>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxTypeSeries({ months })
      .then((s) => {
        if (cancelled || !s || !s.buckets.length || !s.series.length) return;
        // Order legend/stack largest-first (procedure already sorts series desc).
        setLabels(s.series.map((t) => t.label));
        setRows(
          s.buckets.map((b, i) => {
            const total = s.series.reduce((a, t) => a + (t.counts[i] ?? 0), 0) || 1;
            const row: Record<string, number | string> = { bucket: fmtBucket(b) };
            for (const t of s.series) row[t.label] = ((t.counts[i] ?? 0) / total) * 100;
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

  const hasData = rows.length > 1;

  const stackOrder = useMemo(
    // Stack smallest-first so the tiny types stay visible at the bottom.
    () => [...labels].reverse(),
    [labels],
  );

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Transaction type market share <ChartInfo text="Share of every mainnet transaction by its format (Legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702) each month, stacked to 100 percent. Shows how fast each new standard takes over." /></p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Share of all mainnet transactions by typed-transaction format, per month.
        </p>
      </div>

      <div className="relative h-[320px]">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center">
            <InlineBrandLoader />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Transaction data is temporarily unavailable.
          </div>
        ) : (
          <>
            <ChartWatermark position="center" />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} stackOffset="none">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={(v) => `${Math.round(v)}%`}
                  label={{ value: '% of transactions', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {stackOrder.map((label) => (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stackId="share"
                    stroke={COLORS[label] ?? 'var(--chart-3)'}
                    fill={COLORS[label] ?? 'var(--chart-3)'}
                    fillOpacity={0.85}
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
        EIP-1559 dominates; watch EIP-4844 (blobs) and EIP-7702 (set-code) climb from the baseline. Live from mainnet.
      </p>
    </div>
  );
}
