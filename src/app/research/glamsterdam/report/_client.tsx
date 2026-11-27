'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Link2 } from 'lucide-react';
import { PageHead } from '@/components/ledger/page-head';
import { META, INVARIANTS, SCAN, NEWACCT, SELFDESTRUCT, NEWACCT_SENDERS, STATE_REPLAY, AA_STATEBREAK } from '../_data';
import {
  Reveal,
  SerifSectionHead,
  RepricingBars,
  HeadroomChart,
  NewAcctChart,
  InvariantChart,
  CategoryChart,
  DensityChart,
  SelfDestructChart,
  StateReplayChart,
  AaBreakChart,
} from '../_charts';

const fmt = (n: number) => n.toLocaleString();
const linkCls = 'text-[var(--brand-strong)] hover:underline';

function Card({ eyebrow, tone, children }: { eyebrow?: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      {eyebrow ? (
        <p className="mb-2 mono text-[11px] uppercase tracking-wider" style={tone ? { color: `var(${tone})` } : { color: 'var(--brand-strong)' }}>
          {eyebrow}
        </p>
      ) : null}
      <div className="text-[15px] leading-relaxed text-[var(--ink-muted)]">{children}</div>
    </div>
  );
}

const ink = 'font-medium text-[var(--ink)]';

export function GlamsterdamReport() {
  return (
    <div data-ledger className="min-h-screen pb-20">
      <PageHead
        eyebrow="EIPsInsight research · Full report"
        title="Glamsterdam gas audit"
        lead={
          <>
            The method, validation and caveats behind the <span className="font-medium text-[var(--ink)]">EIP-8037 / 8038</span> scan.
            The <Link href="/research/glamsterdam" className="accent hover:underline">numbers and charts live on the research page</Link>; this is the write-up.
          </>
        }
      />

      <div className="wrap py-8 sm:py-12">
        <Link
          href="/research/glamsterdam"
          className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the numbers
        </Link>

        {/* 01 — Summary */}
        <section className="mt-12">
          <Reveal><SerifSectionHead n="01" title="Summary" /></Reveal>
          <Reveal>
            <div className=" space-y-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <p>
                Glamsterdam ships two state-gas repricings. <span className={ink}>EIP-8037</span> raises the cost of{' '}
                <em>creating</em> state and adds a state-gas reservoir; <span className={ink}>EIP-8038</span> reprices state{' '}
                <em>access</em>. No deployed bytecode changes, but the gas every transaction needs does, and code that makes
                fixed assumptions about gas can behave differently.
              </p>
              <p>
                We ran a wide, shallow gas audit: a static scan of the{' '}
                <span className={ink}>{SCAN.scanned} busiest mainnet contracts</span> against the repricing&apos;s
                eight-invariant framework, flagging <span className={ink}>{SCAN.flagged} candidates</span> worth re-checking.
                The flags are candidates for review, <span className={ink}>not confirmed breaks</span>. The headline take: the
                repricing is real, measurable and <span className={ink}>surgical</span> - it hits state-creating operations hard
                and leaves pure execution untouched. Its single largest impact is on <span className={ink}>ERC-4337 account
                abstraction</span>: steady-state validation is fine, but userOps that create state (wallet deployments, first
                SSTOREs) exceed their signed gas limits and break unrescuably (§03).
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <RepricingBars />
            <p className="mt-3 mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">gas per operation · now (Osaka) vs Glamsterdam</p>
          </Reveal>
        </section>

        {/* 02 — Methodology */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="02" title="Research methodology" /></Reveal>
          <Reveal>
            <p className="mb-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              The audit runs on EIPsInsight&apos;s own Ethereum archive node (Reth) and indexers. It is two stages.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Reveal>
              <Card eyebrow="Stage 1 · Static scan">
                Rank the busiest contracts on mainnet over the last {fmt(SCAN.windowBlocks)} blocks, pull their verified
                source, and pattern-match it against the red-flag patterns in{' '}
                <Link href="https://github.com/ethereum/glamsterdam-gas-invariants" target="_blank" className={linkCls}>
                  glamsterdam-gas-invariants
                </Link>{' '}
                (hard-coded gas literals, fixed reserves, refund-dependent accounting, try/catch that swallows failures). A
                match flags the contract. <span className={ink}>{SCAN.flagged} of {SCAN.scanned}</span> matched.
              </Card>
            </Reveal>
            <Reveal delay={0.05}>
              <Card eyebrow="Stage 2 · Differential replay">
                For a transaction under review, fork mainnet state at its parent block so execution sees exactly what the
                network saw, then run it twice: once under current (Osaka) rules, once under Glamsterdam rules, with balance,
                nonce and base-fee checks disabled so the gas schedule is the only variable. A tx that succeeds under Osaka and
                reverts under Glamsterdam is repricing-attributable; the Osaka success is the control.
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card eyebrow="Stage 3 · Node census">
                For population-level effects we query our archive node directly: each day we sample {fmt(NEWACCT.sampledPerDay)}{' '}
                low-gas plain transfers and check, at the parent block, whether the destination was empty (EIP-161: no code,
                nonce 0, balance 0), the exact trigger for the new state-creation cost. See §06.
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 03 — Validation */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="03" title="Validation" /></Reveal>
          <Reveal>
            <div className=" space-y-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <p>
                The question that mattered most: <span className={ink}>does the repricing break ERC-4337 account abstraction?</span>{' '}
                The EntryPoints sit on top of the flagged list by traffic, so the blast radius is enormous. The answer has two
                halves, and getting it right took two passes and one correction.
              </p>
              <p>
                <span className={ink}>Steady-state validation holds.</span> We traced real userOps:{' '}
                <span className="mono text-[13px] text-[var(--ink)]">validateUserOp</span> spends ~15,000 gas against a signed
                ~95,000 <span className="mono text-[13px] text-[var(--ink)]">verificationGasLimit</span> — about 80,000 of
                headroom. The repricing adds only a few thousand gas there, so a userOp that touches only existing state does
                not break. That is why the original &quot;every userOp reverts&quot; claim (34% / 26% / 50%) was a tooling
                artifact: for steady-state ops the headroom is real.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <HeadroomChart />
          </Reveal>
          <Reveal className="mt-10">
            <div className=" space-y-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <p>
                <span className={ink}>But userOps that create state are a different story — and here we first under-called it.</span>{' '}
                Tracing 40 recent userOps per EntryPoint with <span className="mono text-[13px] text-[var(--ink)]">prestateTracer</span>,{' '}
                <span className={ink}>~53% create new state</span>: a wallet deployment (a new account, +{fmt(158600)}) or a
                first-touch SSTORE (a new slot, +{fmt(77920)}). The median state-creating userOp adds +{fmt(155840)} gas; the
                worst we saw on v0.7 added +{fmt(AA_STATEBREAK.entrypoints[0].maxDelta)}.
              </p>
              <p>
                And <span className="mono text-[13px] text-[var(--ink)]">callGasLimit</span> /{' '}
                <span className="mono text-[13px] text-[var(--ink)]">verificationGasLimit</span> are{' '}
                <span className={ink}>signed into the userOp</span>, so they cannot be raised without re-signing.{' '}
                <span className={ink}>{AA_STATEBREAK.entrypoints[0].exceedHeadroom} of {AA_STATEBREAK.entrypoints[0].sampled}</span>{' '}
                v0.7 userOps and {AA_STATEBREAK.entrypoints[1].exceedHeadroom} of {AA_STATEBREAK.entrypoints[1].sampled} v0.6
                create more state-gas than the entire ~{fmt(AA_STATEBREAK.headroom)} validation headroom — they fail, and no
                gas-limit bump rescues them (unrescuable).
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <AaBreakChart />
          </Reveal>
          <Reveal>
            <p className="mt-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              This matches the EF repricing-impact dashboard, which ranks eth-infinitism&apos;s EntryPoints the single
              most-affected entity (millions of unrescuable role-hits, ~150,400 wallet deployments out of gas). The honest
              result: <span className={ink}>the 4337 validation base holds for steady-state userOps, but state-creating userOps —
              deployments and first SSTOREs — break unrescuably, and that is the largest single impact of the repricing</span>.
            </p>
          </Reveal>
        </section>

        {/* 04 — Challenges */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="04" title="Challenges" /></Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Reveal>
              <Card eyebrow="The replay engine, twice">
                Our first differential replay used a gas-schedule build whose accounting was wrong: it produced per-tx deltas
                larger than the whole transaction, a physically impossible result that produced a false AA &quot;hard-break.&quot;
                We then over-corrected to &quot;AA is fine&quot; from a steady-state sample. Both were wrong. The fix was to stop
                trusting any engine and measure state creation deterministically (prestate diff × confirmed EIP deltas) — which
                both kills impossible numbers and catches the real state-creation break (§03).
              </Card>
            </Reveal>
            <Reveal delay={0.05}>
              <Card eyebrow="The scan over-flags">
                It is keyword-based, so it collides with unrelated code. The busiest hit, a Uniswap router, is flagged for
                &quot;fixed gas reserves&quot; on a line that is actually AMM <em>liquidity</em> reserves. And{' '}
                <span className={ink}>{SCAN.lowSignal} of {SCAN.flagged}</span> match only generic proxy patterns, which is low
                signal. Confirming a genuine break needs per-contract review.
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card eyebrow="The spec is moving">
                EIP-8037/8038 are still being finalised, so both the invariant set and the exact gas numbers should be
                re-checked against the shipped spec before any flag is treated as settled.
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 05 — Result analysis */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="05" title="Result analysis" /></Reveal>
          <Reveal>
            <p className="mb-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              The eight invariants are the quiet assumptions a gas repricing can turn false. Each line below is the assumption
              in plain terms, then the mechanism, with an <span className="mono text-[13px] text-[var(--ink)]">X / {SCAN.flagged}</span>{' '}
              tag. Read that as: <span className={ink}>of the {SCAN.flagged} flagged contracts, X contain source that touches
              this assumption</span>. One contract usually matches several, so the counts add up to more than {SCAN.flagged};
              they rank which assumptions appear most across the flagged set, not how many contracts break (none here are
              confirmed breaks).
            </p>
          </Reveal>
          <Reveal className="mb-10">
            <InvariantChart />
          </Reveal>
          <Reveal>
            <div id="invariants" className="scroll-mt-24 divide-y divide-[var(--border)]/60 border-y border-[var(--border)]/60">
              {INVARIANTS.map((iv) => (
                <div key={iv.id} id={iv.id.toLowerCase()} className="scroll-mt-24 py-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 mono text-xs font-bold text-[var(--brand-strong)]">
                      {iv.id}
                    </span>
                    <span className="ml-auto mono text-[11px] text-[var(--ink-faint)]">{iv.count} / {SCAN.flagged} flagged contracts touch this</span>
                  </div>
                  <p className="mt-2 text-[16px] font-medium text-[var(--ink)]">{iv.plain}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink-muted)]">{iv.tech}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="mt-10">
            <p className="mb-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              Two more cuts of the same {SCAN.flagged} flagged contracts: what kind of contract they are, and how many of the
              eight invariants each one matched. The density cut is the honest health check on the scan itself,{' '}
              <span className={ink}>{SCAN.lowSignal} of {SCAN.flagged}</span> match only one or two generic proxy patterns, so
              they are low-signal noise rather than real candidates.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-2">
            <Reveal><CategoryChart /></Reveal>
            <Reveal><DensityChart /></Reveal>
          </div>

          <Reveal className="mt-12">
            <p className="mb-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <span className="text-[1.1rem] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">From candidates to measured.</span>{' '}
              A flag is not a cost. To turn candidates into numbers we traced {STATE_REPLAY.perContract} recent real
              transactions for each of the busiest state-creating contracts with{' '}
              <span className="mono text-[13px] text-[var(--ink)]">prestateTracer</span>, counted the new accounts and new
              storage slots each one actually creates, and applied EIP-8037&apos;s confirmed deltas (+{fmt(STATE_REPLAY.deltaAcct)}{' '}
              per new account, +{fmt(STATE_REPLAY.deltaSlot)} per new slot). No differential EVM, so no number can exceed what
              the transaction really does.
            </p>
            <p className="mb-6 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              The result is that the repricing is <span className={ink}>surgical, not broad</span>. Pure swaps create no new
              state, so a Uniswap V3 swap, the Universal Router and the Aave gateway come out at{' '}
              <span className={ink}>~0 extra gas</span>. The cost lands on state-creating paths: a V3 position mint adds a
              median <span className={ink}>+{fmt(155840)}</span> gas (up to +1.7M on a heavy mint), a first-time Seaport trade
              up to <span className={ink}>+2.3M</span>, and a deposit forwarder a flat +{fmt(314440)} every time.
            </p>
          </Reveal>
          <Reveal>
            <StateReplayChart />
          </Reveal>

          <Reveal>
            <div className="mt-12 rounded-[var(--l-radius)] border border-[var(--brand)]/40 bg-[var(--brand-soft)] p-5">
              <p className="mb-1.5 mono text-[11px] uppercase tracking-wider text-[var(--brand-strong)]">A real adjacent cost, measured on our node</p>
              <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
                Not an EntryPoint break at all: contracts that create a fresh address and self-destruct it within the same
                transaction, the temporary deposit-address pattern used by some intent and bridging flows. We detected these
                on our node with <span className="mono text-[13px] text-[var(--ink)]">trace_block</span>, matching a created
                address that is also destroyed in the same tx, and found{' '}
                <span className={ink}>~{fmt(SELFDESTRUCT.perDayTxs)} such transactions per day</span>, concentrated in a handful
                of factories (one literally named <span className={ink}>EphemeralFactory</span>). Under EIP-8037 each fresh
                account pays the full state-creation cost of <span className={ink}>{fmt(SELFDESTRUCT.stateAfter)} gas</span> (up
                from {fmt(SELFDESTRUCT.stateBefore)}), and because it is destroyed in the same transaction the old refund no
                longer offsets it.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <SelfDestructChart />
          </Reveal>
        </section>

        {/* 06 — Measured impact: new-account transfers */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="06" title="Measured impact: new-account transfers" /></Reveal>
          <Reveal>
            <div className=" space-y-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <p>
                EIP-8037 changes one thing that touches ordinary users, not just contracts: a plain ETH transfer to a{' '}
                <em>new</em> (empty) account now costs <span className={ink}>~{fmt(NEWACCT.gasNeeded)} gas</span> (
                {fmt(NEWACCT.baseGas)} intrinsic + {fmt(NEWACCT.stateGas)} new-account state gas), not the{' '}
                {fmt(NEWACCT.baseGas)} almost everyone still sends. A transfer under that limit is included with a{' '}
                <span className={ink}>failed status</span>: the fee is paid and the nonce consumed, but no ETH moves.
              </p>
              <p>
                We measured it on our own archive node. Each day we sampled {fmt(NEWACCT.sampledPerDay)} low-gas plain
                transfers and checked, at the parent block, whether the destination was empty. Across a week,{' '}
                <span className={ink}>{(NEWACCT.series.reduce((s, d) => s + d.frac, 0) / NEWACCT.series.length * 100).toFixed(0)}%</span>{' '}
                of low-gas plain transfers went to empty accounts, giving a mean of{' '}
                <span className={ink}>~{fmt(NEWACCT.meanPerDay)} transfers per day</span> that would fail as-is, with{' '}
                <span className={ink}>{Math.round(NEWACCT.share21000 * 100)}%</span> of them sitting exactly at the{' '}
                {fmt(NEWACCT.baseGas)}-gas default. Wallets and senders that hard-code {fmt(NEWACCT.baseGas)} need to raise
                their limit before activation.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-8">
            <NewAcctChart />
          </Reveal>
          <Reveal className="mt-10">
            <p className="mb-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <span className="text-[1.1rem] text-[var(--ink)] [font-family:var(--font-instrument-serif)]">Who needs to act.</span>{' '}
              Reading the sender on the same sample: <span className={ink}>{NEWACCT_SENDERS.eoaPct}%</span> of the at-risk
              transfers come from <span className={ink}>EOAs</span> (wallets and exchange hot wallets), only{' '}
              {NEWACCT_SENDERS.contractPct}% from contracts. And they concentrate: the{' '}
              <span className={ink}>top 15 senders alone originate {NEWACCT_SENDERS.top15SharePct}%</span> of them, so a
              handful of high-volume withdrawal wallets could fix a quarter of the problem by raising one gas limit. The
              busiest at scan time:
            </p>
            <div className="flex flex-wrap gap-2">
              {NEWACCT_SENDERS.topSenders.map((a) => (
                <Link
                  key={a}
                  href={`/adoption?address=${a}#lookup`}
                  className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 mono text-[12px] text-[var(--brand-strong)] hover:underline"
                >
                  {a.slice(0, 8)}…{a.slice(-4)}
                  <Link2 className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 07 — Risk summary */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="07" title="Compatibility & risk summary" /></Reveal>
          <div className="space-y-3">
            <Reveal>
              <Card eyebrow="Act - highest impact" tone="--c-lastcall">
                <span className={ink}>ERC-4337 state-creating userOps (wallet deployments, first SSTOREs).</span> ~53% of
                userOps create state; ~1 in 3 exceed the signed validation budget and break <span className={ink}>unrescuably</span>{' '}
                (§03). The single largest impact of the repricing. Bundlers, SDKs and smart-account/factory authors must act;
                account migration may be required.
              </Card>
            </Reveal>
            <Reveal>
              <Card eyebrow="Low risk" tone="--c-final">
                <span className={ink}>ERC-4337 steady-state validation.</span> A userOp that touches only existing state runs
                well inside its signed budget (~15k used of ~95k); that path does not break. The risk is state creation, above.
              </Card>
            </Reveal>
            <Reveal>
              <Card eyebrow="Watch / re-test" tone="--c-review">
                <span className={ink}>Position managers and state-creating paths.</span> Measured (§05): a V3 position mint adds
                a median +{fmt(155840)} gas (up to +1.7M), a deposit forwarder +{fmt(314440)}. Pure swaps are ~0. Most are
                user-fixable by raising the gas limit, but relayers and fixed-limit integrations should re-estimate.
              </Card>
            </Reveal>
            <Reveal>
              <Card eyebrow="Act" tone="--c-lastcall">
                <span className={ink}>Create-and-self-destruct deposit-address flows.</span> ~{fmt(SELFDESTRUCT.perDayTxs)}/day
                on mainnet (§05), now {fmt(SELFDESTRUCT.stateAfter)} gas per fresh account vs {fmt(SELFDESTRUCT.stateBefore)},
                unrefunded. Teams using the temporary deposit-address pattern should re-cost it and consider CREATE2
                counterfactual addresses instead.
              </Card>
            </Reveal>
            <Reveal>
              <Card eyebrow="Act" tone="--c-lastcall">
                <span className={ink}>Plain transfers to new accounts at the {fmt(NEWACCT.baseGas)}-gas default.</span> ~{fmt(NEWACCT.meanPerDay)}/day
                would fail under EIP-8037 (§06). Wallets, exchanges and any pre-signed or hard-coded {fmt(NEWACCT.baseGas)}-gas
                flow must raise the limit to ~{fmt(NEWACCT.gasNeeded)} before activation.
              </Card>
            </Reveal>
          </div>
        </section>

        {/* 08 — Sources */}
        <section className="mt-16">
          <Reveal><SerifSectionHead n="08" title="Sources" /></Reveal>
          <Reveal>
            <ul className="ml-1 space-y-2 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              <li>
                <Link href="https://github.com/ethereum/glamsterdam-gas-invariants" target="_blank" className={linkCls}>
                  ethereum/glamsterdam-gas-invariants <ExternalLink className="inline h-3 w-3" />
                </Link>{' '}
                · the eight-invariant framework the scan keys on.
              </li>
              <li>EIP-8037 / EIP-8038 · the state-gas repricings entering Glamsterdam.</li>
              <li>
                EIPsInsight archive node (Reth) + static scan <span className="mono text-[12px]">audit-{META.published}</span>:
                every flagged contract is linked to the EIPsInsight contract inspector on the research page.
              </li>
              <li>
                EIPsInsight archive node + transaction index: the new-account transfer census (§06), sampled{' '}
                {fmt(NEWACCT.sampledPerDay)}/day over a week of live mainnet activity.
              </li>
              <li>
                EIPsInsight archive node <span className="mono text-[12px]">trace_block</span>: the create-and-self-destruct
                census (§05), {fmt(SELFDESTRUCT.sampledBlocks)} blocks sampled across ~2 days.
              </li>
              <li>
                EIPsInsight archive node <span className="mono text-[12px]">prestateTracer</span>: the per-contract
                state-creation measurement (§05) and the EntryPoint userOp measurement (§03), 40 real userOps per EntryPoint.
              </li>
              <li>
                <Link href="https://ethereum.github.io/repricing-impact/entity-report.html" target="_blank" className={linkCls}>
                  EF repricing-impact dashboard <ExternalLink className="inline h-3 w-3" />
                </Link>{' '}
                · cross-checked against our own node measurements; ranks the EntryPoints the most-affected entity.
              </li>
            </ul>
          </Reveal>
          <Reveal>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <Link
                href="/research/glamsterdam"
                className="inline-flex items-center gap-1.5 mono text-xs font-semibold uppercase tracking-wider text-[var(--brand-strong)] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to the numbers
              </Link>
              <span className="mono text-xs text-[var(--ink-muted)]">
                Updated · <span className="text-[var(--ink)]">{META.published}</span>
              </span>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
