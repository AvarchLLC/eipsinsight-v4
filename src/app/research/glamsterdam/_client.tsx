'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Link2 } from 'lucide-react';
import { PageHead } from '@/components/ledger/page-head';
import { META, SCAN, FLAGGED, NEWACCT, SCANNED, COMPOSITION } from './_data';
import {
  Reveal,
  RepricingBars,
  InvariantChart,
  CategoryChart,
  DensityChart,
  ActivityChart,
  NewAcctChart,
  CompositionDonut,
  CompositionOverTime,
  StateGasPerDayChart,
  DeltaHistogram,
  classify,
} from './_charts';
import { ContractsTable, type ContractRow } from './_contracts-table';

const fmt = (n: number) => n.toLocaleString();

// Join: every scanned contract carries its category (Kind) and, when flagged,
// the invariant ids it matched (looked up from the flagged set by address).
const invByAddr = new Map(FLAGGED.map((f) => [f.addr.toLowerCase(), f.invs]));
const SCANNED_ROWS: ContractRow[] = SCANNED.map((c, i) => ({
  rank: i + 1,
  name: c.n,
  addr: c.a,
  txs: c.t,
  kind: classify(c.n || ''),
  flagged: c.f,
  invs: invByAddr.get(c.a.toLowerCase()) ?? [],
}));
const FLAGGED_ROWS: ContractRow[] = FLAGGED.map((c, i) => ({
  rank: i + 1,
  name: c.name,
  addr: c.addr,
  txs: c.txs,
  kind: classify(c.name),
  flagged: true,
  invs: c.invs,
}));

/* Ledger section head: brand lead-in on an ink rule, serif title, copy-link anchor. */
function SectionHead({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      window.history.replaceState(null, '', `#${id}`);
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div id={id} className="group mb-6 scroll-mt-24">
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="flex items-center gap-2.5">
        <h2 className="text-[1.9rem] leading-[1.05] text-[var(--ink)] [font-family:var(--font-instrument-serif)] sm:text-[2.3rem]">
          {title}
        </h2>
        <button
          type="button"
          onClick={copy}
          title="Copy link to this section"
          aria-label="Copy link to this section"
          className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-[var(--brand-strong)]" />
          ) : (
            <Link2 className="h-4 w-4 text-[var(--ink-faint)] hover:text-[var(--brand-strong)]" />
          )}
        </button>
      </div>
    </div>
  );
}

