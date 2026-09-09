'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Brush,
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { AA_BRUSH, usdCompact, usdFull, typeColor } from '@/components/aa/chart-kit';
import type { TxTypeEconomics } from '@/server/orpc/procedures/network';

const TT_CONTENT = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--foreground)',
} as const;

// Value = fees paid in USD; Volume = number of transactions; plus gas and reliability.
type Metric = 'value' | 'volume' | 'gas' | 'fail';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'value', label: 'Value ($)' },
  { key: 'volume', label: 'Volume' },
  { key: 'gas', label: 'Gas' },
  { key: 'fail', label: 'Fail rate' },
];

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${Math.round(n)}`;

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Per-transaction-type economics, month by month, from the pre-aggregated
 * network.getTxTypeEconomics rollup. A single toggle switches what's measured:
 * Value (fees paid in USD), Volume (transaction count), Gas used, or Failure
 * rate. Value/Volume/Gas stack; failure rate is a per-type line.
 */
export function TxEconomicsChart({ months = 24 }: { months?: number }) {
  const [data, setData] = useState<TxTypeEconomics | null>(null);
  const [metric, setMetric] = useState<Metric>('value');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxTypeEconomics({ months })
      .then((s) => {
        if (!cancelled && s && s.types.length) setData(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  const { rows, labels } = useMemo(() => {
    if (!data) return { rows: [] as Array<Record<string, number | string>>, labels: [] as string[] };
    const labels = data.types.map((t) => t.label);
    const rows = data.buckets.map((b, i) => {
      const row: Record<string, number | string> = { bucket: fmtBucket(b) };
      for (const t of data.types) {
        row[t.label] =
          metric === 'value'
            ? Math.round(t.feesUsd[i] ?? 0)
            : metric === 'volume'
              ? t.count[i] ?? 0
              : metric === 'gas'
                ? t.gasUsed[i] ?? 0
                : t.count[i] > 0
                  ? Math.round(((t.failed[i] ?? 0) / t.count[i]) * 10000) / 100
                  : 0;
      }
      return row;
    });
    return { rows, labels };
  }, [data, metric]);

  const hasData = rows.some((r) => labels.some((l) => (r[l] as number) > 0));
  const yFmt =
    metric === 'fail' ? (v: number) => `${v}%` : metric === 'value' ? usdCompact : compact;
  const yLabel =
    metric === 'value'
      ? 'Fees paid (USD)'
      : metric === 'volume'
        ? 'Transactions (txns)'
        : metric === 'gas'
          ? 'Gas used (gas units)'
          : 'Failure rate (%)';
  const yAxisLabel = { value: yLabel, angle: -90 as const, position: 'insideLeft' as const, style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' as const } };
  const valFmt = (v: number) =>
    metric === 'fail'
      ? `${v}%`
      : metric === 'value'
        ? usdFull(v)
        : metric === 'volume'
          ? `${v.toLocaleString('en-US')} txns`
          : `${v.toLocaleString('en-US')} gas`;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Economics by transaction type <ChartInfo text="Split by transaction type per month. Value is fees paid in USD, Volume is the transaction count, Gas is gas used, and Fail rate is the share that reverted. Use the toggle to switch." /></p>
          <p className="mt-0.5 text-xs text-muted-foreground">Value ($), volume, gas, and reliability split by transaction type, per month.</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-card/60 p-0.5 text-[11px]">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                'rounded-md px-2 py-1 font-medium transition-colors',
                metric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
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
            Economics data is being aggregated. Run the tx rollup backfill to populate history.
          </div>
        ) : (
          <>
            <ChartWatermark position="center" />
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'fail' ? (
                <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={58} tickFormatter={yFmt} label={yAxisLabel} />
                  <Tooltip contentStyle={TT_CONTENT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number, n: string) => [valFmt(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  {labels.map((label) => (
                    <Line key={label} type="monotone" dataKey={label} stroke={typeColor(label)} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                  <Brush dataKey="bucket" {...AA_BRUSH} />
                </LineChart>
              ) : (
                <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={58} tickFormatter={yFmt} label={yAxisLabel} />
                  <Tooltip contentStyle={TT_CONTENT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number, n: string) => [valFmt(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  {labels.map((label) => (
                    <Area key={label} type="monotone" dataKey={label} stackId="econ" stroke={typeColor(label)} fill={typeColor(label)} fillOpacity={0.8} strokeWidth={0} isAnimationActive={false} />
                  ))}
                  <Brush dataKey="bucket" {...AA_BRUSH} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Value is fees paid in USD; volume is the transaction count; gas shows resource use; fail rate shows reliability. Live from mainnet.
      </p>
    </div>
  );
}

