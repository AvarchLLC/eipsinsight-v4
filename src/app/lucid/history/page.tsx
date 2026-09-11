'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  History,
  GitBranch,
  ShieldAlert,
  Layers,
  ArrowRight,
  Sparkles,
  BookOpen,
  Lock,
  EyeOff,
  Scale,
  Zap,
  Users,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterCategory = 'all' | 'mev-pipeline' | 'eips';

interface EvolutionaryStep {
  step: string;
  title: string;
  category: 'mev-pipeline' | 'eips';
  tag: string;
  status: 'Historical' | 'Live' | 'In Development' | 'Proposed';
  description: string;
  significance: string;
  link?: string;
}

const STEPS: EvolutionaryStep[] = [
  {
    step: '01',
    title: 'Public Transaction Mempool',
    category: 'mev-pipeline',
    tag: 'Base Layer (2015+)',
    status: 'Historical',
    description: 'Ethereum nodes maintain local pools of pending unencrypted transactions gossiped across the peer network.',
    significance: 'Open and permissionless, but leaves all transaction parameters visible before block inclusion.',
  },
  {
    step: '02',
    title: 'The Emergence of MEV',
    category: 'mev-pipeline',
    tag: 'Maximal Extractable Value',
    status: 'Historical',
    description: 'Searchers inspect pending mempool transactions to extract profit via arbitrage, liquidations, and sandwich attacks.',
    significance: 'Demonstrated that transaction ordering itself possesses substantial economic value.',
  },
  {
    step: '03',
    title: 'Specialized Block Builders',
    category: 'mev-pipeline',
    tag: 'Block Construction',
    status: 'Historical',
    description: 'Block construction shifts from simple validator sorting to specialized builders optimizing block profitability.',
    significance: 'Began the separation between entity proposing blocks and entity constructing transaction bundles.',
  },
  {
    step: '04',
    title: 'PBS & MEV-Boost',
    category: 'mev-pipeline',
    tag: 'Off-Protocol PBS (2022)',
    status: 'Live',
    description: 'Post-Merge architecture where validators outsource execution block building to builders through trusted relays.',
    significance: 'Democratized MEV rewards for validators but concentrated block construction power among a small set of builders.',
  },
  {
    step: '05',
    title: 'Builder Censorship & Concentration',
    category: 'mev-pipeline',
    tag: 'Centralization Threat',
    status: 'Historical',
    description: 'A small group of specialized builders came to control block construction, creating the capability to censor transactions.',
    significance: 'Highlighted the core risk: whoever controls block building controls inclusion.',
  },
  {
    step: '06',
    title: 'EIP-7547: Inclusion Lists',
    category: 'eips',
    tag: 'EIP-7547',
    status: 'Superseded' as any,
    description: 'Proposed allowing individual block proposers to specify transactions that builders must include in their payloads.',
    significance: 'First major effort to restore proposer inclusion authority under Proposer-Builder Separation.',
    link: '/eip/7547',
  },
  {
    step: '07',
    title: 'EIP-7805: FOCIL (Fork-Choice Inclusion Lists)',
    category: 'eips',
    tag: 'EIP-7805',
    status: 'In Development',
    description: 'Committee-based inclusion lists enforced directly by consensus attesters through fork choice rules.',
    significance: 'Makes transaction inclusion a protocol consensus requirement rather than relying on single proposers.',
    link: '/eip/7805',
  },
  {
    step: '08',
    title: 'Private Order Flow Proliferation',
    category: 'mev-pipeline',
    tag: 'Private Relays',
    status: 'Live',
    description: 'Users send transactions to private RPC endpoints to avoid public mempool sandwiching.',
    significance: 'Protects users from front-running but risks starving the public mempool and centralizing order flow.',
  },
  {
    step: '09',
    title: 'EIP-7732: Enshrined PBS (ePBS)',
    category: 'eips',
    tag: 'EIP-7732',
    status: 'In Development',
    description: 'Moves Proposer-Builder Separation from off-protocol MEV-Boost directly into Ethereum consensus rules.',
    significance: 'Establishes in-protocol builder bids and Payload Timeliness Committees (PTCs).',
    link: '/eip/7732',
  },
  {
    step: '10',
    title: 'EIP-8184: LUCID Encrypted Mempool',
    category: 'eips',
    tag: 'EIP-8184',
    status: 'Proposed',
    description: 'Public encrypted transaction inclusion with commit-before-reveal semantics using Sealed Transactions and key release.',
    significance: 'Combines public permissionless inclusion with hidden transaction intent to eliminate front-running and sandwiching.',
    link: '/eip/8184',
  },
  {
    step: '11',
    title: 'EIP-7886: Delayed Execution',
    category: 'eips',
    tag: 'EIP-7886',
    status: 'Draft',
    description: 'Separates consensus block attestation from execution state processing to prevent bottlenecking validator nodes.',
    significance: 'Allows complex payload processing without slowing down time-critical consensus voting.',
    link: '/eip/7886',
  },
];

