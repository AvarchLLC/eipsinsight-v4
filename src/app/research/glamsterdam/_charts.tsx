'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { INVARIANTS, SCAN, FLAGGED, REPRICING, AA_HEADROOM, NEWACCT, SELFDESTRUCT, STATE_REPLAY } from './_data';

const fmt = (n: number) => n.toLocaleString();

export const TT = {
  background: 'var(--overlay)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '8px 12px',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-overlay)',
} as const;
export const TT_LABEL = { color: 'var(--ink)', fontWeight: 600, marginBottom: 2 } as const;
export const TT_ITEM = { color: 'var(--ink)' } as const;

const MONO = 'var(--font-geist-mono)';

/* Reveal-on-scroll; honours reduced-motion. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.19, 1, 0.22, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ChartFrame({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <figure className="mt-1">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[1.1rem] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">{title}</span>
        {sub ? <span className="mono text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{sub}</span> : null}
      </figcaption>
      <div className="w-full">{children}</div>
    </figure>
  );
}

/* ── Derived data from the 115 flagged contracts ── */
function classify(name: string): string {
  const n = name.toLowerCase();
  if (/entrypoint|4337|paymaster|walletsimple/.test(n)) return 'Account abstraction';
  if (/proxy|diamond|beacon|upgradeab/.test(n)) return 'Proxies / upgradeable';
  if (/router|swap|aggregation|1inch|kyber|pendle|metaswap|dex|metarouter|disperse/.test(n)) return 'Routers / DEX';
  if (/bridge|relay|forwarder|mayan|symbiosis|thorchain|swft|lifi|rango|utb|fulfill|depository|glidedeposit/.test(n)) return 'Bridges / intents';
  if (/oracle|pyth|dvn|uln|prioupdate/.test(n)) return 'Oracles / messaging';
  if (/seaport|seadrop|zora|souls|opensea|1155/.test(n)) return 'NFT / marketplace';
  if (/token|erc20|weth|wbtc|tether|usde|ena|sushi|link|saitama|beam|zama|layerzero|coin|stablecoin|fiattoken|pangea/.test(n)) return 'Tokens';
  return 'Other';
}

