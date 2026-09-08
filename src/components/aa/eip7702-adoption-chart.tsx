'use client';

import { useEffect, useState } from 'react';
import {
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

const C_ACCT = 'var(--chart-2)'; // green: unique delegated accounts
const C_TX = 'var(--chart-1)'; // blue: 7702 transactions

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
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;

function fmtBucket(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ym
    : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * EIP-7702 account adoption: how many distinct accounts have taken on delegated
 * (set-code) behavior each month, alongside the number of 7702 transactions.
 * Distinguishes real adoption breadth (accounts) from raw activity (transactions).
 */
export function Eip7702AdoptionChart() {
  const [rows, setRows] = useState<Array<{ bucket: string; accounts: number; txs: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.aa
      .getUsageStats({ granularity: 'month', from: '2025-05-01' })
      .then((s) => {
        if (cancelled || !s || !s.series.length) return;
        setRows(
          s.series.map((r) => ({
            bucket: fmtBucket(r.bucket.slice(0, 7)),
            accounts: r.accounts7702,
            txs: r.aa7702,
          })),
        );
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

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">EIP-7702 account adoption</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Distinct delegated accounts vs total 7702 transactions each month, since Pectra.
        </p>
      </div>

      <div className="relative h-[280px]">
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
              <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} opacity={0.4} vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART_AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={compact}
                  label={{ value: 'Count (per month)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: CHART_AXIS, textAnchor: 'middle' } }}
                />
                <Tooltip
                  contentStyle={TT_CONTENT}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                  formatter={(v: number, name: string) => [v.toLocaleString('en-US'), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line type="monotone" dataKey="accounts" name="Delegated accounts" stroke={C_ACCT} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="txs" name="7702 transactions" stroke={C_TX} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Accounts measure how many EOAs actually delegate; transactions measure how active they are. Live from mainnet.
      </p>
    </div>
  );
}
