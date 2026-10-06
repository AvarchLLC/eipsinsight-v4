'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
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
import { Activity, Boxes, CheckCircle2, Coins, GitMerge, Layers, PenLine, Radio, Timer, Users, Zap } from 'lucide-react';
import { client } from '@/lib/orpc';
import { CHART_AXIS, CHART_GRID, chartColor } from '@/lib/chart-colors';
import { AA_BRUSH } from '@/components/aa/chart-kit';
import { ChartCard } from '@/components/chart-card';
import { ChartWatermark } from '@/components/chart-watermark';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { cn } from '@/lib/utils';

type FramesData = Awaited<ReturnType<typeof client.aa.getFramesDevnet>>;
type SeriesPoint = FramesData['series'][number];
type Granularity = 'hour' | 'day';

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

// Normalize a bucket to canonical hex ("1" and "0x1" both -> "0x1"), because
// different clients serialize mode/scheme as decimal or hex.
const normHex = (b: string): string => {
  if (b == null) return b;
  const n = b.startsWith('0x') ? parseInt(b, 16) : Number(b);
  return Number.isNaN(n) ? b : '0x' + n.toString(16);
};
// EIP-8141 spec semantics, so the raw hex buckets read as what they mean.
const MODE_LABEL: Record<string, string> = {
  '0x0': 'Entrypoint',
  '0x1': 'Validation',
  '0x2': 'Execution',
};
const modeLabel = (b: string) => MODE_LABEL[normHex(b)] ?? `mode ${b}`;
// Signature schemes + their spec gas cost (EIP-8141 §Signatures).
const SCHEME: Record<string, { name: string; gas: number }> = {
  '0x0': { name: 'SECP256K1', gas: 2800 },
  '0x1': { name: 'P256', gas: 6700 },
};
const schemeInfo = (b: string) => SCHEME[normHex(b)] ?? { name: `scheme ${b}`, gas: 0 };
// EIP-8141 frame flags. Bit 2 (0x4) marks an atomic batch (all-or-nothing frames).
const ATOMIC_BATCH_BIT = 0x4;
const FLAG_LABEL: Record<string, string> = { '0x0': 'Standard', '0x4': 'Atomic batch' };
const flagLabel = (b: string) => FLAG_LABEL[normHex(b)] ?? `flags ${normHex(b)}`;
const FRAME_TX_INTRINSIC = 15000;
const FRAME_PER_FRAME = 475;
const PLAIN_TRANSFER_GAS = 21000; // relatable baseline for normal users
// Max verified (validation) gas on frames-devnet-0, raised from 100K in
// Frame Transaction Breakout #5 (Sep 22 2026) to support complex test scenarios.
const MAX_VERIFIED_GAS = 500000;

function fmtHour(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', timeZone: 'UTC' });
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Roll the hourly series up into daily buckets, recomputing derived + cumulative fields. */
function bucketByDay(series: SeriesPoint[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const p of series) {
    const key = `${p.t.slice(0, 10)}T00:00:00.000Z`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { ...p, t: key });
    } else {
      cur.frameTxs += p.frameTxs;
      cur.frames += p.frames;
      cur.signatures += p.signatures;
      cur.blocks += p.blocks;
      cur.gasUsed += p.gasUsed;
      cur.success += p.success;
      cur.fail += p.fail;
    }
  }
  const out = Array.from(map.values()).sort((a, b) => a.t.localeCompare(b.t));
  let cTx = 0, cFr = 0, cSig = 0;
  for (const p of out) {
    cTx += p.frameTxs;
    cFr += p.frames;
    cSig += p.signatures;
    p.cumulativeFrameTxs = cTx;
    p.cumulativeFrames = cFr;
    p.cumulativeSignatures = cSig;
    p.avgFramesPerBlock = p.blocks ? +(p.frames / p.blocks).toFixed(2) : 0;
    p.avgFramesPerTx = p.frameTxs ? +(p.frames / p.frameTxs).toFixed(2) : 0;
    p.successRate = p.success + p.fail > 0 ? +((100 * p.success) / (p.success + p.fail)).toFixed(2) : null;
    p.gasPerFrame = p.frames ? Math.round(p.gasUsed / p.frames) : null;
  }
  return out;
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
type UsageData = Awaited<ReturnType<typeof client.aa.getUsageStats>>;

