'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Brush,
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
import { ChartInfo } from '@/components/aa/chart-info';

const C_LEGACY = 'var(--chart-8)';
const C_1559 = 'var(--chart-1)';
const C_OTHER = 'var(--chart-4)';

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
  return Number.isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Typed-transaction migration: the share of mainnet transactions that are
 * Legacy, EIP-1559, and other typed formats (EIP-2718 envelope), month by month.
 * Covers "legacy vs typed" and "EIP-1559 adoption" in one view. Reads the
 * existing network.getTxTypeSeries.
 */
export function TxMigrationChart({ months = 24 }: { months?: number }) {
  const [rows, setRows] = useState<Array<{ bucket: string; Legacy: number; 'EIP-1559': number; 'Other typed': number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxTypeSeries({ months })
      .then((s) => {
        if (cancelled || !s || !s.buckets.length || !s.series.length) return;
        const find = (label: string) => s.series.find((t) => t.label === label)?.counts ?? new Array(s.buckets.length).fill(0);
        const legacy = find('Legacy');
        const c1559 = find('EIP-1559');
        setRows(
          s.buckets.map((b, i) => {
            const total = s.series.reduce((a, t) => a + (t.counts[i] ?? 0), 0) || 1;
            const leg = ((legacy[i] ?? 0) / total) * 100;
            const dyn = ((c1559[i] ?? 0) / total) * 100;
            return {
              bucket: fmtBucket(b),
              Legacy: Math.round(leg * 10) / 10,
              'EIP-1559': Math.round(dyn * 10) / 10,
              'Other typed': Math.round((100 - leg - dyn) * 10) / 10,
            };
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
  const lines = useMemo(() => [
    { key: 'EIP-1559', color: C_1559 },
    { key: 'Legacy', color: C_LEGACY },
    { key: 'Other typed', color: C_OTHER },
  ], []);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Typed-transaction migration <ChartInfo text="The shift to typed transactions since EIP-2718. Each line is a format's share of all transactions: legacy falling, EIP-1559 dominant, newer formats rising." /></p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Share of mainnet transactions by format since EIP-2718: legacy falling, EIP-1559 dominant, newer typed formats rising.
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
              <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
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
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {lines.map((l) => (
                  <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                ))}
                              <Brush dataKey="bucket" height={16} travellerWidth={8} stroke="var(--chart-3)" fill="transparent" tickFormatter={() => ""} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Every non-legacy format is a typed EIP-2718 transaction. EIP-1559 carries most traffic; EIP-4844 and EIP-7702 are the newest entrants. Live from mainnet.
      </p>
    </div>
  );
}
