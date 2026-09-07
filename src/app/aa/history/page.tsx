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
  Code2,
  KeyRound,
  Zap,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterCategory = 'all' | 'aa-eips' | 'forks';

interface TimelineEvent {
  year: string;
  title: string;
  category: 'aa-eips' | 'forks';
  eipOrFork: string;
  status: 'Live' | 'Draft' | 'Superseded' | 'Withdrawn' | 'In Development' | 'Historical';
  description: string;
  significance: string;
  link?: string;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    year: '2015',
    title: 'Frontier & Ethereum Mainnet Launch',
    category: 'forks',
    eipOrFork: 'Frontier Launch',
    status: 'Historical',
    description: 'Ethereum mainnet launches with dual account architecture: Externally Owned Accounts (EOAs) and Smart Contract Accounts.',
    significance: 'Fixed transaction validation rules: ECDSA signatures, linear nonces, and native ETH gas payments.',
    link: '/upgrade/frontier',
  },
  {
    year: '2016',
    title: 'Homestead & The DAO Fork',
    category: 'forks',
    eipOrFork: 'Homestead / DAO Fork',
    status: 'Historical',
    description: 'First planned network upgrade followed by state recovery hard fork after The DAO exploit, splitting Ethereum and Ethereum Classic.',
    significance: 'Demonstrated governance consensus and introduced early EVM opcode security refinements.',
    link: '/upgrade/homestead',
  },
  {
    year: '2016',
    title: 'Tangerine Whistle & Spurious Dragon',
    category: 'forks',
    eipOrFork: 'EVM Hardening',
    status: 'Historical',
    description: 'Gas repricing upgrades to counter state bloat and Denial of Service (DoS) attacks exploiting underpriced opcodes.',
    significance: 'Established gas as Ethereum key defense mechanism against arbitrary computational loops.',
    link: '/upgrade/tangerine-whistle',
  },
  {
    year: '2017',
    title: 'Byzantium & EIP-86 Proposal',
    category: 'aa-eips',
    eipOrFork: 'EIP-86',
    status: 'Withdrawn',
    description: 'Vitalik Buterin proposes EIP-86 to abstract transaction origin and signature validation into account contracts.',
    significance: 'The original ancestor proposal establishing that transaction validity should belong to the account logic rather than the protocol.',
    link: '/eip/86',
  },
  {
    year: '2019',
    title: 'Constantinople & Petersburg (CREATE2)',
    category: 'forks',
    eipOrFork: 'Constantinople',
    status: 'Historical',
    description: 'Introduces the CREATE2 opcode for deterministic smart contract address generation.',
    significance: 'Essential primitive enabling counterfactual wallet deployment used by later smart account frameworks.',
    link: '/upgrade/constantinople',
  },
  {
    year: '2020',
    title: 'EIP-2938: Protocol-Native AA',
    category: 'aa-eips',
    eipOrFork: 'EIP-2938',
    status: 'Withdrawn',
    description: 'Proposed top-level smart contract transaction initiation using a new PAYGAS opcode inside protocol consensus.',
    significance: 'First major attempt at native AA, highlighting protocol complexity and mempool DoS trade-offs.',
    link: '/eip/2938',
  },
  {
    year: '2020',
    title: 'EIP-3074: AUTH & AUTHCALL',
    category: 'aa-eips',
    eipOrFork: 'EIP-3074',
    status: 'Superseded',
    description: 'Proposed EVM opcodes allowing EOAs to authorize an invoker contract to execute batch operations on their behalf.',
    significance: 'Spurred protocol safety debates regarding EOA control and was ultimately superseded by EIP-7702 in 2024.',
    link: '/eip/3074',
  },
  {
    year: '2020',
    title: 'Beacon Chain Launch',
    category: 'forks',
    eipOrFork: 'Proof of Stake Genesis',
    status: 'Historical',
    description: 'Parallel Proof of Stake consensus layer launches alongside Proof of Work execution layer.',
    significance: 'Began dual-track protocol evolution split between Execution Layer and Consensus Layer upgrades.',
    link: '/upgrade/beacon-chain',
  },
  {
    year: '2021',
    title: 'London Upgrade & EIP-1559',
    category: 'forks',
    eipOrFork: 'EIP-1559',
    status: 'Live',
    description: 'Overhauls transaction fee market with base fee and priority fee mechanism, burning base fees.',
    significance: 'Fundamentally changed ETH monetary dynamics and predictable gas estimation across all wallet types.',
    link: '/eip/1559',
  },
  {
    year: '2021',
    title: 'ERC-4337: Alt-Mempool Account Abstraction',
    category: 'aa-eips',
    eipOrFork: 'ERC-4337',
    status: 'Live',
    description: 'Introduces UserOperations, Bundlers, Paymasters, and EntryPoint contract system without changing protocol consensus.',
    significance: 'Enabled off-protocol smart contract wallets with sponsored gas and custom validation on mainnet.',
    link: '/erc/4337',
  },
  {
    year: '2022',
    title: 'The Merge (Paris + Bellatrix)',
    category: 'forks',
    eipOrFork: 'The Merge',
    status: 'Historical',
    description: 'Ethereum transitions execution consensus from Proof of Work to Proof of Stake without network downtime.',
    significance: 'Reduced network energy usage by 99.95% and unified execution and consensus upgrade cycles.',
    link: '/upgrade/merge',
  },
  {
    year: '2023',
    title: 'Shapella (Shanghai + Capella)',
    category: 'forks',
    eipOrFork: 'Shapella',
    status: 'Historical',
    description: 'Enables full and partial ETH staking withdrawals for validator node operators.',
    significance: 'Completed the core Proof of Stake transition lifecycle on mainnet.',
    link: '/upgrade/shapella',
  },
  {
    year: '2024',
    title: 'Dencun (Cancun + Deneb) & EIP-4844',
    category: 'forks',
    eipOrFork: 'EIP-4844 Blobs',
    status: 'Live',
    description: 'Introduces Blob carrying transactions (Proto-Danksharding) to drastically lower Layer 2 rollup data submission costs.',
    significance: 'The defining rollup scaling milestone, making smart account transactions on L2s order of magnitude cheaper.',
    link: '/eip/4844',
  },
  {
    year: '2024',
    title: 'EIP-5792: Wallet Call API',
    category: 'aa-eips',
    eipOrFork: 'EIP-5792',
    status: 'Draft',
    description: 'Defines standardized RPC methods (wallet_sendCalls, wallet_getCapabilities) for batch transaction execution.',
    significance: 'Decouples dApp interaction from underlying wallet implementation details.',
    link: '/eip/5792',
  },
  {
    year: '2024',
    title: 'EIP-7702: Set Code for EOAs',
    category: 'aa-eips',
    eipOrFork: 'EIP-7702',
    status: 'Live',
    description: 'Proposed by Vitalik Buterin and contributors to allow EOAs to temporarily delegate execution to contract code.',
    significance: 'Combines existing EOA address preservation with smart account capabilities like batching and gas sponsorship.',
    link: '/eip/7702',
  },
  {
    year: '2025',
    title: 'Pectra Upgrade (Prague + Electra)',
    category: 'forks',
    eipOrFork: 'Pectra Upgrade',
    status: 'Live',
    description: 'Activates EIP-7702 on mainnet alongside EIP-7251 (2048 ETH max validator balance) and validator exit controls.',
    significance: 'Brings EOA code delegation live on mainnet, unlocking native account abstraction capabilities.',
    link: '/upgrade/pectra',
  },
  {
    year: '2025',
    title: 'Fusaka & BPO Upgrades (PeerDAS)',
    category: 'forks',
    eipOrFork: 'Fusaka / BPO1 / BPO2',
    status: 'Live',
    description: 'Introduces Peer Data Availability Sampling (PeerDAS) and Blob Parameter Only forks to expand rollup throughput.',
    significance: 'Established faster, targeted parameter tuning upgrades for Ethereum data availability.',
    link: '/upgrade/fusaka',
  },
  {
    year: '2026+',
    title: 'EIP-7701 & EIP-8141 (Native AA & Frames)',
    category: 'aa-eips',
    eipOrFork: 'EIP-7701 / EIP-8141',
    status: 'Draft',
    description: 'Proposes native transaction validation frames and 3-stage validation pipelines directly inside Ethereum execution.',
    significance: 'Moves smart account validation logic from smart contract wrappers directly into protocol block building.',
    link: '/eip/7701',
  },
  {
    year: '2026+',
    title: 'EIP-8130: Keystore Accounts',
    category: 'aa-eips',
    eipOrFork: 'EIP-8130',
    status: 'Draft',
    description: 'Proposes on-chain Account Configuration registry and explicit authenticators without altering EVM state rules.',
    significance: 'Separates account authentication from state execution to preserve mempool DoS protection.',
    link: '/eip/8130',
  },
];