export function GlamsterdamResearch() {
  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight research · Gas audit"
        title="What Glamsterdam Repricer changes"
        lead={
          <>
            EIP-8037 and EIP-8038 reprice state-creating operations. Audited on Sepolia against the{' '}
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

      <div className="wrap py-6 sm:py-8">
        {/* the repricing, in numbers */}
        <section className="mt-2">
          <Reveal>
            <SectionHead id="repricing" title="The repricing, in numbers" />
          </Reveal>
          <Reveal>
            <RepricingBars />
            <p className="mt-3 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">gas per operation · now (Osaka) vs Glamsterdam</p>
          </Reveal>
        </section>

        {/* how it lands on mainnet: state-impact composition */}
        <section className="mt-8">
          <Reveal>
            <SectionHead id="mainnet" title="How it lands on mainnet" />
          </Reveal>
          <Reveal>
            <p className="mb-6 max-w-[52rem] text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Classifying mainnet traffic by what EIP-8037 does to it, measured on our own node:{' '}
              <span className="font-medium text-[var(--ink)]">{COMPOSITION.pctNo}%</span> of transactions create no new state and
              are unaffected; <span className="font-medium text-[var(--ink)]">{COMPOSITION.pctState}%</span> create state and pay
              the surcharge (usually fixable by raising the gas limit); and{' '}
              <span className="font-medium text-[var(--ink)]">{COMPOSITION.pctAa}%</span> run through an ERC-4337 EntryPoint where
              the limit is signed and the shortfall is unrescuable.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
            <Reveal><CompositionDonut /></Reveal>
            <Reveal><CompositionOverTime /></Reveal>
          </div>

          {/* exact-day headline — every tx, no sampling */}
          <Reveal>
            <div className="mt-8 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5 sm:p-6">
              <p className="mb-4 flex flex-wrap items-baseline gap-x-2 text-[15px] text-[var(--ink-muted)]">
                <span className="text-[1.05rem] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">One day, every transaction.</span>
                <span>On {COMPOSITION.exact.date} we classified all {fmt(COMPOSITION.exact.totalTx)} mainnet transactions - not a sample, no per-block cap.</span>
              </p>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {[
                  { v: `${(COMPOSITION.exact.stateGasDay / 1e9).toFixed(1)}B`, k: 'gas of state-creation added, that day' },
                  { v: fmt(COMPOSITION.exact.newSlots), k: 'new storage slots created' },
                  { v: fmt(COMPOSITION.exact.newAccounts), k: 'new accounts created' },
                  { v: `${COMPOSITION.exact.pctState}%`, k: 'of txs create state (exact)' },
                ].map((s) => (
                  <div key={s.k}>
                    <div className="mono text-[1.6rem] font-bold leading-none tabular-nums text-[var(--ink)]">{s.v}</div>
                    <div className="mt-1.5 mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
            <Reveal><StateGasPerDayChart /></Reveal>
            <Reveal><DeltaHistogram /></Reveal>
          </div>
          <Reveal>
            <p className="mt-4 mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
              Seven consecutive days · {fmt(COMPOSITION.week.txseen)} transactions classified · {(COMPOSITION.week.stateGas / 1e9).toFixed(0)}B gas of state-creation surcharge in all · {fmt(COMPOSITION.week.newAccounts)} new accounts, {fmt(COMPOSITION.week.newSlots)} new slots
            </p>
          </Reveal>
        </section>

        {/* live impact: new-account transfers (our node) */}
        <section className="mt-8">
          <Reveal>
            <SectionHead id="impact" title="A live, measurable impact" />
          </Reveal>
          <Reveal>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        {/* the scan */}
        <section className="mt-8">
          <Reveal>
            <SectionHead id="scan" title="The scan" />
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
                  className={`flex flex-col justify-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5 ${s.w} ${i > 0 ? 'sm:ml-3' : ''}`}
                >
                  <div className={`mono text-[2rem] font-bold leading-none tabular-nums ${s.warn ? 'text-[var(--c-review)]' : 'text-[var(--ink)]'}`}>{fmt(s.v)}</div>
                  <div className="mt-1.5 mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">{s.k}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* charts */}
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-2">
            <Reveal><InvariantChart /></Reveal>
            <Reveal><CategoryChart /></Reveal>
            <Reveal className="lg:col-span-2"><DensityChart /></Reveal>
          </div>

          {/* Contract Research: the 300 busiest mainnet contracts */}
          <Reveal>
            <div className="mt-8">
              <SectionHead id="contract-research" title="Contract Research" />
            </div>
            <p className="mb-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              The <span className="font-medium text-[var(--ink)]">300 busiest mainnet contracts</span> over the scan window,
              linked to the EIPsInsight contract inspector. Rows carrying invariant IDs matched patterns in{' '}
              <a
                href="https://github.com/ethereum/glamsterdam-gas-invariants"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-strong)] hover:underline"
              >
                glamsterdam-gas-invariants
              </a>
              ; <span className="mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">clear</span> rows did not.
            </p>
            <ContractsTable rows={SCANNED_ROWS} showScan pageSize={10} />
          </Reveal>
        </section>

        {/* Contract Audit: the flagged contracts */}
        <section className="mt-8">
          <Reveal>
            <SectionHead id="contract-audit" title="Contract Audit" />
          </Reveal>

          <Reveal>
            <ActivityChart n={12} />
          </Reveal>

          <Reveal>
            <p className="mt-6 mb-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              All <span className="font-medium text-[var(--ink)]">{SCAN.flagged} flagged contracts</span>, by match density.
              Each shows the{' '}
              <a
                href="https://github.com/ethereum/glamsterdam-gas-invariants"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-strong)] hover:underline"
              >
                invariant patterns
              </a>{' '}
              its source matched: a candidate for review, not a confirmed break.
            </p>
            <ContractsTable rows={FLAGGED_ROWS} pageSize={10} />
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
