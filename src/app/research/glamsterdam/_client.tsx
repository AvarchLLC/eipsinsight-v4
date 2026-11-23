'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import {
  ShieldAlert,
  Wrench,
  ExternalLink,
  Trash2,
  ChevronDown,
  ArrowRight,
  Boxes,
  GitBranch,
  BookOpen,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import {
  META,
  SNAPSHOT,
  WHATS_CHANGING,
  FUNNEL,
  REPLAYED,
  STEPS,
  AA_HARD_BREAKS,
  BLAST,
  GAS_DELTA,
  GAS_SWEEP,
  OOG_BREAKS,
  FIXED_GAS,
  CREATE_SELFDESTRUCT,
  INVARIANTS,
  type HardBreak,
} from './_data';

const txUrl = (h: string) => `https://etherscan.io/tx/${h}`;
const addrUrl = (a: string) => `https://etherscan.io/address/${a}`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;

const OUTCOME: Record<string, { label: string; color: string }> = {
  'hard-break': { label: 'hard-break', color: 'var(--c-withdrawn)' },
  'out-of-gas': { label: 'out-of-gas', color: 'var(--c-review)' },
  fixable: { label: 'fixable', color: 'var(--c-final)' },
};

const TT = {
  background: 'var(--overlay)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '8px 12px',
  color: 'var(--ink)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
} as const;
// Recharts colours the label and items itself, which is invisible on a dark card.
// Force readable theme colours.
const TT_LABEL = { color: 'var(--ink)', fontWeight: 600, marginBottom: 2 } as const;
const TT_ITEM = { color: 'var(--ink)' } as const;

/* Reveal-on-scroll. Honours reduced-motion by rendering static. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

/* Section header: number + serif title + optional subtitle, hairline rule only. */
function SectionHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="mono text-sm font-semibold text-[var(--brand-strong)]">{n}</span>
        <h2 className="t-h2">{title}</h2>
      </div>
      {sub && <p className="mt-2 pl-8 text-[1.02rem] leading-relaxed text-[var(--ink-muted)]">{sub}</p>}
    </div>
  );
}

/* Inline "more" disclosure. Pure click-to-expand, no global mode. */
function More({ label = 'Technical detail', children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)]/80 hover:text-[var(--brand-strong)]"
      >
        <Plus className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-45')} />
        {label}
      </button>
      {open && (
        <p className="mt-2 border-l-2 border-[var(--brand)]/30 pl-3 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">{children}</p>
      )}
    </div>
  );
}

