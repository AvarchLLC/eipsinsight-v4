import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  GitPullRequest,
  Layers,
  MessagesSquare,
  Package,
  Server,
} from 'lucide-react';
import { AaFocusCharts } from '@/components/aa-focus-charts';

export const revalidate = 300;

// Curated tracker for EIP-8141 (Frame Transactions / native AA). Facts are sourced
// from the Native AA breakouts (/aa/calls) and All Core Devs calls; each timeline
// row and devnet release links to a public source. The live source of truth is the
// Calls tab, which auto-updates from ethereum/pm.

type MileStone = { date: string; label: string; kind: 'done' | 'now' | 'next'; source?: string };
const TIMELINE: MileStone[] = [
  { date: 'Mar 26, 2026', label: "CFI'd for Hegota as a non-headliner (ACDE)", kind: 'done' },
  { date: 'Aug 27, 2026', label: "SFI'd for Hegota (ACDE #244), spec may still change", kind: 'done' },
  { date: 'Sep 10, 2026', label: 'Confirmed as the Hegota headliner (ACDE #245)', kind: 'done' },
  { date: 'Sep 22, 2026', label: 'Frame Transaction Breakout #5: max verified gas raised to 500K; breakouts move to a bi-weekly cadence', kind: 'done' },
  { date: 'Sep 24, 2026', label: 'frames-devnet-0 went live — first EIP-8141 frame transactions on a public devnet (block 2130)', kind: 'now' },
  { date: 'By Nov 3, 2026', label: 'Hegota scoping to complete by DEVCON', kind: 'next' },
];

type Release = { tag: string; date: string; url: string; tracker: string; notes: string[] };
const RELEASES: Release[] = [
  {
    tag: 'frames-devnet@v0.3.0',
    date: 'Sep 4, 2026',
    url: 'https://github.com/ethereum/execution-specs/releases/tag/tests-frames-devnet@v0.3.0',
    tracker: 'https://github.com/ethereum/execution-specs/issues/3532',
    notes: [
      'Mainline sync, EIP-8141 spec unchanged; rebased onto forks/amsterdam (Glamsterdam spec).',
      'EIP-8037: successful child merge repays spilled state gas from the reservoir (fixes gas_left after cross-frame refunds).',
      'EIP-7778: block gas accounting and admission coverage across all transaction types.',
    ],
  },
  {
    tag: 'frames-devnet@v0.2.0',
    date: 'Sep 4, 2026',
    url: 'https://github.com/ethereum/execution-specs/releases/tag/tests-frames-devnet@v0.2.0',
    tracker: 'https://github.com/ethereum/execution-specs/issues/3521',
    notes: [
      '~5.2k frame-transaction variants of the convertible legacy state tests (_frame_tx fixtures).',
      'EIP-8141: block execution gas accounted before refunds per EIP-7778; payer and receipt stay post-refund.',
      'EIP-8141: spent gas pinned across refill rollbacks (batch unroll & frame revert).',
    ],
  },
  {
    tag: 'frames-devnet@v0.1.0',
    date: 'Aug 26, 2026',
    url: 'https://github.com/ethereum/execution-specs/releases/tag/tests-frames-devnet@v0.1.0',
    tracker: 'https://github.com/ethereum/execution-specs/issues/3415',
    notes: [
      'EIP-8141: two-dimensional frame gas, SIGDATACOPY, relaxed banned-opcode list.',
      'EIP-8141: frame target access charged at frame entry; precompiles dispatch in VERIFY frames.',
      'EIP-8141: approval scope statically banned on atomic batches.',
    ],
  },
];

type Client = { name: string; status: 'ready' | 'pending'; note: string };
const CLIENTS: Client[] = [
  { name: 'ethrex', status: 'ready', note: 'Reference implementation; runs a public Frame Transactions testnet.' },
  { name: 'Geth', status: 'ready', note: 'Passing the frames-devnet-0 test suite.' },
  { name: 'Nethermind', status: 'ready', note: 'Passing the suite; joined the ethrex public testnet as a validator.' },
  { name: 'Besu', status: 'pending', note: 'No implementation yet; designating a point person (per Breakout #4).' },
];