/* ── 1. Flagged by invariant ── */
export function InvariantChart() {
  const data = useMemo(() => [...INVARIANTS].sort((a, b) => b.count - a.count), []);
  return (
    <ChartFrame title="Flagged contracts by invariant" sub={`of ${SCAN.flagged} flagged`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 30, top: 4, bottom: 4 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="id" width={52} tick={{ fill: 'var(--ink)', fontSize: 12.5, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v} contracts`, 'match this pattern']} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="count" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={16} fill="var(--brand)">
            <LabelList dataKey="count" position="right" fill="var(--ink)" fontSize={12} fontFamily={MONO} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 2. Flagged by category ── */
export function CategoryChart() {
  const data = useMemo(() => {
    const m: Record<string, number> = {};
    FLAGGED.forEach((f) => { const c = classify(f.name); m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).map(([cat, count]) => ({ cat, count })).sort((a, b) => b.count - a.count);
  }, []);
  return (
    <ChartFrame title="What kind of contracts got flagged" sub={`${SCAN.flagged} flagged, by type`}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 30, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="cat" width={150} tick={{ fill: 'var(--ink)', fontSize: 11.5, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v} contracts`, 'flagged']} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="count" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={15} fill="var(--brand)">
            <LabelList dataKey="count" position="right" fill="var(--ink)" fontSize={12} fontFamily={MONO} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 3. Match density: how many invariants each contract matched ── */
export function DensityChart() {
  const data = useMemo(() => {
    const m: Record<number, number> = {};
    FLAGGED.forEach((f) => { const k = f.invs.length; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([k, count]) => ({ k: `${k}`, count, low: Number(k) <= 3 })).sort((a, b) => Number(a.k) - Number(b.k));
  }, []);
  const lowTotal = useMemo(() => FLAGGED.filter((f) => f.invs.length <= 3).length, []);
  return (
    <ChartFrame title="How many invariants each flag matched" sub={`${lowTotal} of ${SCAN.flagged} match only 1–3 (low signal)`}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 4 }}>
          <XAxis dataKey="k" tick={{ fill: 'var(--ink)', fontSize: 12, fontFamily: MONO }} axisLine={false} tickLine={false} label={undefined} />
          <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v} contracts`, 'flagged']} labelFormatter={(l) => `${l} invariant${l === '1' ? '' : 's'} matched`} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="count" isAnimationActive={false} radius={[4, 4, 0, 0]} barSize={34}>
            {data.map((d) => (
              <Cell key={d.k} fill={d.low ? 'var(--ink-faint)' : 'var(--brand)'} />
            ))}
            <LabelList dataKey="count" position="top" fill="var(--ink)" fontSize={12} fontFamily={MONO} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
        grey = low-signal (generic proxy patterns) · green = 4+ invariants, worth a closer look
      </p>
    </ChartFrame>
  );
}

/* ── 4. Top flagged contracts by on-chain activity ── */
export function ActivityChart({ n = 12 }: { n?: number }) {
  const data = useMemo(
    () => [...FLAGGED].sort((a, b) => b.txs - a.txs).slice(0, n).map((f) => ({ name: f.name.length > 26 ? f.name.slice(0, 25) + '…' : f.name, txs: f.txs })),
    [n],
  );
  return (
    <ChartFrame title="Busiest flagged contracts" sub="transactions in the scan window">
      <ResponsiveContainer width="100%" height={n * 26 + 20}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 48, top: 4, bottom: 4 }}>
          <XAxis type="number" hide tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={185} tick={{ fill: 'var(--ink)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${fmt(v)} txs`, 'activity']} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="txs" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={13} fill="var(--brand)">
            <LabelList dataKey="txs" position="right" fill="var(--ink-muted)" fontSize={10.5} fontFamily={MONO} formatter={(v: number) => fmt(v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ── 5. AA validation headroom (evidence 4337 does not break) ── */
export function HeadroomChart() {
  const data = useMemo(
    () => AA_HEADROOM.map((h) => ({ label: h.label, used: h.used, headroom: h.budget - h.used, budget: h.budget })),
    [],
  );
  return (
    <ChartFrame title="Validation gas: used vs signed budget" sub="verificationGasLimit, real traced user-ops">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 56, top: 4, bottom: 4 }} barCategoryGap="28%">
          <XAxis type="number" tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="label" width={135} tick={{ fill: 'var(--ink)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TT}
            labelStyle={TT_LABEL}
            itemStyle={TT_ITEM}
            formatter={(v: number, key) => [`${fmt(v)} gas`, key === 'used' ? 'validateUserOp used' : 'unused headroom']}
            cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
          />
          <Bar dataKey="used" stackId="a" isAnimationActive={false} fill="var(--brand)" barSize={18} radius={[4, 0, 0, 4]} />
          <Bar dataKey="headroom" stackId="a" isAnimationActive={false} fill="var(--surface-3)" barSize={18} radius={[0, 4, 4, 0]}>
            <LabelList dataKey="budget" position="right" fill="var(--ink-muted)" fontSize={10.5} fontFamily={MONO} formatter={(v: number) => `${fmt(v)} budget`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
        green = gas validation actually used · grey = unused headroom · repricing adds only a few k, well inside the gap
      </p>
    </ChartFrame>
  );
}

/* ── 6. The repricing, before → after ── */
export function RepricingBars() {
  const max = useMemo(() => Math.max(...REPRICING.map((r) => r.after)), []);
  return (
    <div className="divide-y divide-[var(--border)]/60 border-y border-[var(--border)]/60">
      {REPRICING.map((r) => {
        const mult = r.after / r.before;
        return (
          <div key={r.op} className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:items-center sm:gap-6">
            <div>
              <div className="text-[15px] font-medium text-[var(--ink)]">{r.op}</div>
              <div className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">{r.eip}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="mono w-14 shrink-0 text-right text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">now</span>
                <span className="h-[0.8rem] flex-1 overflow-hidden rounded-[2px] bg-[var(--surface-3)]">
                  <span className="block h-full rounded-[2px] bg-[var(--ink-faint)]/50" style={{ width: `${(r.before / max) * 100}%` }} />
                </span>
                <span className="mono w-20 shrink-0 text-right text-[12px] tabular-nums text-[var(--ink-muted)]">{fmt(r.before)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="mono w-14 shrink-0 text-right text-[10px] uppercase tracking-wide text-[var(--brand-strong)]">glam</span>
                <span className="h-[0.8rem] flex-1 overflow-hidden rounded-[2px] bg-[var(--surface-3)]">
                  <span className="block h-full rounded-[2px] bg-[var(--brand)]" style={{ width: `${(r.after / max) * 100}%` }} />
                </span>
                <span className="mono w-20 shrink-0 text-right text-[12px] font-semibold tabular-nums text-[var(--ink)]">{fmt(r.after)}</span>
              </div>
            </div>
            <div className="mono text-[1.35rem] font-bold tabular-nums text-[var(--brand-strong)] sm:w-20 sm:text-right">
              {mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}×
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 7. New-account transfers that would fail under EIP-8037 (our node) ── */
export function NewAcctChart() {
  const data = useMemo(() => NEWACCT.series.map((d) => ({ label: d.label, atRisk: d.atRisk })), []);
  return (
    <ChartFrame title="Plain transfers to new accounts that would fail, per day" sub="measured on our archive node">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left: 4, right: 12, top: 16, bottom: 4 }}>
          <XAxis dataKey="label" tick={{ fill: 'var(--ink)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${fmt(v)} transfers`, 'would fail']} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="atRisk" isAnimationActive={false} radius={[4, 4, 0, 0]} barSize={30} fill="var(--brand)">
            <LabelList dataKey="atRisk" position="top" fill="var(--ink)" fontSize={10.5} fontFamily={MONO} fontWeight={600} formatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
        value transfer to an empty account now needs ~{fmt(NEWACCT.gasNeeded)} gas, not {fmt(NEWACCT.baseGas)}
      </p>
    </ChartFrame>
  );
}

/* ── 8. Who runs the create-and-self-destruct pattern (our node) ── */
export function SelfDestructChart() {
  const data = useMemo(() => {
    const total = SELFDESTRUCT.eventsSampled;
    const top = SELFDESTRUCT.factories.map((f) => ({
      label: f.name ? `${f.name} ${f.addr.slice(0, 6)}…` : `${f.addr.slice(0, 6)}…${f.addr.slice(-4)}`,
      share: +((f.hits / total) * 100).toFixed(1),
    }));
    const other = +(((total - SELFDESTRUCT.factories.reduce((s, f) => s + f.hits, 0)) / total) * 100).toFixed(1);
    if (other > 0) top.push({ label: 'everyone else', share: other });
    return top;
  }, []);
  return (
    <ChartFrame title="Who runs the create-and-self-destruct pattern" sub="share of sampled events">
      <ResponsiveContainer width="100%" height={230}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="label" width={165} tick={{ fill: 'var(--ink)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v}%`, 'of sampled events']} cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }} />
          <Bar dataKey="share" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={14} fill="var(--brand)">
            <LabelList dataKey="share" position="right" fill="var(--ink)" fontSize={11} fontFamily={MONO} fontWeight={600} formatter={(v: number) => `${v}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
        one named “EphemeralFactory” · the state cost per fresh account rises {fmt(SELFDESTRUCT.stateBefore)} → {fmt(SELFDESTRUCT.stateAfter)} gas, unrefunded
      </p>
    </ChartFrame>
  );
}

/* ── 9. Measured extra state-gas per operation (our node, prestate diff) ── */
const kgas = (v: number) => (v === 0 ? '0' : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`);
export function StateReplayChart() {
  const data = useMemo(
    () => STATE_REPLAY.rows.map((r) => ({
      name: r.name.length > 24 ? r.name.slice(0, 23) + '…' : r.name,
      median: r.medDelta,
      tail: Math.max(0, r.maxDelta - r.medDelta),
      maxDelta: r.maxDelta,
    })),
    [],
  );
  return (
    <ChartFrame title="Extra state-gas per transaction, by contract" sub="median (solid) → worst seen (faint), 25 real txs each">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={(v) => kgas(v)} />
          <YAxis type="category" dataKey="name" width={175} tick={{ fill: 'var(--ink)', fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TT}
            labelStyle={TT_LABEL}
            itemStyle={TT_ITEM}
            formatter={(v: number, key, item) => key === 'median' ? [`${fmt(v)} gas`, 'median extra'] : [`${fmt((item?.payload?.median || 0) + v)} gas`, 'worst seen']}
            cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
          />
          <Bar dataKey="median" stackId="a" isAnimationActive={false} fill="var(--brand)" barSize={15} radius={[3, 0, 0, 3]} />
          <Bar dataKey="tail" stackId="a" isAnimationActive={false} fill="var(--brand-soft)" barSize={15} radius={[0, 3, 3, 0]}>
            <LabelList dataKey="maxDelta" position="right" fill="var(--ink-muted)" fontSize={10} fontFamily={MONO} formatter={(v: number) => `max ${kgas(v)}`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
        new account +{fmt(STATE_REPLAY.deltaAcct)} · new storage slot +{fmt(STATE_REPLAY.deltaSlot)} gas (EIP-8037) · swaps create no new state
      </p>
    </ChartFrame>
  );
}

/* Shared: Instrument-Serif section head (brand rule + mono index + serif title). */
export function SerifSectionHead({ n, title, className }: { n: string; title: string; className?: string }) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="mono text-sm font-semibold text-[var(--brand-strong)]">{n}</span>
        <h2 className="text-[1.9rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)] sm:text-[2.3rem]">{title}</h2>
      </div>
    </div>
  );
}