export function GlamsterdamResearch() {
  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight research · Gas-audit"
        title="What Glamsterdam breaks"
        lead={
          <>
            Ethereum&apos;s next upgrade reprices on-chain storage. We replayed real mainnet transactions under both
            today&apos;s rules and the new rules. Most apps just need to send a bit more gas. But smart-contract wallets,
            the ones built on account abstraction, <span className="font-medium text-[var(--ink)]">genuinely break</span>,
            in a way the professional audits didn&apos;t cover.
          </>
        }
      >
        <span className="mono text-xs">Fork · <span className="text-[var(--ink)]">{META.fork}</span></span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">{META.eips}</span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">Published · <span className="text-[var(--ink)]">{META.published}</span></span>
      </PageHead>

      <div className="wrap py-8 sm:py-12">
      {/* ── What's changing (intro block, no card) ── */}
      <Reveal>
        <div className="mt-10 border-l-2 border-[var(--brand)]/50 pl-5">
          <p className="text-base font-semibold text-[var(--ink)]">{WHATS_CHANGING.title}</p>
          <p className="mt-1.5 text-[16px] leading-relaxed text-[var(--ink-muted)]">{WHATS_CHANGING.body}</p>
        </div>
      </Reveal>

      {/* ── Summary + explained numbers ── */}
      <Reveal>
        <div className="mt-8">
          <p className="text-[17px] leading-relaxed text-[var(--ink)]">
            We scanned the {META.scanned} busiest contracts, flagged {META.flagged}, and replayed their real transactions
            under old vs new rules against our own archive node. The hard-breaks concentrate in{' '}
            <span className="font-semibold">ERC-4337 EntryPoints</span>: a large share of real user operations fail where
            they succeed today, reverting with{' '}
            <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 mono text-[14px]">AA26 / AA40 over verificationGasLimit</code>.
            Raising gas doesn&apos;t help, because the limit is signed into the user operation.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {SNAPSHOT.map((s) => (
              <div key={s.k} className="flex gap-4">
                <div className={cn('shrink-0 mono text-[2rem] font-bold leading-none tabular-nums', s.danger ? 'text-[var(--c-withdrawn)]' : 'text-[var(--ink)]')}>{s.v}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold capitalize text-[var(--ink)]">{s.k}</div>
                  <div className="mt-0.5 text-[14px] leading-snug text-[var(--ink-muted)]">{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── 01 AA primer ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="01" title="First, what counts as account abstraction" sub="Three different things share the name. Only one is live and carrying real traffic." /></Reveal>
        <Reveal>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {[
              { icon: Boxes, t: 'ERC-4337', tag: 'live · application layer', d: 'Smart-account wallets submit UserOperations through a shared EntryPoint contract, with no protocol change. On mainnet since 2023. This is the AA that carries real traffic today, and what breaks here.', accent: true },
              { icon: GitBranch, t: 'EIP-7702', tag: 'live · Pectra', d: 'A set-code transaction type that points a normal account at contract code, giving it smart-account powers with the same address. Live since Pectra (2025). It is the INV-8 surface below.', accent: false },
              { icon: BookOpen, t: 'Native AA · EIP-7560', tag: 'not shipped', d: 'Account abstraction enshrined in the protocol itself, building on the stalled EIP-2938. Not deployed, so there is nothing on-chain to replay.', accent: false },
            ].map((c) => (
              <div key={c.t} className={cn('border-l-2 pl-4', c.accent ? 'border-[var(--brand)]' : 'border-[var(--border)]')}>
                <c.icon className={cn('h-5 w-5', c.accent ? 'text-[var(--brand-strong)]' : 'text-[var(--ink-muted)]')} />
                <p className="mt-2 text-[16px] font-semibold text-[var(--ink)]">{c.t}</p>
                <p className={cn('mono text-[10px] uppercase tracking-wider', c.accent ? 'text-[var(--brand-strong)]' : 'text-[var(--ink-muted)]')}>{c.tag}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">{c.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[16px] text-[var(--ink-muted)]">
            So when we say account abstraction breaks, we mean <span className="font-medium text-[var(--ink)]">ERC-4337</span>,
            the deployed application-layer form. That is exactly why this is a live problem and not a theoretical one.
          </p>
        </Reveal>
      </section>

      {/* ── 02 How we checked ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="02" title="How we checked" sub="A static scan narrows the field; a differential replay proves the breaks." /></Reveal>

        {/* Funnel: label + count + what-it-means on one line, thin proportional bar below. */}
        <Reveal>
          <div className="mb-9 space-y-5">
            {FUNNEL.map((s, i) => (
              <div key={s.label}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{s.label}</span>
                  <span className={cn('mono text-base font-bold tabular-nums', s.tone === 'break' ? 'text-[var(--c-withdrawn)]' : 'text-[var(--ink)]')}>{s.value}</span>
                  <span className="text-[14px] leading-snug text-[var(--ink-muted)]">{s.desc}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]/30">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.width}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.1, ease: [0.19, 1, 0.22, 1] }}
                    className={cn('h-full rounded-full', s.tone === 'break' ? 'bg-[var(--c-withdrawn)]' : s.tone === 'warn' ? 'bg-[var(--c-review)]' : 'bg-[var(--ink-muted)]')}
                  />
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal><ReplayedTable /></Reveal>

        {/* Steps as a divided list */}
        <Reveal>
          <ol className="divide-y divide-border/50">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 py-4">
                <span className="mt-0.5 mono text-sm font-bold text-[var(--brand-strong)]">0{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[var(--ink)]">{s.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-muted)]">{s.plain}</p>
                  <More>{s.tech}</More>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* ── 03 The finding ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="03" title="The finding: Account Abstraction hard-breaks" sub="Real user operations revert, and more gas won't save them." /></Reveal>

        <Reveal>
          <ChartFrame title="Hard-break rate by contract" sub="% of 50 recent txs that fail under Glamsterdam (all succeed today)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={[...AA_HARD_BREAKS].sort((a, b) => b.pct - a.pct).map((b) => ({ name: b.name.replace('ERC-4337 ', ''), pct: b.pct }))} margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 55]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={128} tick={{ fill: 'var(--ink)', fontSize: 12.5 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v}%`, 'hard-break']} cursor={{ fill: 'var(--surface-2)', opacity: 0.25 }} />
                <Bar dataKey="pct" isAnimationActive={false} radius={[0, 5, 5, 0]} barSize={22} fill="var(--c-withdrawn)">
                  <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} fill="var(--ink)" fontSize={12} fontFamily="var(--font-geist-mono)" fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Reveal>

        <Reveal>
          <p className="mt-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
            These are the live ERC-4337 contracts that real smart-wallets depend on. The rate is how many of 50 sampled
            recent transactions <span className="text-[var(--ink)]">revert under Glamsterdam but succeed today</span>. Open a
            row for the exact revert and the on-chain proof.
          </p>
          <div className="mt-4 divide-y divide-border/50 border-y border-[var(--border)]/50">
            {AA_HARD_BREAKS.map((b) => <BreakRow key={b.addr} b={b} />)}
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-8 border-l-2 border-[var(--c-withdrawn)]/50 pl-5">
            <p className="text-[16px] font-semibold text-[var(--ink)]">Why AA specifically breaks</p>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              In ERC-4337 the user operation carries a <span className="font-medium text-[var(--ink)]">signed</span>{' '}
              <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 mono text-[14px]">verificationGasLimit</code>. The EntryPoint
              calls the account&apos;s validation with exactly that much gas. Validation reads and writes storage (nonce,
              deposit, account state), which EIP-8037/8038 reprice upward. Validation now needs more gas than the fixed,
              signed limit, so the EntryPoint aborts the whole bundle. Because the limit is signed, it cannot be raised
              without re-signing.
            </p>
            <More label="Mechanism (exact)">
              The EntryPoint calls <code className="mono">account.validateUserOp&#123;gas: verificationGasLimit&#125;(…)</code>. The
              repriced state access (INV-4 hard-coded gas plus INV-7 fixed reserves) pushes validation over budget, and the
              EntryPoint reverts with <code className="mono text-[var(--ink)]">FailedOp(…, &quot;AA26/AA40 over verificationGasLimit&quot;)</code>.
              In-flight and pre-signed userOps fail outright; bundler estimators computing the limit with pre-Glamsterdam
              assumptions will under-estimate and brick bundles. Both EntryPoint v0.6 and v0.7 are affected.
            </More>
          </div>
        </Reveal>

        <Reveal>
          <p className="mt-8 mb-1 text-[16px] leading-relaxed text-[var(--ink-muted)]">
            It is not a near miss. At worst, validation needs hundreds of thousands of gas more than the signed limit
            allows, so no realistic estimate would have covered it.
          </p>
          <ChartFrame title="Worst-case extra gas" sub="how far over budget each break runs">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart layout="vertical" data={[...GAS_DELTA].sort((a, b) => b.delta - a.delta)} margin={{ left: 0, right: 52, top: 4, bottom: 4 }}>
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: 'var(--ink)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`+${v.toLocaleString()} gas`, 'over budget']} cursor={{ fill: 'var(--surface-2)', opacity: 0.25 }} />
                <Bar dataKey="delta" isAnimationActive={false} radius={[0, 5, 5, 0]} barSize={20}>
                  {[...GAS_DELTA].sort((a, b) => b.delta - a.delta).map((d) => (
                    <Cell key={d.name} fill={d.kind === 'aa' ? 'var(--c-withdrawn)' : 'var(--c-review)'} />
                  ))}
                  <LabelList dataKey="delta" position="right" formatter={(v: number) => `+${Math.round(v / 1000)}k`} fill="var(--ink)" fontSize={12} fontFamily="var(--font-geist-mono)" fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Reveal>

        <Reveal>
          <p className="mb-1 mt-10 text-[16px] leading-relaxed text-[var(--ink-muted)]">
            And it is not a rare path. Over the last 24 hours, these two EntryPoints processed{' '}
            <span className="font-semibold text-[var(--ink)]">{BLAST.totalPerDay.toLocaleString()} real user operations</span> on
            mainnet (counted on our own archive node). At the break rates we measured, roughly{' '}
            <span className="font-semibold text-[var(--c-withdrawn)]">{BLAST.totalAtRisk.toLocaleString()} of them a day</span>{' '}
            would fail under Glamsterdam.
          </p>
          <div className="mb-4 mt-4 flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <div className="mono text-[2rem] font-bold leading-none tabular-nums text-[var(--ink)]">~{Math.round(BLAST.totalPerDay / 1000)}k</div>
              <div className="mt-1 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">userOps / day</div>
            </div>
            <div>
              <div className="mono text-[2rem] font-bold leading-none tabular-nums text-[var(--c-withdrawn)]">~{(BLAST.totalAtRisk / 1000).toFixed(1)}k</div>
              <div className="mt-1 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">would fail / day</div>
            </div>
          </div>
          <ChartFrame title="Blast radius: userOps per day" sub="last 24h on mainnet · red = would fail under Glamsterdam">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart layout="vertical" data={BLAST.entryPoints.map((e) => ({ name: e.name, atRisk: e.atRisk, rest: e.perDay - e.atRisk, total: e.perDay }))} margin={{ left: 0, right: 56, top: 4, bottom: 4 }} barCategoryGap={18}>
                <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--ink)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number, n: string) => [`${v.toLocaleString()} userOps`, n === 'atRisk' ? 'would fail under Glamsterdam' : 'rest of daily traffic']} cursor={{ fill: 'var(--surface-2)', opacity: 0.25 }} />
                <Bar dataKey="atRisk" stackId="a" isAnimationActive={false} barSize={22} fill="var(--c-withdrawn)" />
                <Bar dataKey="rest" stackId="a" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={22} fill="var(--border-strong)">
                  <LabelList dataKey="total" position="right" formatter={(v: number) => v.toLocaleString()} fill="var(--ink)" fontSize={11.5} fontFamily="var(--font-geist-mono)" fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--c-withdrawn)' }} />would fail under Glamsterdam</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--border-strong)' }} />rest of daily userOps</span>
            </div>
          </ChartFrame>
        </Reveal>
      </section>

      {/* ── 04 The 8 invariants ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="04" title="Which assumptions break" sub="The hidden rules Glamsterdam can turn false, and how widely each is relied on." /></Reveal>

        <Reveal>
          <p className="mb-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
            An <span className="font-medium text-[var(--ink)]">invariant</span> is an assumption a contract quietly depends
            on, for example &quot;a hard-coded gas amount will always be enough.&quot; The repricing can make some of these
            false. The chart counts how many of the 115 flagged contracts lean on each of the 8 invariants; the two in red
            (INV-4 and INV-7) are the assumptions behind the confirmed account-abstraction breaks.
          </p>
          <ChartFrame title="Invariants relied on" sub="number of flagged contracts · red = behind the confirmed breaks">
            <ResponsiveContainer width="100%" height={270}>
              <BarChart layout="vertical" data={[...INVARIANTS].sort((a, b) => b.count - a.count)} margin={{ left: 0, right: 30, top: 4, bottom: 4 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="id" width={48} tick={{ fill: 'var(--ink)', fontSize: 12.5, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number) => [`${v} contracts`, 'rely on this']} cursor={{ fill: 'var(--surface-2)', opacity: 0.25 }} />
                <Bar dataKey="count" isAnimationActive={false} radius={[0, 5, 5, 0]} barSize={17}>
                  {[...INVARIANTS].sort((a, b) => b.count - a.count).map((iv) => (
                    <Cell key={iv.id} fill={iv.confirmed ? 'var(--c-withdrawn)' : 'var(--ink-muted)'} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="var(--ink)" fontSize={12} fontFamily="var(--font-geist-mono)" fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </Reveal>

        <Reveal>
          <div className="mt-6 divide-y divide-border/50 border-t border-[var(--border)]/50">
            {INVARIANTS.map((iv) => (
              <div key={iv.id} className="py-4">
                <div className="flex items-center gap-2.5">
                  <span className={cn('mono text-sm font-bold', iv.confirmed ? 'text-[var(--c-withdrawn)]' : 'text-[var(--brand-strong)]')}>{iv.id}</span>
                  {iv.confirmed && <span className="rounded-full bg-[var(--c-withdrawn)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--c-withdrawn)]">confirmed break</span>}
                  <span className="ml-auto mono text-[11px] text-[var(--ink-muted)]">{iv.count} / 115</span>
                </div>
                <p className="mt-1.5 text-[16px] font-medium text-[var(--ink)]">{iv.plain}</p>
                <More>{iv.tech}</More>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 05 Secondary ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="05" title="Break vs fixable, and what else moved" sub="Most flagged contracts just need more gas. Only account abstraction truly breaks." /></Reveal>

        <Reveal>
          <div className="mb-4 rounded-lg border-l-2 border-[var(--brand)] bg-[var(--brand)]/5 py-2.5 pl-4 pr-3 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink)]">First, to be clear:</span> every transaction below already
            ran on mainnet and <span className="font-semibold text-[var(--ink)]">succeeded</span>. Under today&apos;s rules
            our replay reproduces that success (0% fail). The bars are failures <span className="font-semibold text-[var(--ink)]">under Glamsterdam&apos;s rules only</span>.
          </div>
          <p className="mb-1 text-[16px] leading-relaxed text-[var(--ink-muted)]">
            Read this one as <span className="text-[var(--ink)]">before and after</span>. The blue bar is how many fail{' '}
            <span className="text-[var(--ink)]">under Glamsterdam with the gas the transaction originally carried</span>.
            The red bar is after we re-run each with triple the gas: the{' '}
            <span className="text-[var(--ink)]">routers drop to zero</span> (they only needed more room), while{' '}
            <span className="text-[var(--ink)]">account abstraction stays exactly where it was</span>. Its limit is signed
            into the request, so adding gas does nothing. That is what makes it a true break, not a fixable one.
          </p>
          <ChartFrame title="Does more gas fix it?" sub="share that fail under Glamsterdam · all succeed on mainnet today">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={GAS_SWEEP} margin={{ left: 0, right: 56, top: 4, bottom: 4 }} barGap={3} barCategoryGap={16}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: 'var(--ink)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} labelStyle={TT_LABEL} itemStyle={TT_ITEM} formatter={(v: number, n: string) => [`${v}% fail under Glamsterdam`, n === 'normal' ? 'with its original gas' : 'with 3× gas']} cursor={{ fill: 'var(--surface-2)', opacity: 0.25 }} />
                <Bar dataKey="normal" name="normal" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={9} fill="var(--ink-muted)">
                  <LabelList dataKey="normal" position="right" formatter={(v: number) => `${v}%`} fill="var(--ink-muted)" fontSize={10.5} fontFamily="var(--font-geist-mono)" />
                </Bar>
                <Bar dataKey="tripled" name="tripled" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={9} fill="var(--c-withdrawn)">
                  <LabelList dataKey="tripled" position="right" formatter={(v: number) => (v === 0 ? '✓ fixed' : `${v}%`)} fill="var(--ink-muted)" fontSize={10.5} fontFamily="var(--font-geist-mono)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--ink-muted)' }} />under Glamsterdam, original gas</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--c-withdrawn)' }} />under Glamsterdam, 3× gas</span>
            </div>
          </ChartFrame>
        </Reveal>

        <Reveal>
          <div className="mt-8 border-l-2 border-[var(--c-review)]/60 pl-5">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-[var(--c-review)]" />
              <p className="text-[16px] font-semibold text-[var(--ink)]">Create-and-throw-away contracts</p>
              <span className="ml-auto mono text-sm font-bold text-[var(--c-review)]">~{(CREATE_SELFDESTRUCT.perDay / 1000).toFixed(1)}k/day</span>
            </div>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              Many flows, like payment processors and bridge aggregators, spin up a throwaway contract (a one-time deposit
              address), sweep the funds, and destroy it in the same transaction. Today that is cheap. Under Glamsterdam it
              is charged the full {CREATE_SELFDESTRUCT.stateGas.toLocaleString()} gas for creating an account even though
              nothing is left behind, so the cost rises up to <span className="font-semibold text-[var(--ink)]">{CREATE_SELFDESTRUCT.costUpTo}</span>.
              We measured <span className="font-semibold text-[var(--ink)]">~{CREATE_SELFDESTRUCT.perDay.toLocaleString()} per day</span> on
              mainnet, in line with the ~{CREATE_SELFDESTRUCT.reportedByEf.toLocaleString()}/day an EF commenter reported.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mono text-[11px] text-[var(--ink-muted)]">verify on-chain:</span>
              {CREATE_SELFDESTRUCT.repro.map((h) => <TxChip key={h} h={h} />)}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div className="border-l-2 border-[var(--border)] pl-4">
              <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[var(--c-review)]" /><p className="text-sm font-semibold text-[var(--ink)]">Out-of-gas (non-AA)</p></div>
              <p className="mb-1 mt-1 text-[13.5px] text-[var(--ink-muted)]">A smaller, different failure: these simply run out of gas on storage-heavy paths.</p>
              <ul className="divide-y divide-border/40 text-[14px] text-[var(--ink-muted)]">
                {OOG_BREAKS.map((o) => (
                  <li key={o.name} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0">
                      {o.unverified ? <span className="mono text-[var(--ink)]">{o.name}</span> : <span>{o.name}</span>}
                      {o.unverified && <span className="ml-1.5 rounded bg-[var(--surface-2)] px-1 py-0.5 mono text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">unverified</span>}
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">{o.note}</span>
                    </span>
                    <span className="shrink-0 mono text-[var(--ink)]">{o.rate}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11.5px] leading-snug text-[var(--ink-muted)]">&quot;Unverified&quot; contracts have no public source on Etherscan, so we can only identify them by address.</p>
            </div>
            <div className="border-l-2 border-[var(--border)] pl-4">
              <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-[var(--c-final)]" /><p className="text-sm font-semibold text-[var(--ink)]">Just needs more gas</p></div>
              <p className="mb-1 mt-1 text-[13.5px] text-[var(--ink-muted)]">Routers and aggregators flip only because the tx gas limit is now too low. Not a contract bug.</p>
              <ul className="divide-y divide-border/40 text-[14px] text-[var(--ink-muted)]">
                {FIXED_GAS.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-2 py-1.5"><span>{f.name}</span><span className="mono text-[var(--ink)]">{f.flips}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 06 Caveats ── */}
      <section className="mt-16">
        <Reveal><SectionHead n="06" title="Caveats" sub="Read before citing." /></Reveal>
        <Reveal>
          <p className="border-l-2 border-[var(--brand)]/50 pl-5 text-sm leading-relaxed text-[var(--ink-muted)]">
            Replay forks state at the parent block and runs the tx first-in-block, so exact gas margins can differ slightly;
            the osaka-success / amsterdam-fail flip controls for replay error. 50 txs per contract is a strong signal, not a
            population rate, so the blast-radius figure (daily userOp volume × that rate) is an order-of-magnitude
            projection rather than a guaranteed count. The daily volumes themselves are exact, counted on our archive node. The per-invariant counts are from the static scan (contracts relying on each assumption), not all
            confirmed by replay; only INV-4 and INV-7 are confirmed here. EIP-8037/8038 are still in flux (rival fixes exist);
            numbers use the pinned <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 mono text-[14px]">glamsterdam-devnet-8</code> schedule
            and should be re-measured if the spec moves. Affected teams were disclosed to privately before this write-up.
          </p>
        </Reveal>
        <Reveal>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)]/50 pt-4 mono text-xs text-[var(--ink-muted)]">
            <span>EIPsInsight gas-audit · scanner → differential replay → confirmed breaks</span>
            <Link href="https://github.com/ethereum/glamsterdam-gas-invariants" target="_blank" className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline">
              glamsterdam-gas-invariants <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Reveal>
      </section>
      </div>
    </div>
  );
}