export default function AaHistoryPage() {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const filteredEvents = TIMELINE_EVENTS.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'aa-eips') return e.category === 'aa-eips';
    if (filter === 'forks') return e.category === 'forks';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-background p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <History className="h-3.5 w-3.5" /> A Decade of Protocol Innovation
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Account Abstraction History & Genealogy
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Understanding Account Abstraction reveals the entire history of Ethereum execution, mempool design, gas mechanics,
              and transaction validation. From EIP-86 in 2017 to EIP-7702 in Pectra and native account abstraction directions.
            </p>
          </div>
          <div className="shrink-0 flex sm:flex-col gap-2">
            <a
              href="#cheat-sheet"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" /> Quick Reference
            </a>
            <a
              href="#mental-model"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Cpu className="h-4 w-4 text-muted-foreground" /> EOA vs Smart Account
            </a>
          </div>
        </div>
      </section>

      {/* 1. What does Account Abstraction actually mean? */}
      <section id="mental-model" className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">1. Core Concept: EOA vs Smart Account vs EIP-7702</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Abstraction means replacing protocol hard-coded rules for account authentication and execution with programmable smart contract logic.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: EOA */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-foreground text-sm">Externally Owned Account (EOA)</h3>
              </div>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Original (2015)
              </span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Auth:</span> Fixed ECDSA secp256k1 key pair
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Nonce:</span> Sequential protocol counter
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Gas:</span> Must pay directly in native ETH
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Code:</span> Empty (0 bytes, no EVM bytecode)
              </li>
            </ul>
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Limitation:</strong> Single point of failure. If the private key is lost or leaked, funds cannot be recovered.
            </div>
          </div>

          {/* Card 2: ERC-4337 Smart Account */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-foreground text-sm">ERC-4337 Smart Account</h3>
              </div>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                Alt Mempool (2021)
              </span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Auth:</span> Passkeys, Multisig, Guardians, Session Keys
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Nonce:</span> Programmable multi-dimensional key
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Gas:</span> Sponsored or paid in ERC-20 (USDC)
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Code:</span> Custom contract deployed on-chain
              </li>
            </ul>
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Trade-off:</strong> Requires creating a new contract address. Cannot convert existing EOA addresses.
            </div>
          </div>

          {/* Card 3: EIP-7702 EOA Delegation */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">EIP-7702 Delegated EOA</h3>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Live in Pectra (2025)
              </span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Address:</span> Retains original EOA address!
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Auth:</span> ECDSA plus smart contract execution
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Capabilities:</span> Batching, Gas Sponsorship, De-escalation
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono text-foreground shrink-0">Mechanism:</span> Delegation designation written to code field
              </li>
            </ul>
            <div className="rounded-lg bg-primary/10 p-2.5 text-[11px] text-primary font-medium">
              <strong>Breakthrough:</strong> Existing EOAs upgrade to smart account behavior without asset migration!
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Core Protocol Dilemma */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            2. The Central Problem: Why Couldn't Ethereum Do This on Day 1?
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In Ethereum, transaction validation occurs <strong className="text-foreground">before execution</strong>. If nodes must execute arbitrary smart contract bytecode just to verify whether a transaction signature is valid, an attacker could broadcast millions of transactions performing expensive computations that ultimately return invalid.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
            <p className="font-semibold text-foreground">1. Validation DoS Prevention</p>
            <p className="text-muted-foreground">Nodes must verify validity quickly without spending uncompensated gas or CPU cycles.</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
            <p className="font-semibold text-foreground">2. Pre-Execution Payment</p>
            <p className="text-muted-foreground">Who guarantees gas payment before arbitrary validation code runs?</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
            <p className="font-semibold text-foreground">3. Mempool Security</p>
            <p className="text-muted-foreground">Mempool nodes need static verification rules to prevent invalid transaction flooding.</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
            <p className="font-semibold text-foreground">4. State Invalidation</p>
            <p className="text-muted-foreground">Validation cannot depend on volatile external storage states that might change mid-block.</p>
          </div>
        </div>
      </section>

      {/* 3. Interactive Timeline */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" /> 3. Account Abstraction & Ethereum Upgrade History
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chronological evolution of proposals, upgrades, and consensus changes.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All Events ({TIMELINE_EVENTS.length})
            </button>
            <button
              onClick={() => setFilter('aa-eips')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'aa-eips' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              AA Proposals
            </button>
            <button
              onClick={() => setFilter('forks')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                filter === 'forks' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Network Forks
            </button>
          </div>
        </div>

        {/* Timeline Event Feed */}
        <div className="relative border-l-2 border-border/80 ml-4 pl-6 space-y-6 pt-2">
          {filteredEvents.map((evt, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Dot */}
              <div
                className={cn(
                  'absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-transform group-hover:scale-125',
                  evt.status === 'Live'
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                    : evt.category === 'aa-eips'
                    ? 'bg-primary ring-4 ring-primary/20'
                    : 'bg-muted-foreground/60'
                )}
              />

              <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{evt.year}</span>
                    <h3 className="font-semibold text-foreground text-sm">{evt.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                        evt.status === 'Live'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : evt.status === 'Superseded'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : evt.status === 'Withdrawn'
                          ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {evt.status}
                    </span>
                    {evt.link && (
                      <Link href={evt.link} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                        Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{evt.description}</p>
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Significance:</strong> {evt.significance}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Comparison Matrix */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            4. Architecture Comparison: ERC-4337 vs Native AA vs EIP-7702
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 font-semibold">Feature / Property</th>
                <th className="p-3 font-semibold text-foreground">ERC-4337 (Alt Mempool)</th>
                <th className="p-3 font-semibold text-foreground">EIP-7702 (Pectra)</th>
                <th className="p-3 font-semibold text-foreground">Native AA (7701 / 8141)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-muted-foreground">
              <tr>
                <td className="p-3 font-semibold text-foreground">Consensus Change Required</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">No (Pure Smart Contract)</td>
                <td className="p-3 text-amber-600 dark:text-amber-400 font-medium">Yes (Pectra Upgrade)</td>
                <td className="p-3 text-amber-600 dark:text-amber-400 font-medium">Yes (Future Hard Fork)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Preserves EOA Address</td>
                <td className="p-3 text-red-500">No (New Contract Address)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Yes (Same EOA Address)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">Yes</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Transaction Format</td>
                <td className="p-3">UserOperation (Alt Mempool)</td>
                <td className="p-3 font-mono">Type 4 Authorization Tuple</td>
                <td className="p-3 font-mono">Native Validation Frames</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Bundlers / EntryPoint Required</td>
                <td className="p-3">Yes (Off-protocol network)</td>
                <td className="p-3">Optional / Direct L1 tx</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">No (Native Block Builders)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Gas Sponsorship (Paymasters)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">Supported (Paymaster Contract)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">Supported (Sponsor Invoker)</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">Supported (Native Split)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-foreground">Atomic Transaction Batching</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Supported</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Supported</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">Supported</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Core Summary Card */}
      <section id="cheat-sheet" className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-background p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-xs">
            5
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              5. Quick Reference: Master Account Abstraction in 2 Minutes
            </h2>
            <p className="text-xs text-muted-foreground">
              The exact mental framework and core EIP numbers to remember for protocol conversations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mental Progression */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> The 5-Step Mental Chain
            </h3>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
              <li className="pl-1">
                <strong className="text-foreground">EOA Limitation:</strong> Hard-coded ECDSA key, native ETH gas, no code execution.
              </li>
              <li className="pl-1">
                <strong className="text-foreground">Programmable Accounts:</strong> Decouple authorization and gas from fixed keys.
              </li>
              <li className="pl-1">
                <strong className="text-foreground">ERC-4337:</strong> Off-protocol AA using alt mempool, UserOps, and EntryPoint contracts.
              </li>
              <li className="pl-1">
                <strong className="text-foreground">EIP-7702 (Pectra):</strong> Lets existing EOAs delegate execution to code while keeping their address.
              </li>
              <li className="pl-1">
                <strong className="text-foreground">Native AA:</strong> Bringing programmable validation stages directly into Ethereum consensus.
              </li>
            </ol>
          </div>

          {/* 5 EIP Numbers to Know Cold */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500" /> 5 Core EIP Numbers to Know Cold
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-1559</span>
                <span className="text-muted-foreground">Fee market + Base fee burning</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-foreground">EIP-4844</span>
                <span className="text-muted-foreground">Blob transactions for L2 scaling</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-primary">ERC-4337</span>
                <span className="text-muted-foreground">Alt-mempool account abstraction</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-mono font-bold text-emerald-500">EIP-7702</span>
                <span className="text-muted-foreground">EOA delegation to code (Pectra)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">EIP-7251</span>
                <span className="text-muted-foreground">2048 ETH max effective balance</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