export default function LucidHistoryPage() {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const filteredSteps = STEPS.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'mev-pipeline') return s.category === 'mev-pipeline';
    if (filter === 'eips') return s.category === 'eips';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 via-card to-background p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
              <History className="h-3.5 w-3.5" /> Protocol Architecture & MEV Genealogy
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              From Public Mempools to LUCID Encrypted Inclusion
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The evolution of transaction visibility, ordering power, and censorship resistance in Ethereum: tracing how public mempool MEV led to PBS, inclusion lists (FOCIL), and LUCID (EIP-8184).
            </p>
          </div>
          <div className="shrink-0 flex sm:flex-col gap-2">
            <a
              href="#quick-ref"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 transition-colors"
            >
              <BookOpen className="h-4 w-4" /> Quick Reference
            </a>
            <a
              href="#mev-types"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Scale className="h-4 w-4 text-violet-500" /> 3 Types of MEV
            </a>
          </div>
        </div>
      </section>

      {/* 1. Core Question & Concept */}
      <section className="rounded-2xl border border-border bg-card/60 p-6 space-y-4">
        <div className="flex items-center gap-2 text-violet-500">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            1. The Fundamental Question of Ethereum Block Construction
          </h2>
        </div>
        <blockquote className="border-l-4 border-violet-500/60 pl-4 py-1 text-sm font-medium italic text-foreground">
          "Who gets to decide which transactions enter Ethereum, in what order, and how much information do they receive before making that decision?"
        </blockquote>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In traditional Ethereum, the mempool is an unencrypted gossip layer. Every pending transaction is visible to all network participants before block inclusion. While open, this transparency exposes users to predatory MEV, driving trade volume into private channels and creating centralizing dependencies.
        </p>
      </section>

      {/* 2. Three Types of MEV */}
      <section id="mev-types" className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">2. Understanding the Three Types of MEV</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-2">
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              External Markets
            </span>
            <h3 className="font-semibold text-foreground text-sm">Exogenous MEV</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Information originates outside Ethereum (e.g. price shifts on centralized exchanges like Binance creating arbitrage opportunities across DEX pools).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              State Discrepancies
            </span>
            <h3 className="font-semibold text-foreground text-sm">Endogenous MEV</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Opportunities already present within existing Ethereum state (e.g. price imbalances between Uniswap and Sushiswap liquidity pools).
            </p>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-2">
            <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-300">
              Transaction-Induced (LUCID Target)
            </span>
            <h3 className="font-semibold text-foreground text-sm">Autogenous MEV</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Opportunities created by the user transaction itself (e.g. a large trade shifting pool reserves). LUCID hides transaction parameters until inclusion is committed to eliminate autogenous exploitation.
            </p>
          </div>
        </div>
      </section>

      {/* 3. The Complete Pipeline Timeline */}
      <section id="pipeline" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-violet-500" /> 3. The Mempool to LUCID Evolution Pipeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How transaction privacy and inclusion mechanisms developed step-by-step.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'all' ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All Steps ({STEPS.length})
            </button>
            <button
              onClick={() => setFilter('mev-pipeline')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'mev-pipeline' ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              MEV History
            </button>
            <button
              onClick={() => setFilter('eips')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'eips' ? 'bg-violet-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              EIP Proposals
            </button>
          </div>
        </div>

        <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-6 pt-2">
          {filteredSteps.map((s, idx) => (
            <div key={idx} className="relative group">
              <div
                className={cn(
                  'absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-transform group-hover:scale-125',
                  s.status === 'Proposed' || s.status === 'Live'
                    ? 'bg-violet-500 ring-4 ring-violet-500/20'
                    : 'bg-muted-foreground/60'
                )}
              />

              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2 hover:border-violet-500/40 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-violet-500">{s.step}</span>
                    <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {s.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                        s.status === 'Live'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : s.status === 'Proposed'
                          ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {s.status}
                    </span>
                    {s.link && (
                      <Link href={s.link} className="text-xs text-violet-500 hover:underline inline-flex items-center gap-0.5">
                        Spec <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Significance:</strong> {s.significance}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Comparison Matrix */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            4. Architecture Comparison: Public vs Private vs LUCID Encrypted Mempool
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Feature / Attribute</th>
                <th className="p-3 font-semibold text-foreground">Public Mempool</th>
                <th className="p-3 font-semibold text-foreground">Private Order Flow</th>
                <th className="p-3 font-semibold text-violet-500">LUCID (EIP-8184)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-muted-foreground">
              <tr>
                <td className="p-3 font-semibold text-foreground">Visible Before Inclusion</td>
                <td className="p-3 text-red-500 font-medium">Yes (Plaintext)</td>
                <td className="p-3 font-medium">No (Hidden from public)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">No (Ciphertext until commit)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Public Permissionless Path</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">Yes</td>
                <td className="p-3 text-red-500 font-medium">No (Requires private RPC)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Yes (Public network)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Sandwich / Front-Running Protection</td>
                <td className="p-3 text-red-500">Poor (Exposed)</td>
                <td className="p-3 text-amber-500">Moderate</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">High (Commit-before-reveal)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Requires Trusted Intermediary</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">No</td>
                <td className="p-3 text-red-500 font-medium">Yes (Private Relays)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">No (Protocol Native)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Builder Plaintext Visibility</td>
                <td className="p-3">Before commitment</td>
                <td className="p-3">Before commitment</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">After commitment only</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Censorship Resistance Pairing</td>
                <td className="p-3">Standard network</td>
                <td className="p-3 text-amber-500">Provider dependent</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Paired with FOCIL (EIP-7805)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Intersecting EIP Ecosystem Map */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            5. Intersecting Protocol EIP Ecosystem
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <Link href="/eip/2718" className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">EIP-2718</span>
              <span className="text-[10px] text-muted-foreground">Foundation</span>
            </div>
            <p className="font-semibold text-foreground">Typed Transaction Envelopes</p>
            <p className="text-muted-foreground text-[11px]">Provides transaction envelope format used by Sealed Transactions.</p>
          </Link>

          <Link href="/eip/7732" className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">EIP-7732</span>
              <span className="text-[10px] text-muted-foreground">ePBS</span>
            </div>
            <p className="font-semibold text-foreground">Enshrined PBS &amp; PTC</p>
            <p className="text-muted-foreground text-[11px]">Formalizes in-protocol builder bids and Payload Timeliness Committees.</p>
          </Link>

          <Link href="/eip/7805" className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">EIP-7805</span>
              <span className="text-[10px] text-muted-foreground">Inclusion</span>
            </div>
            <p className="font-semibold text-foreground">FOCIL Inclusion Lists</p>
            <p className="text-muted-foreground text-[11px]">Committee inclusion lists enforced by consensus attesters through fork choice.</p>
          </Link>

          <Link href="/eip/8184" className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-4 space-y-1.5 hover:border-violet-500 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-violet-500">EIP-8184</span>
              <span className="text-[10px] text-violet-500 font-semibold">LUCID</span>
            </div>
            <p className="font-semibold text-foreground">LUCID Encrypted Mempool</p>
            <p className="text-muted-foreground text-[11px]">Commit-before-reveal encrypted transaction inclusion pipeline.</p>
          </Link>

          <Link href="/eip/7886" className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">EIP-7886</span>
              <span className="text-[10px] text-muted-foreground">Execution</span>
            </div>
            <p className="font-semibold text-foreground">Delayed Execution</p>
            <p className="text-muted-foreground text-[11px]">Separates consensus attestation from heavy execution payload processing.</p>
          </Link>

          <Link href="/eip/8141" className="rounded-xl border border-border bg-card/60 p-4 space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground">EIP-8141</span>
              <span className="text-[10px] text-muted-foreground">Frames</span>
            </div>
            <p className="font-semibold text-foreground">Frame Transactions</p>
            <p className="text-muted-foreground text-[11px]">Integrates native Account Abstraction frames with sealed transaction tickets.</p>
          </Link>
        </div>
      </section>

      {/* 6. Quick Reference Summary Card */}
      <section id="quick-ref" className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-card to-background p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-lg shadow-xs">
            10
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              6. Quick Reference: The Mempool to LUCID Mental Chain
            </h2>
            <p className="text-xs text-muted-foreground">
              The 10-step mental model for understanding Ethereum transaction ordering evolution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" /> The 10-Step Progression
            </h3>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
              <li className="pl-1"><strong className="text-foreground">Public Mempool:</strong> Pending transaction gossip pool.</li>
              <li className="pl-1"><strong className="text-foreground">MEV:</strong> Profit extracted by reordering/sandwiching trades.</li>
              <li className="pl-1"><strong className="text-foreground">Searchers:</strong> Capture MEV opportunities in candidate bundles.</li>
              <li className="pl-1"><strong className="text-foreground">Builders:</strong> Construct high-profit blocks under PBS.</li>
              <li className="pl-1"><strong className="text-foreground">Censorship Risk:</strong> Builder concentration creates inclusion control.</li>
              <li className="pl-1"><strong className="text-foreground">FOCIL (EIP-7805):</strong> Committee inclusion lists enforced by attesters.</li>
              <li className="pl-1"><strong className="text-foreground">Private Relays:</strong> Protected users from MEV but fragmented liquidity.</li>
              <li className="pl-1"><strong className="text-foreground">Encrypted Mempool:</strong> Keeps inclusion public but intent hidden.</li>
              <li className="pl-1"><strong className="text-foreground">LUCID (EIP-8184):</strong> Commit-before-reveal transaction pipeline.</li>
              <li className="pl-1"><strong className="text-foreground">Decoupled Execution:</strong> Payload execution shifted off critical attestation path.</li>
            </ol>
          </div>

          <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500" /> 6 EIP Numbers to Know Cold
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-2718</span>
                <span className="text-muted-foreground">Typed Transaction Envelopes</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-7732</span>
                <span className="text-muted-foreground">Enshrined PBS &amp; PTC Committees</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-7805</span>
                <span className="text-muted-foreground">FOCIL Inclusion Lists</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-violet-500">EIP-8184</span>
                <span className="text-muted-foreground">LUCID Encrypted Mempool</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-7886</span>
                <span className="text-muted-foreground">Delayed Payload Execution</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">EIP-8141</span>
                <span className="text-muted-foreground">Frame Transactions &amp; AA</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