/* ── Small pieces ── */

function ReplayedTable() {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-9">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)]/80 hover:text-[var(--brand-strong)]"
      >
        <Plus className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-45')} />
        {open ? 'Hide the replayed contracts' : 'See the replayed contracts'}
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-3 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
            The replayed set was the 25 most active flagged contracts. Twelve are individually notable and listed here; the
            rest were high-volume contracts whose transactions passed unchanged or only needed more gas. Each name links to
            Etherscan. &quot;Affected txs&quot; is how many of the 50 sampled transactions the outcome applies to.
          </p>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]/60">
            <table className="w-full min-w-[440px] text-[14px]">
              <thead>
                <tr className="bg-[var(--surface-2)]/30 text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  <th className="px-3 py-2 font-semibold">Contract</th>
                  <th className="px-3 py-2 font-semibold">Outcome</th>
                  <th className="px-3 py-2 text-right font-semibold">Affected txs</th>
                </tr>
              </thead>
              <tbody>
                {REPLAYED.map((c) => {
                  const o = OUTCOME[c.outcome];
                  return (
                    <tr key={c.addr} className="border-t border-[var(--border)]/50">
                      <td className="px-3 py-2">
                        <a href={addrUrl(c.addr)} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ink)] hover:text-[var(--brand-strong)]">{c.name}</a>
                        <span className="ml-2 mono text-[11px] text-[var(--ink-muted)]">{short(c.addr)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: o.color, background: `color-mix(in srgb, ${o.color} 13%, transparent)` }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: o.color }} />{o.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right mono text-[var(--ink-muted)]">{c.rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <figure className="mt-1">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[1.1rem] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">{title}</span>
        <span className="mono text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">{sub}</span>
      </figcaption>
      <div className="w-full">{children}</div>
    </figure>
  );
}