export function FramesDevnetPanel({ network = 'frames-devnet-0' }: { network?: string }) {
  const [data, setData] = useState<FramesData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gran, setGran] = useState<Granularity>('hour');

  // Re-bucket the hourly series to daily when the viewer chooses. Hourly stays raw.
  const chartSeries = useMemo<SeriesPoint[]>(
    () => (data?.series ? (gran === 'day' ? bucketByDay(data.series) : data.series) : []),
    [data, gran],
  );
  const tickFmt = gran === 'day' ? fmtDay : fmtHour;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Mainnet AA volume (7702 + 4337) for the "vs mainnet" comparison. Best-effort.
    client.aa
      .getUsageStats({ granularity: 'month' })
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      });
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
  const fptData = data.histograms.framesPerTx.map((h) => ({ name: h.bucket, value: h.count }));

  // Merge histogram buckets by their semantic label (clients emit "0x1" and "1").
  const mergeBy = (buckets: { bucket: string; count: number }[]) => {
    const m = new Map<string, number>();
    for (const b of buckets) m.set(modeLabel(b.bucket), (m.get(modeLabel(b.bucket)) ?? 0) + b.count);
    return m;
  };
  const frameCountByPurpose = mergeBy(data.histograms.frameMode);
  const gasByPurposeMap = mergeBy(data.histograms.gasByMode);
  // Purpose mix (share of frames).
  const purposeData = Array.from(frameCountByPurpose.entries())
    .map(([name, value], i) => ({ name, value, fill: chartColor(i) }))
    .sort((a, b) => b.value - a.value);
  // Average gas a single frame is allowed, by purpose. THIS is the readable
  // "what does validation cost vs execution" answer, not raw multi-billion totals.
  const gasPerFrameByPurpose = Array.from(gasByPurposeMap.entries())
    .map(([name, gas], i) => ({
      name,
      value: Math.round(gas / (frameCountByPurpose.get(name) || 1)),
      fill: chartColor(i),
    }))
    .sort((a, b) => b.value - a.value);

  // Signature economics, deduped by canonical scheme, count x spec gas cost.
  const schemeAgg = new Map<string, { name: string; gasEach: number; count: number }>();
  for (const h of data.histograms.sigScheme) {
    const info = schemeInfo(h.bucket);
    const cur = schemeAgg.get(info.name) ?? { name: info.name, gasEach: info.gas, count: 0 };
    cur.count += h.count;
    schemeAgg.set(info.name, cur);
  }
  const schemeRows = Array.from(schemeAgg.values())
    .map((r) => ({ ...r, totalGas: r.count * r.gasEach }))
    .sort((a, b) => b.count - a.count);
  const totalSigGas = schemeRows.reduce((s, r) => s + r.totalGas, 0);
  const dominantScheme = schemeRows[0];
  const validationGasPerTx = data.totals.frameTxs ? Math.round(totalSigGas / data.totals.frameTxs) : 0;

  // Signatures-per-tx distribution (how many keys authorize one frame tx).
  const sptData = data.histograms.sigPerTx.map((h) => ({ name: h.bucket, value: h.count }));

  // Atomic-batch adoption from the frame_flags histogram (bit 0x4 per spec).
  // Merge by label so decimal/hex duplicates ("4" and "0x4") collapse.
  const flagMap = new Map<string, number>();
  for (const h of data.histograms.frameFlags) {
    flagMap.set(flagLabel(h.bucket), (flagMap.get(flagLabel(h.bucket)) ?? 0) + h.count);
  }
  const flagsData = Array.from(flagMap.entries())
    .map(([name, value], i) => ({ name, value, fill: chartColor(i) }))
    .sort((a, b) => b.value - a.value);
  let atomicFrames = 0;
  let flaggedFrames = 0;
  for (const h of data.histograms.frameFlags) {
    const n = parseInt(normHex(h.bucket), 16);
    flaggedFrames += h.count;
    if (Number.isFinite(n) && (n & ATOMIC_BATCH_BIT) !== 0) atomicFrames += h.count;
  }
  const atomicPct = flaggedFrames ? Math.round((1000 * atomicFrames) / flaggedFrames) / 10 : 0;

  // Gas efficiency: how much of the gas frames reserve do they actually burn,
  // and how much of the 500K validation cap a typical tx uses.
  const totalAllowance = Array.from(gasByPurposeMap.values()).reduce((s, v) => s + v, 0);
  const gasUtilPct = totalAllowance ? Math.min(100, Math.round((1000 * data.totals.gas) / totalAllowance) / 10) : 0;
  const verifyHeadroomPct = Math.min(100, Math.round((1000 * validationGasPerTx) / MAX_VERIFIED_GAS) / 10);

  // Unique senders over time (adoption breadth) — from the senders table.
  const hasSenders = data.sendersSeries.length > 0;
  // Signature scheme mix over time — pivot long rows into stacked series by scheme name.
  const schemeNames = Array.from(new Set(data.schemeSeries.map((r) => schemeInfo(r.scheme).name)));
  const schemeByT = new Map<string, Record<string, number | string>>();
  for (const r of data.schemeSeries) {
    const name = schemeInfo(r.scheme).name;
    const row = schemeByT.get(r.t) ?? { t: r.t };
    row[name] = ((row[name] as number) ?? 0) + r.count;
    schemeByT.set(r.t, row);
  }
  const schemeChart = Array.from(schemeByT.values()).sort((a, b) => String(a.t).localeCompare(String(b.t)));
  const hasSchemeSeries = schemeChart.length > 1 && schemeNames.length > 0;

  // Where the gas of one native-AA transaction goes (a composition normal users get).
  const perFrame = data.totals.frameTxs ? data.totals.frames / data.totals.frameTxs : 0;
  const costParts = [
    { name: 'Base fee (intrinsic)', gas: FRAME_TX_INTRINSIC, fill: chartColor(0) },
    { name: 'Per-frame overhead', gas: Math.round(FRAME_PER_FRAME * perFrame), fill: chartColor(2) },
    { name: 'Signature check', gas: validationGasPerTx, fill: chartColor(4) },
  ];
  const effectiveCostPerTx = costParts.reduce((s, p) => s + p.gas, 0);
  const vsTransfer = effectiveCostPerTx / PLAIN_TRANSFER_GAS;

  // "vs mainnet AA": transactions per day. Devnet is a synthetic stress test;
  // mainnet 7702 + 4337 are organic. Uses the latest full month divided by 30.
  const daysLive = data.derived.daysLive && data.derived.daysLive > 0 ? data.derived.daysLive : 1;
  const lastMonth = usage && usage.available && usage.series.length ? usage.series[usage.series.length - 1] : null;
  const comparison = lastMonth
    ? [
        { name: 'Devnet EIP-8141', value: Math.round(data.totals.frameTxs / daysLive), fill: chartColor(2), tag: 'native AA · devnet' },
        { name: 'Mainnet EIP-7702', value: Math.round(lastMonth.aa7702 / 30), fill: chartColor(0), tag: 'set-code · mainnet' },
        { name: 'Mainnet ERC-4337', value: Math.round(lastMonth.aa4337 / 30), fill: chartColor(1), tag: 'bundler · mainnet' },
      ]
    : null;

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
          The first devnet running EIP-8141 frame transactions. Every metric below comes from the public devnet
          execution RPC. These are frame transactions: each one can batch several{' '}
          <span className="text-foreground">frames</span> and carry its own{' '}
          <span className="text-foreground">signatures</span>.
        </p>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat icon={Activity} label="Frame txs" value={compact(data.totals.frameTxs)} sub={`${data.totals.frameTxs.toLocaleString()} total`} />
        <Stat icon={Layers} label="Frames executed" value={compact(data.totals.frames)} sub={`${data.derived.avgFramesPerTx} / tx avg`} />
        <Stat icon={CheckCircle2} label="Success rate" value={data.derived.successRate != null ? `${data.derived.successRate}%` : 'n/a'} sub={`${compact(data.totals.fail)} failed`} />
        <Stat icon={GitMerge} label="Batching" value={`${data.derived.avgFramesPerTx}×`} sub="frames per tx" />
        <Stat icon={PenLine} label="Sig scheme" value={dominantScheme?.name ?? 'n/a'} sub={dominantScheme ? `${dominantScheme.gasEach.toLocaleString()} gas each` : ''} />
        <Stat icon={Zap} label="Validation gas / tx" value={compact(validationGasPerTx)} sub="signature verification" />
        <Stat icon={Coins} label="Effective cost / tx" value={compact(effectiveCostPerTx)} sub="intrinsic + frames + sig" />
        <Stat icon={Boxes} label="Blocks" value={compact(data.totals.blocks)} sub={`since block ${data.activationBlock}`} />
        {hasSenders && (
          <Stat icon={Users} label="Unique senders" value={compact(data.totals.uniqueSenders)} sub="distinct accounts" />
        )}
      </div>

      {/* Chart controls: granularity toggle. Drag the slider under any time chart to zoom a range. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Drag the slider under any chart to zoom a time range. Switch the resolution here.
        </p>
        <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
          {(['hour', 'day'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGran(g)}
              aria-pressed={gran === g}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                gran === g ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {g === 'hour' ? 'Hourly' : 'Daily'}
            </button>
          ))}
        </div>
      </div>

      {/* Cumulative growth */}
      <ChartCard
        id="frames-cumulative"
        title="Cumulative activity"
        description="Frame transactions, frames executed, and signatures verified since the frames fork activated. The gap between frames and transactions shows how much each tx batches."
      >
        <div className="relative h-[280px] w-full">
          <ChartWatermark />
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
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
              <XAxis dataKey="t" tickFormatter={tickFmt} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={48} />
              <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} labelFormatter={(l) => `${tickFmt(String(l))} UTC`} formatter={(v: number) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="cumulativeFrames" name="Frames executed" stroke={chartColor(2)} strokeWidth={2} fill="url(#framesCumFill)" isAnimationActive={false} />
              <Area type="monotone" dataKey="cumulativeFrameTxs" name="Frame txs" stroke={chartColor(0)} strokeWidth={2} fill="url(#txCumFill)" isAnimationActive={false} />
              <Area type="monotone" dataKey="cumulativeSignatures" name="Signatures" stroke={chartColor(4)} strokeWidth={2} fillOpacity={0} isAnimationActive={false} />
              <Brush dataKey="t" tickFormatter={tickFmt} {...AA_BRUSH} />
              </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Adoption breadth: distinct accounts over time */}
      {hasSenders && (
        <ChartCard
          id="frames-unique-senders"
          title="Unique senders over time"
          description="Cumulative distinct accounts that have sent at least one frame transaction. The breadth of accounts exercising native AA, not just the raw transaction count."
        >
          <div className="relative h-[240px] w-full">
            <ChartWatermark />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sendersSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="sendersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor(3)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor(3)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickFmt} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} labelFormatter={(l) => `${tickFmt(String(l))} UTC`} formatter={(v: number) => [v.toLocaleString(), 'senders']} />
                <Area type="monotone" dataKey="cumulativeSenders" name="Unique senders" stroke={chartColor(3)} strokeWidth={2} fill="url(#sendersFill)" isAnimationActive={false} />
                <Brush dataKey="t" tickFormatter={tickFmt} {...AA_BRUSH} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Reliability + validation cost */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          id="frames-success"
          title="Frame-tx success rate"
          description="Share of frame transactions that succeed each hour, from block receipts. Some failures are expected on a devnet that is testing edge cases."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor(2)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor(2)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickFmt} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART_AXIS }} width={40} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} labelFormatter={(l) => `${tickFmt(String(l))} UTC`} formatter={(v: number) => [`${v}%`, 'Success']} />
                <Area type="monotone" dataKey="successRate" stroke={chartColor(2)} strokeWidth={2} fill="url(#successFill)" connectNulls isAnimationActive={false} />
                <Brush dataKey="t" tickFormatter={tickFmt} {...AA_BRUSH} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          id="frames-gas-by-purpose"
          title="Gas per frame: validation vs execution"
          description="The average gas a single frame is allowed, split by job. Validation (checking who you are) is cheap; execution (doing the actual work) is where the gas goes. This is the readable answer to 'is native-AA validation expensive?'"
        >
          <div className="relative h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gasPerFrameByPurpose} layout="vertical" margin={{ top: 8, right: 56, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_AXIS }} width={84} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [`${v.toLocaleString()} gas / frame`, 'Avg']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', formatter: (v: number) => `${compact(v)}`, fontSize: 11, fill: CHART_AXIS }}>
                  {gasPerFrameByPurpose.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Cost of one native-AA transaction (normal-user friendly composition) */}
      <ChartCard
        id="frames-cost-breakdown"
        title="What one native-AA transaction costs"
        description="Where the gas of a single frame transaction goes: the base fee, the per-frame overhead, and verifying your signature. For context, a plain ETH transfer is 21,000 gas."
      >
        <div className="relative h-[110px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={[{ name: 'cost', ...Object.fromEntries(costParts.map((p) => [p.name, p.gas])) }]} margin={{ top: 8, right: 12, bottom: 4, left: 8 }} stackOffset="none">
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number, n) => [`${v.toLocaleString()} gas`, n as string]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {costParts.map((p, i) => (
                <Bar key={p.name} dataKey={p.name} stackId="c" fill={p.fill} isAnimationActive={false} radius={i === costParts.length - 1 ? [0, 4, 4, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          That is the account-abstraction envelope (base fee + per-frame overhead + signature check):{' '}
          <span className="font-semibold text-foreground">{effectiveCostPerTx.toLocaleString()} gas</span>, about{' '}
          <span className="font-semibold text-foreground">{vsTransfer.toFixed(1)}×</span> a plain ETH transfer (21,000), on
          top of whatever the frames actually execute. The AA overhead itself is small.
        </p>
      </ChartCard>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          id="frames-per-tx"
          title="Frames per transaction"
          description="How many frames each frame transaction batches into a single tx."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fptData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} label={{ value: 'frames in tx', position: 'insideBottom', offset: -2, fontSize: 10, fill: CHART_AXIS }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [v.toLocaleString(), 'txs']} />
                <Bar dataKey="value" fill={chartColor(1)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          id="frames-purpose"
          title="Frame purpose mix"
          description="What each frame is for, per the EIP-8141 spec: VERIFY frames validate the transaction, SENDER frames execute the user's operations, ENTRYPOINT is the default."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purposeData} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_AXIS }} width={84} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [`${v.toLocaleString()} frames`, 'Count']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {purposeData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Signatures per tx + atomic-batch adoption */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          id="frames-sigs-per-tx"
          title="Signatures per transaction"
          description="How many signatures authorize a single frame transaction. More than one means multi-key or role-separated authorization (e.g. a session key plus an owner)."
        >
          <div className="relative h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sptData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_AXIS }} label={{ value: 'signatures in tx', position: 'insideBottom', offset: -2, fontSize: 10, fill: CHART_AXIS }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={44} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [v.toLocaleString(), 'txs']} />
                <Bar dataKey="value" fill={chartColor(4)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          id="frames-atomic-batch"
          title="Atomic batch adoption"
          description="Frames flagged as part of an atomic batch (EIP-8141 flag bit 0x4): either every frame in the batch succeeds or the whole transaction reverts. A core native-AA capability ERC-4337 cannot offer in-protocol."
        >
          <div className="relative h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flagsData} layout="vertical" margin={{ top: 8, right: 56, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_AXIS }} width={96} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [`${v.toLocaleString()} frames`, 'Count']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', formatter: (v: number) => compact(v), fontSize: 11, fill: CHART_AXIS }}>
                  {flagsData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{atomicPct}%</span> of frames run inside an atomic batch.
          </p>
        </ChartCard>
      </div>

      {/* Gas efficiency: reserved vs burned, and validation headroom under the 500K cap */}
      <ChartCard
        id="frames-gas-efficiency"
        title="Gas efficiency"
        description="How much of the gas frames reserve actually gets used, and how much of the 500K max-verified-gas cap a typical transaction spends on validation."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Frame gas utilization</span>
              <span className="font-mono tabular-nums text-muted-foreground">{gasUtilPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${gasUtilPct}%`, backgroundColor: chartColor(2) }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {compact(data.totals.gas)} gas used of {compact(totalAllowance)} reserved across all frames.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Validation headroom</span>
              <span className="font-mono tabular-nums text-muted-foreground">{verifyHeadroomPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${verifyHeadroomPct}%`, backgroundColor: chartColor(4) }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {compact(validationGasPerTx)} validation gas / tx against the {compact(MAX_VERIFIED_GAS)} cap (raised in Breakout #5).
            </p>
          </div>
        </div>
      </ChartCard>

      {/* Signature validation cost (spec-grounded) */}
      <ChartCard
        id="frames-sig-cost"
        title="Signature validation cost"
        description="Every signature must verify before any frame runs. Cost per scheme is fixed by the EIP-8141 spec (SECP256K1 = 2,800 gas, P256 = 6,700). Schemes 0x2+ are reserved for post-quantum; none have appeared on the devnet yet."
      >
        <div className="space-y-2">
          {schemeRows.map((r, i) => {
            const pct = totalSigGas ? Math.round((100 * r.totalGas) / totalSigGas) : 0;
            return (
              <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{r.name}</span>
                    <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {r.gasEach.toLocaleString()} gas / sig
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {compact(r.count)} sigs · {compact(r.totalGas)} gas total
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: chartColor(i) }} />
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            Post-quantum watch: this devnet runs {dominantScheme?.name ?? 'a single scheme'} today. The moment a reserved
            scheme (0x2+, e.g. a hash-based or lattice signature) shows up, it appears here, the first on-chain signal of
            post-quantum native AA.
          </p>
        </div>
      </ChartCard>

      {/* Signature scheme mix over time (post-quantum emergence signal) */}
      {hasSchemeSeries && (
        <ChartCard
          id="frames-scheme-over-time"
          title="Signature scheme mix over time"
          description="Which signature schemes authorize frame transactions, per hour. The first appearance of a reserved scheme (0x2+) would be the on-chain signal of post-quantum native AA emerging."
        >
          <div className="relative h-[240px] w-full">
            <ChartWatermark />
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={schemeChart} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={tickFmt} tick={{ fontSize: 11, fill: CHART_AXIS }} minTickGap={40} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} width={48} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} labelFormatter={(l) => `${tickFmt(String(l))} UTC`} formatter={(v: number, n) => [v.toLocaleString(), n as string]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {schemeNames.map((name, i) => (
                  <Area key={name} type="monotone" dataKey={name} name={name} stackId="scheme" stroke={chartColor(i)} fill={chartColor(i)} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                ))}
                <Brush dataKey="t" tickFormatter={tickFmt} {...AA_BRUSH} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Why this matters: throughput vs today's mainnet AA demand */}
      {comparison && (
        <ChartCard
          id="frames-vs-mainnet"
          title="Native AA throughput vs mainnet AA demand"
          description="Transactions per day: EIP-8141 frames on the devnet next to today's mainnet account abstraction (EIP-7702 set-code plus ERC-4337 bundler txs, latest month)."
        >
          <div className="relative h-[240px] w-full">
            <ChartWatermark />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} layout="vertical" margin={{ top: 8, right: 48, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: CHART_AXIS }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_AXIS }} width={130} />
                <Tooltip contentStyle={TT} labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} itemStyle={{ color: 'var(--foreground)' }} formatter={(v: number) => [`${v.toLocaleString()} / day`, 'Transactions']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {comparison.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            The devnet figure is a synthetic stress test, not real usage. It shows in-protocol AA holding a transaction
            rate at or above all current mainnet account abstraction, so the design can handle that level of demand once
            it ships.
          </p>
        </ChartCard>
      )}

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
