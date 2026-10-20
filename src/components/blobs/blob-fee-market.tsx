'use client';

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Fuel, Gauge as GaugeIcon, Layers, TrendingUp, Zap } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { BlobFeeMarket, BlobRegime } from '@/server/orpc/procedures/blob';
import { CHART_AXIS, CHART_GRID } from '@/lib/chart-colors';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';
import { CHART_TOOLTIP, ChartCard } from './blob-shared';

const REGIME_STYLE: Record<BlobRegime, { color: string; bg: string; ring: string }> = {
  undersaturated: { color: '#06b6d4', bg: 'bg-cyan-500/10', ring: 'border-cyan-500/40' },
  healthy: { color: '#10b981', bg: 'bg-emerald-500/10', ring: 'border-emerald-500/40' },
  congested: { color: '#f59e0b', bg: 'bg-amber-500/10', ring: 'border-amber-500/40' },
  spike: { color: '#ef4444', bg: 'bg-red-500/10', ring: 'border-red-500/40' },
};

export function BlobFeeMarketTab() {
  const [data, setData] = useState<BlobFeeMarket | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      client.blob
        .getFeeMarket()
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch(() => {
          if (!cancelled) setData((prev) => prev ?? null);
        });
    load();
    const id = setInterval(load, 60_000); // live view, refresh each minute
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60">
        <InlineBrandLoader />
      </div>
    );
  }
  if (!data.available) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
        The live blob fee market is unavailable right now.
      </div>
    );
  }

  const style = REGIME_STYLE[data.regime];

  return (
    <div className="space-y-4">
      {/* Regime banner + gauge */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn('flex flex-col items-center justify-center rounded-xl border bg-card/60 p-5', style.ring)}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Blob fee gauge</span>
          <Gauge percentile={data.feePercentile} color={style.color} />
          <div className="-mt-1 text-center">
            <div className="font-mono text-xl font-bold tabular-nums text-foreground">{data.curFeeGwei.toFixed(5)}</div>
            <div className="text-[11px] text-muted-foreground">gwei / blob gas</div>
          </div>
        </div>

        <div className={cn('lg:col-span-2 flex flex-col justify-center rounded-xl border bg-card/60 p-5', style.ring)}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold', style.bg)}
              style={{ color: style.color, borderColor: `${style.color}55` }}
            >
              <Activity className="h-3.5 w-3.5" /> {data.regimeLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">
              market regime · fee is at the <span className="font-semibold text-foreground">{data.feePercentile}th percentile</span> of the last 7 days
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.regimeReason}</p>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat icon={Layers} label="Blobs / block" value={data.curBlobsPerBlock.toFixed(2)} sub={`target ${data.targetBlobs} · max ${data.maxBlobs}`} />
            <Stat icon={GaugeIcon} label="Utilization" value={`${data.curUtilPct.toFixed(0)}%`} sub="of blob cap" />
            <Stat icon={Zap} label="Excess blob gas" value={abbr(data.excessBlobGas)} sub="fee pressure" />
            <Stat icon={Fuel} label="Fee percentile" value={`${data.feePercentile}%`} sub="vs 7-day" />
          </div>
        </div>
      </div>

      {/* Recent fee + forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Recent blob fee"
          sub="last ~300 blocks"
          icon={TrendingUp}
          info="Per-block blob base fee over the last hour — the trailing context behind the regime call."
        >
          <RecentChart data={data} color={style.color} />
        </ChartCard>

        <ChartCard
          title="Congestion forecast"
          sub="next 12 blocks"
          icon={Activity}
          info="Deterministic projection of the blob base fee if demand continues at the current rate vs. if every block fills to the cap. Uses EIP-4844's excess-blob-gas fee rule with parameters fit to live data."
        >
          <ForecastChart data={data} color={style.color} />
        </ChartCard>
      </div>

      <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        The blob base fee is <span className="font-mono text-foreground">exp(excess_blob_gas / update_fraction)</span> wei
        (EIP-4844). Excess blob gas rises when blocks run above the target blobs/block and drains below it. We derive the
        update fraction and target empirically from recent blocks, so the model reproduces the live fee and the forecast
        stays correct across BPO fork changes. Live from <span className="font-medium text-foreground">BlobLens</span>,
        refreshed each minute.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function abbr(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

/** 180° semicircle gauge; needle at `percentile` (0–100). */
function Gauge({ percentile, color }: { percentile: number; color: string }) {
  const p = Math.max(0, Math.min(100, percentile));
  const W = 200;
  const H = 108;
  const cx = W / 2;
  const cy = H - 8;
  const r = 84;
  const toXY = (pct: number) => {
    const ang = Math.PI - (pct / 100) * Math.PI; // 180°→0°
    return [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = toXY(from);
    const [x2, y2] = toXY(to);
    const large = to - from > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const [nx, ny] = toXY(p);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px]">
      {/* zone bands */}
      <path d={arc(0, 40)} fill="none" stroke="#06b6d4" strokeWidth={10} strokeLinecap="round" opacity={0.25} />
      <path d={arc(40, 70)} fill="none" stroke="#10b981" strokeWidth={10} opacity={0.25} />
      <path d={arc(70, 90)} fill="none" stroke="#f59e0b" strokeWidth={10} opacity={0.25} />
      <path d={arc(90, 100)} fill="none" stroke="#ef4444" strokeWidth={10} strokeLinecap="round" opacity={0.25} />
      {/* filled arc up to percentile */}
      <path d={arc(0, Math.max(0.5, p))} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--foreground)" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={4} fill="var(--foreground)" />
    </svg>
  );
}

function RecentChart({ data, color }: { data: BlobFeeMarket; color: string }) {
  const series = data.recent.map((r) => ({ x: r.block, fee: r.feeGwei }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="x" tick={{ fill: CHART_AXIS, fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(v) => `#${(Number(v) / 1e6).toFixed(2)}M`} />
        <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => Number(v).toFixed(4)} />
        <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={(v) => `block ${Number(v).toLocaleString()}`} formatter={(v: number) => [`${Number(v).toFixed(6)} gwei`, 'fee']} />
        <Line type="monotone" dataKey="fee" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ForecastChart({ data, color }: { data: BlobFeeMarket; color: string }) {
  const series = [
    { step: 0, current: data.curFeeGwei, full: data.curFeeGwei },
    ...data.forecast.map((f) => ({ step: f.step, current: f.currentRateGwei, full: f.fullRateGwei })),
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="step" tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v === 0 ? 'now' : `+${v}`)} />
        <YAxis tick={{ fill: CHART_AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => Number(v).toFixed(4)} />
        <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={(v) => (v === 0 ? 'now' : `+${v} blocks`)} formatter={(v: number, n) => [`${Number(v).toFixed(6)} gwei`, n === 'current' ? 'at current rate' : 'if cap-full']} />
        <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.5} />
        <Line type="monotone" dataKey="current" name="current" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="full" name="full" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