// Active design threads surfaced in the recent Native AA / Frame Transaction
// breakouts (latest: Breakout #5, Sep 22 2026). See the Calls tab for sources.
type Thread = { title: string; blurb: string };
const OPEN_THREADS: Thread[] = [
  {
    title: 'Frame-transaction JSON-RPC is underspecified',
    blurb: 'viem (jxom) flagged missing eth_estimateGas, eth_fillTransaction, and simulation support; lightclient favours an eth_simulateV2 that extends V1 with frame modes and multidimensional gas.',
  },
  {
    title: 'EIP-8130 ⇄ EIP-8141 harmonization',
    blurb: 'An ERC effort (Ethlabs) to align the two native-AA designs across the 5792 wallet-call API, 7715/7710 permissions, clear signing, privacy, and cross-chain batching.',
  },
  {
    title: 'Multidimensional fees',
    blurb: 'EIP-7999 proposes a single unified max fee; a byte-denominated state limit and several EVM gas-accounting models are under discussion, looping in the EIP-8037 gas-accounting work.',
  },
];

type Related = { eip: string; title: string; blurb: string };
const RELATED: Related[] = [
  { eip: '8130', title: 'Direct dispatch / codeless accounts', blurb: 'Base-led design; collaboration underway with 8141 on a shared tx type or account interoperability.' },
  { eip: '8037', title: 'Child-frame state-gas reservoir', blurb: 'Cross-frame state-gas fix approved for Glamsterdam; consistency work landed in the frames devnet.' },
  { eip: '8272', title: 'Recent Roots', blurb: 'Proposed to move out of the tx envelope into a canonical frame/mempool rule to avoid a protocol change.' },
  { eip: '7778', title: 'Block-level gas accounting', blurb: 'Accounts block execution gas before refunds. The accounting model the frame tests build on.' },
];

export default function Eip8141OverviewPage() {
  return (
    <div className="space-y-4">
      {/* Two-column on large screens so the width is used instead of stretched. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Inclusion status timeline */}
        <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <GitPullRequest className="h-4 w-4 text-primary" /> Inclusion status
          </h3>
          <ol className="relative mt-4 space-y-4 border-l border-border/70 pl-5">
            {TIMELINE.map((m, i) => (
              <li key={i} className="relative">
                <span
                  className={
                    'absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ' +
                    (m.kind === 'now' ? 'bg-emerald-500' : m.kind === 'next' ? 'bg-amber-500' : 'bg-muted-foreground/60')
                  }
                  aria-hidden
                />
                <p className="text-xs font-mono text-muted-foreground">{m.date}</p>
                <p className={'text-sm ' + (m.kind === 'now' ? 'font-semibold text-foreground' : 'text-foreground/90')}>{m.label}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Client implementation status */}
        <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Server className="h-4 w-4 text-primary" /> Client implementation status
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLIENTS.map((c) => (
              <div key={c.name} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3.5">
                {c.status === 'ready' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <span className={'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' + (c.status === 'ready' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}>
                      {c.status === 'ready' ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Devnet spec-test releases */}
        <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
              <Package className="h-4 w-4 text-primary" /> Devnet &amp; spec-test releases
            </h3>
            <span className="text-[11px] text-muted-foreground">frames-devnet-0 · Geth / ethrex / Nethermind passing</span>
          </div>
          <div className="mt-4 space-y-3">
            {RELEASES.map((r) => (
              <div key={r.tag} className="rounded-lg border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary hover:underline">
                    {r.tag} <ArrowUpRight className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">{r.date}</span>
                    <a href={r.tracker} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                      test tracker
                    </a>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {r.notes.map((n, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-border" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Related EIP cluster */}
        <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Layers className="h-4 w-4 text-primary" /> Related EIP cluster
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {RELATED.map((r) => (
              <Link
                key={r.eip}
                href={`/eip/${r.eip}`}
                className="group rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">EIP-{r.eip}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Open design threads (from the recent breakouts) */}
        <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <MessagesSquare className="h-4 w-4 text-primary" /> Open design threads
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">Active in the Native AA breakouts (latest #5, Sep 22).</p>
          <div className="mt-4 space-y-3">
            {OPEN_THREADS.map((t) => (
              <div key={t.title} className="rounded-lg border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{t.blurb}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Existing AA demand (7702 + 4337) that native, in-protocol AA would serve. */}
      <AaFocusCharts mode="demand" />
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        The chart above is existing account-abstraction activity (EIP-7702 + ERC-4337), not EIP-8141&apos;s own usage.
        It is the demand native, in-protocol AA would serve. Once Frames activate on a public testnet, their own usage
        charts will appear here. For the latest decisions, see the{' '}
        <Link href="/aa/calls" className="text-primary hover:underline">Calls</Link> tab.
      </div>
    </div>
  );
}
