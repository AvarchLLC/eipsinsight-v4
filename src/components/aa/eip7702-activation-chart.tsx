'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
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
import { AA_BRUSH } from '@/components/aa/chart-kit';

const C = 'var(--chart-1)';

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

// Months after Pectra that approximate the 30 / 90 / 180 / 365 day marks.
const MARKS: { month: number; label: string }[] = [
  { month: 1, label: '~30d' },
  { month: 3, label: '~90d' },
  { month: 6, label: '~180d' },
  { month: 12, label: '~1y' },
];

/**
 * EIP-7702 adoption after activation: cumulative 7702 transactions indexed to
 * months since the Pectra activation, so adoption speed is readable and can be
 * compared against future feature launches. Reads aa.getUsageStats since Pectra.
 */
export function Eip7702ActivationChart() {
  const [rows, setRows] = useState<Array<{ m: number; label: string; cumulative: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Read the fast daily rollup (7702 = tx_type 4), not the slow uniq-scan usage
    // query, so this loads instantly and reliably. Buckets from Pectra onward.
    client.network
      .getTxTypeEconomics({ months: 24 })
      .then((s) => {
        if (cancelled || !s || !s.types.length) return;
        const t7702 = s.types.find((t) => t.txType === 4);
        if (!t7702) return;
        const start = s.buckets.findIndex((b) => b >= '2025-05');
        if (start < 0) return;
        let total = 0;
        const out: Array<{ m: number; label: string; cumulative: number }> = [];
        for (let i = start; i < s.buckets.length; i++) {
          total += t7702.count[i] ?? 0;
          out.push({ m: i - start, label: `M${i - start}`, cumulative: total });
        }
        setRows(out);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasData = rows.length > 1;
  const maxMonth = hasData ? rows[rows.length - 1].m : 0;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">EIP-7702 adoption after activation <ChartInfo text="How fast EIP-7702 was taken up after going live in Pectra. Cumulative 7702 transactions by months since activation, with dashed marks near 30, 90, 180, and 365 days." /></p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cumulative 7702 transactions by months since Pectra, so adoption speed is comparable across feature launches.
        </p>
      </div>

      <div className="relative h-[320px]">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center">
            <InlineBrandLoader />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Adoption data is temporarily unavailable.
          </div>
        ) : (
          <>
            <ChartWatermark position="center" />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad7702act" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                <XAxis
                  dataKey="m"
                  type="number"
                  domain={[0, maxMonth]}
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `M${v}`}
                  label={{ value: 'Months since Pectra', position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: CHART_AXIS } }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={compact}
                  label={{ value: 'Cumulative transactions', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  labelFormatter={(v) => `Month ${v} since Pectra`}
                  formatter={(v: number) => [v.toLocaleString('en-US'), 'Cumulative 7702 txs']}
                />
                {MARKS.filter((mk) => mk.month <= maxMonth).map((mk) => (
                  <ReferenceLine
                    key={mk.month}
                    x={mk.month}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                    label={{ value: mk.label, position: 'top', style: { fontSize: 10, fill: 'var(--muted-foreground)' } }}
                  />
                ))}
                <Area type="monotone" dataKey="cumulative" stroke={C} strokeWidth={2} fill="url(#grad7702act)" dot={false} isAnimationActive={false} />
                              <Brush dataKey="m" {...AA_BRUSH} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Dashed lines mark roughly 30, 90, 180, and 365 days after activation. Live from mainnet.
      </p>
    </div>
  );
}

