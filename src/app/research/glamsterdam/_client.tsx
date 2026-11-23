'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHead } from '@/components/ledger/page-head';
import { META, SCAN, FLAGGED, NEWACCT, SCANNED } from './_data';
import {
  Reveal,
  RepricingBars,
  InvariantChart,
  CategoryChart,
  DensityChart,
  ActivityChart,
  NewAcctChart,
} from './_charts';

const addrUrl = (a: string) => `https://etherscan.io/address/${a}`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const fmt = (n: number) => n.toLocaleString();

/* Ledger section head: brand lead-in on an ink rule, index + serif title. */
function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-6">
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

export function GlamsterdamResearch() {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? FLAGGED : FLAGGED.slice(0, 20);
  const [showScan, setShowScan] = useState(false);
  const scanShown = showScan ? SCANNED : SCANNED.slice(0, 24);

  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight research · Gas-audit"
        title="What Glamsterdam reprices"
        lead={
          <>
            A gas audit of <span className="font-medium text-[var(--ink)]">EIP-8037 / 8038</span> against the{' '}
            <span className="accent">busiest mainnet contracts</span>.
          </>
        }
      >
        <span className="mono text-xs">Fork · <span className="text-[var(--ink)]">{META.fork}</span></span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">{META.eips}</span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">Updated · <span className="text-[var(--ink)]">{META.published}</span></span>
      </PageHead>

      <div className="wrap py-8 sm:py-12">
        {/* 01 — the repricing, in numbers */}
        <section className="mt-2">
          <Reveal>
            <SectionHead n="01" title="The repricing, in numbers" />
          </Reveal>
          <Reveal>
            <RepricingBars />
            <p className="mt-3 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">gas per operation · now (Osaka) vs Glamsterdam</p>
          </Reveal>
        </section>

        {/* 02 — live impact: new-account transfers (our node) */}
        <section className="mt-16">
          <Reveal>
            <SectionHead n="02" title="A live, measurable impact" />
          </Reveal>
          <Reveal>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="mono text-[2.2rem] font-bold leading-none tabular-nums text-[var(--c-review)]">~{fmt(NEWACCT.meanPerDay)}</div>
                <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">transfers/day would fail</div>
              </div>
              <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="mono text-[2.2rem] font-bold leading-none tabular-nums text-[var(--ink)]">{fmt(NEWACCT.gasNeeded)}</div>
                <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">gas now needed (was {fmt(NEWACCT.baseGas)})</div>
              </div>
              <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="mono text-[2.2rem] font-bold leading-none tabular-nums text-[var(--ink)]">{Math.round(NEWACCT.share21000 * 100)}%</div>
                <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">of them still send {fmt(NEWACCT.baseGas)} gas</div>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <NewAcctChart />
          </Reveal>
        </section>

        {/* 03 — the scan */}
        <section className="mt-16">
          <Reveal>
            <SectionHead n="03" title="The scan" />
          </Reveal>

          {/* funnel */}
          <Reveal>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
              {[
                { v: SCAN.scanned, k: 'busiest contracts scanned', w: 'sm:flex-[3]' },
                { v: SCAN.flagged, k: 'flagged for review', w: 'sm:flex-[2]' },
                { v: SCAN.lowSignal, k: 'low-signal (likely noise)', w: 'sm:flex-[1]', warn: true },
              ].map((s, i) => (
                <div
                  key={s.k}
                  className={cn(
                    'flex flex-col justify-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5',
                    s.w,
                    i > 0 && 'sm:ml-3',
                  )}
                >
                  <div className={cn('mono text-[2rem] font-bold leading-none tabular-nums', s.warn ? 'text-[var(--c-review)]' : 'text-[var(--ink)]')}>{fmt(s.v)}</div>
                  <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{s.k}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* charts */}
          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-2">
            <Reveal><InvariantChart /></Reveal>
            <Reveal><CategoryChart /></Reveal>
            <Reveal className="lg:col-span-2"><DensityChart /></Reveal>
          </div>

          {/* the scanned universe — full traceability for the 300 */}
          <Reveal>
            <p className="mt-12 mb-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              The full scanned set: the <span className="font-medium text-[var(--ink)]">300 busiest mainnet contracts</span> over
              the scan window, ranked by activity, each on Etherscan so anyone can check. Rows marked{' '}
              <span className="mono text-[10px] uppercase tracking-wider text-[var(--c-review)]">flagged</span> matched one or
              more invariant patterns (detailed in the next section).
            </p>
            <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)]">
              <table className="w-full min-w-[560px] text-[14px]">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    <th className="w-8 px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Contract</th>
                    <th className="px-3 py-2 font-semibold">Address</th>
                    <th className="px-3 py-2 font-semibold">Txs (scan window)</th>
                    <th className="px-3 py-2 font-semibold">Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {scanShown.map((c, i) => (
                    <tr key={c.a} className="border-t border-[var(--border)]/60">
                      <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-[var(--ink-faint)]">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--ink)]">{c.n || <span className="text-[var(--ink-faint)]">(unverified source)</span>}</td>
                      <td className="px-3 py-2.5">
                        <a href={addrUrl(c.a)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mono text-[12px] text-[var(--brand-strong)] hover:underline">
                          {short(c.a)}<ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-3 py-2.5 mono tabular-nums text-[var(--ink-muted)]">{fmt(c.t)}</td>
                      <td className="px-3 py-2.5">
                        {c.f ? (
                          <span className="mono text-[10px] uppercase tracking-wider text-[var(--c-review)]">flagged</span>
                        ) : (
                          <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">clear</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setShowScan((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline"
            >
              <Plus className={cn('h-3.5 w-3.5 transition-transform', showScan && 'rotate-45')} />
              {showScan ? 'Show fewer' : `Show all ${SCANNED.length}`}
            </button>
          </Reveal>
        </section>

        {/* 04 — the flagged contracts */}
        <section className="mt-16">
          <Reveal>
            <SectionHead n="04" title="The flagged contracts" />
          </Reveal>

          <Reveal>
            <ActivityChart n={12} />
          </Reveal>

          <Reveal>
            <div className="mt-10 overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)]">
              <table className="w-full min-w-[560px] text-[14px]">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                    <th className="w-8 px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Contract</th>
                    <th className="px-3 py-2 font-semibold">Address</th>
                    <th className="px-3 py-2 font-semibold">Txs (scan window)</th>
                    <th className="px-3 py-2 font-semibold">Invariants</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c, i) => (
                    <tr key={c.addr} className="border-t border-[var(--border)]/60">
                      <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-[var(--ink-faint)]">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--ink)]">{c.name || <span className="text-[var(--ink-muted)]">(verified, unnamed)</span>}</td>
                      <td className="px-3 py-2.5">
                        <a href={addrUrl(c.addr)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mono text-[12px] text-[var(--brand-strong)] hover:underline">
                          {short(c.addr)}<ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-3 py-2.5 mono tabular-nums text-[var(--ink-muted)]">{fmt(c.txs)}</td>
                      <td className="px-3 py-2.5 mono text-[12px] text-[var(--ink-muted)]">{c.invs.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {FLAGGED.length > 20 ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline"
              >
                <Plus className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-45')} />
                {showAll ? 'Show fewer' : `Show all ${SCAN.flagged}`}
              </button>
            ) : null}
          </Reveal>

          {/* report footer link */}
          <Reveal>
            <Link
              href="/research/glamsterdam/report"
              className="mt-10 inline-flex items-center gap-2 mono text-xs font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline"
            >
              Read the full report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
