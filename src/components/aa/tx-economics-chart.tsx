'use client';

import { useEffect, useMemo, useState } from 'react';
import {
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
import type { TxTypeEconomics } from '@/server/orpc/procedures/network';

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

type Metric = 'gas' | 'fees' | 'fail';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'gas', label: 'Gas used' },
  { key: 'fees', label: 'Fees (ETH)' },
  { key: 'fail', label: 'Failure rate' },
];

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${Math.round(n)}`;

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Per-transaction-type economics: gas used, fees paid (ETH), and failure rate,
 * month by month, from the pre-aggregated network.getTxTypeEconomics rollup.
 * Toggle picks the metric. Gas and fees stack; failure rate is a per-type line.
 */
export function TxEconomicsChart({ months = 24 }: { months?: number }) {
  const [data, setData] = useState<TxTypeEconomics | null>(null);
  const [metric, setMetric] = useState<Metric>('fees');
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
          metric === 'gas'
            ? t.gasUsed[i]
            : metric === 'fees'
              ? Math.round((t.feesEth[i] ?? 0) * 100) / 100
              : t.count[i] > 0
                ? Math.round(((t.failed[i] ?? 0) / t.count[i]) * 10000) / 100
                : 0;
      }
      return row;
    });
    return { rows, labels };
  }, [data, metric]);

  const hasData = rows.some((r) => labels.some((l) => (r[l] as number) > 0));
  const yFmt = metric === 'fail' ? (v: number) => `${v}%` : compact;
  const yLabel = metric === 'gas' ? 'Gas used (gas units)' : metric === 'fees' ? 'Fees (ETH)' : 'Failure rate (%)';
  const yAxisLabel = { value: yLabel, angle: -90 as const, position: 'insideLeft' as const, style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' as const } };
  const valFmt = (v: number) => (metric === 'fail' ? `${v}%` : metric === 'fees' ? `${v.toLocaleString('en-US')} ETH` : `${v.toLocaleString('en-US')} gas`);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Economics by transaction type <ChartInfo text="Gas used, fees paid in ETH, and failure rate, split by transaction type per month. Use the toggle to switch metric." /></p>
          <p className="mt-0.5 text-xs text-muted-foreground">Gas, fees, and reliability split by transaction type, per month.</p>
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

      <div className="relative h-[280px]">
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
                    <Line key={label} type="monotone" dataKey={label} stroke={COLORS[label] ?? 'var(--chart-3)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={58} tickFormatter={yFmt} label={yAxisLabel} />
                  <Tooltip contentStyle={TT_CONTENT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} formatter={(v: number, n: string) => [valFmt(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  {labels.map((label) => (
                    <Area key={label} type="monotone" dataKey={label} stackId="econ" stroke={COLORS[label] ?? 'var(--chart-3)'} fill={COLORS[label] ?? 'var(--chart-3)'} fillOpacity={0.8} strokeWidth={0} isAnimationActive={false} />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Gas and fees show each type&apos;s share of network resources; failure rate shows reliability differences. Live from mainnet.
      </p>
    </div>
  );
}