function TxChip({ h }: { h: string }) {
  return (
    <a href={txUrl(h)} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/20 px-2 py-0.5 mono text-[11px] text-[var(--brand-strong)] hover:border-[var(--brand)]/40">
      {short(h)}<ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function BreakRow({ b }: { b: HardBreak }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 text-left">
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-[var(--ink)]">{b.name}</span>
          <span className="mono text-[11px] text-[var(--ink-muted)]">{short(b.addr)}</span>
          <span className="mt-1.5 block text-[14.5px] leading-relaxed text-[var(--ink-muted)]">{b.what}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end leading-none">
          <span className="mono text-base font-bold text-[var(--c-withdrawn)]">{b.rate}</span>
          <span className="mt-1 mono text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">txs fail</span>
          <ChevronDown className={cn('mt-2 h-4 w-4 text-[var(--ink-muted)] transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-l-2 border-[var(--c-withdrawn)]/30 pl-3 text-[14px] text-[var(--ink-muted)]">
          <p>Reverts with <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 mono text-[13.5px] text-[var(--ink)]">{b.mechanism}</code>. At worst, validation needs <span className="font-semibold text-[var(--ink)]">+{b.maxDelta.toLocaleString()} gas</span> more than the signed limit allows.</p>
          <p className="flex flex-wrap items-center gap-2"><span className="mono text-[11px]">verify on-chain:</span>{b.repro.map((h) => <TxChip key={h} h={h} />)}</p>
        </div>
      )}
    </div>
  );
}
