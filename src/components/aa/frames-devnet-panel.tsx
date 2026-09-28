'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Boxes, CheckCircle2, GitMerge, Layers, PenLine, Radio, Timer } from 'lucide-react';
import { client } from '@/lib/orpc';
import { CHART_AXIS, CHART_GRID, chartColor } from '@/lib/chart-colors';
import { ChartCard } from '@/components/chart-card';
import { ChartWatermark } from '@/components/chart-watermark';
import { InlineBrandLoader } from '@/components/inline-brand-loader';

type FramesData = Awaited<ReturnType<typeof client.aa.getFramesDevnet>>;

const TT = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  color: 'var(--foreground)',
} as const;

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`;

function fmtHour(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', timeZone: 'UTC' });
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Boxes; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/**
 * Live EIP-8141 frame-transaction activity on frames-devnet-0, indexed from the
 * devnet execution RPC into Postgres by the scheduler. Shows whether native AA
 * (batched frames + flexible signatures) is actually being exercised under load.
 */
export function FramesDevnetPanel({ network = 'frames-devnet-0' }: { network?: string }) {
  const [data, setData] = useState<FramesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.aa
      .getFramesDevnet({ network })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card/60">
        <InlineBrandLoader />
      </div>
    );
  }

  if (!data || !data.available) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
        Live activity for <span className="font-mono text-foreground">{network}</span> is not available right now. The
        devnet may not be running, or the indexer has not synced yet. Frame-transaction metrics appear here while the
        devnet is live.
      </div>
    );
  }

  const isLive = data.status === 'live';
  const modeData = data.histograms.frameMode.map((h, i) => ({ name: h.bucket, value: h.count, fill: chartColor(i) }));
  const flagData = data.histograms.frameFlags.map((h) => ({ name: h.bucket, value: h.count }));
  const fptData = data.histograms.framesPerTx.map((h) => ({ name: h.bucket, value: h.count }));
  const sptData = data.histograms.sigPerTx.map((h) => ({ name: h.bucket, value: h.count }));

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{data.network}</span>
            <span
              className={
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
                (isLive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-muted-foreground/30 bg-muted text-muted-foreground')
              }
            >
              <Radio className="h-3 w-3" /> {isLive ? 'live' : 'ended'}
            </span>
            {data.chainId ? (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                chain {String(BigInt(data.chainId))}
              </span>
            ) : null}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {data.activationTime
              ? `Frames activated ${new Date(data.activationTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC (block ${data.activationBlock})`
              : null}
            {data.lastSeen ? ` · updated ${new Date(data.lastSeen).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC` : null}
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          The first devnet exercising EIP-8141 frame transactions. Every metric below is derived from the public devnet
          execution RPC — no trusted feed. This is native account abstraction under sustained load: transactions that
          batch multiple <span className="text-foreground">frames</span> and carry their own{' '}
          <span className="text-foreground">signatures</span>.
        </p>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat icon={Activity} label="Frame txs" value={compact(data.totals.frameTxs)} sub={`${data.totals.frameTxs.toLocaleString()} total`} />
        <Stat icon={Layers} label="Frames executed" value={compact(data.totals.frames)} sub={`${data.derived.avgFramesPerTx} / tx avg`} />
        <Stat icon={CheckCircle2} label="Success rate" value={data.derived.successRate != null ? `${data.derived.successRate}%` : '—'} sub={`${compact(data.totals.fail)} failed`} />
        <Stat icon={GitMerge} label="Batching" value={`${data.derived.avgFramesPerTx}×`} sub="frames per tx" />
        <Stat icon={PenLine} label="Signatures" value={compact(data.totals.signatures)} sub={`${data.derived.avgSignaturesPerTx} / tx avg`} />
        <Stat icon={Boxes} label="Blocks" value={compact(data.totals.blocks)} sub={`since block ${data.activationBlock}`} />
        <Stat icon={Timer} label="Block time" value={data.derived.avgBlockTimeSec ? `${data.derived.avgBlockTimeSec}s` : '—'} sub="avg" />
        <Stat icon={Radio} label="Days live" value={data.derived.daysLive ? `${data.derived.daysLive}` : '—'} sub={isLive ? 'and counting' : 'total'} />
      </div>

      {/* Cumulative growth */}
      <ChartCard
        id="frames-cumulative"
        title="Cumulative activity"
        description="Frame transactions, frames executed, and signatures verified since the frames fork activated. The gap between frames and transactions is native-AA batching at work."
      >
        <div className="relative h-[280px] w-full">
          <ChartWatermark />
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="framesCumFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor(2)} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColor(2)} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="txCumFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor(0)} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColor(0)} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={48} />
              <Tooltip contentStyle={TT} labelFormatter={(l) => `${fmtHour(String(l))} UTC`} formatter={(v: number) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="cumulativeFrames" name="Frames executed" stroke={chartColor(2)} strokeWidth={2} fill="url(#framesCumFill)" isAnimationActive={false} />
              <Area type="monotone" dataKey="cumulativeFrameTxs" name="Frame txs" stroke={chartColor(0)} strokeWidth={2} fill="url(#txCumFill)" isAnimationActive={false} />
              <Area type="monotone" dataKey="cumulativeSignatures" name="Signatures" stroke={chartColor(4)} strokeWidth={2} fillOpacity={0} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Throughput: frame txs per hour + avg frames/block */}
      <ChartCard
        id="frames-throughput"
        title="Throughput over time"
        description="Frame transactions per hour and the average number of frames packed into each block."
      >
        <div className="relative h-[260px] w-full">
          <ChartWatermark />
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
              <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={48} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: CHART_AXIS }} width={38} />
              <Tooltip contentStyle={TT} labelFormatter={(l) => `${fmtHour(String(l))} UTC`} />
              <Line yAxisId="l" type="monotone" dataKey="frameTxs" name="Frame txs / hr" stroke={chartColor(0)} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="r" type="monotone" dataKey="avgFramesPerBlock" name="Avg frames / block" stroke={chartColor(2)} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Reliability + efficiency */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          id="frames-success"
          title="Frame-tx success rate"
          description="Share of frame transactions that succeed each hour (from block receipts). Failures show the devnet is stress-testing edge cases, not just happy paths."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor(2)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor(2)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART_AXIS }} width={40} />
                <Tooltip contentStyle={TT} labelFormatter={(l) => `${fmtHour(String(l))} UTC`} formatter={(v: number) => [`${v}%`, 'Success']} />
                <Area type="monotone" dataKey="successRate" stroke={chartColor(2)} strokeWidth={2} fill="url(#successFill)" connectNulls isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          id="frames-efficiency"
          title="Gas per frame & block liveness"
          description="Average gas each frame consumes and how many blocks the devnet produces per hour — execution efficiency and network health."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={48} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: CHART_AXIS }} width={34} />
                <Tooltip contentStyle={TT} labelFormatter={(l) => `${fmtHour(String(l))} UTC`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="gasPerFrame" name="Gas / frame" stroke={chartColor(1)} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line yAxisId="r" type="monotone" dataKey="blocks" name="Blocks / hr" stroke={chartColor(3)} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          id="frames-per-tx"
          title="Frames per transaction"
          description="How many frames each frame transaction batches — the core of native AA batching."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fptData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} label={{ value: 'frames in tx', position: 'insideBottom', offset: -2, fontSize: 10, fill: CHART_AXIS }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v.toLocaleString(), 'txs']} />
                <Bar dataKey="value" fill={chartColor(1)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          id="sigs-per-tx"
          title="Signatures per transaction"
          description="How many signatures authorize each frame transaction — native, flexible authorization built into the tx."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sptData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} label={{ value: 'signatures in tx', position: 'insideBottom', offset: -2, fontSize: 10, fill: CHART_AXIS }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v.toLocaleString(), 'txs']} />
                <Bar dataKey="value" fill={chartColor(4)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Frame modes & flags (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <ChartCard
          id="frames-modes"
          title="Frame modes & flags"
          description="Which frame execution modes and flags the devnet workload exercises."
        >
          <div className="relative grid h-[240px] w-full grid-cols-2 gap-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeData} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v.toLocaleString(), 'frames']} labelFormatter={(l) => `mode ${l}`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {modeData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flagData} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v.toLocaleString(), 'frames']} labelFormatter={(l) => `flags ${l}`} />
                <Bar dataKey="value" fill={chartColor(3)} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        Source: <span className="font-mono">rpc.{data.network}.ethpandaops.io</span> (public devnet execution RPC),
        indexed every minute while the devnet is live. Frame transactions are EIP-8141 type-6 envelopes; each carries a{' '}
        <span className="text-foreground">frames[]</span> batch and a <span className="text-foreground">signatures[]</span>{' '}
        set. See the{' '}
        <a href="/upgrade/devnets/frames-devnet-0" className="text-primary hover:underline">
          devnet page
        </a>{' '}
        for spec, clients, and resources.
      </div>
    </div>
  );
}
