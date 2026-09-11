'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  GitBranch,
  ShieldAlert,
  Layers,
  ArrowRight,
  Sparkles,
  Code2,
  KeyRound,
  Zap,
  Cpu,
  GitFork,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * All EIP metadata on this page (titles, statuses, dates, authors) was verified
 * against eips.ethereum.org / ercs.ethereum.org. Statuses use the formal EIP
 * status; where a proposal is deployed on mainnet despite its status, that is
 * noted separately (the `live` flag). No unrelated network upgrades are listed.
 */

type FilterCategory = 'all' | 'aa' | 'infra';
type Status = 'Final' | 'Draft' | 'Withdrawn' | 'Stagnant' | 'Enabling';

// Turn every "EIP-N" / "ERC-N" mention in a plain string into a link.
const EIP_RE = /((?:EIP|ERC)-\d+)/g;
function linkifyEips(text: string): React.ReactNode[] {
  return text.split(EIP_RE).map((part, i) => {
    const m = /^(EIP|ERC)-(\d+)$/.exec(part);
    if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
    const href = m[1] === 'ERC' ? `/erc/${m[2]}` : `/eip/${m[2]}`;
    return (
      <Link key={i} href={href} className="font-medium text-primary hover:underline">
        {part}
      </Link>
    );
  });
}

interface TimelineEvent {
  year: string;
  eip: string; // canonical id used for the link, e.g. "EIP-7702" or "" for pure upgrades
  href?: string;
  title: string;
  category: 'aa' | 'infra';
  status: Status;
  live?: boolean; // deployed on mainnet regardless of formal status
  meta: string;
  description: string;
  significance: string;
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    year: '2017',
    eip: 'EIP-86',
    href: '/eip/86',
    title: 'EIP-86: Abstraction of transaction origin and signature',
    category: 'aa',
    status: 'Stagnant',
    meta: 'Core · Proposed Feb 2017 · Vitalik Buterin',
    description: 'The first proposal to move signature and nonce checks out of the protocol and into account contracts.',
    significance: 'The origin of account abstraction: the account, not the protocol, should decide what makes a transaction valid.',
  },
  {
    year: '2019',
    eip: 'EIP-1014',
    href: '/eip/1014',
    title: 'EIP-1014: CREATE2 opcode',
    category: 'infra',
    status: 'Final',
    meta: 'Core · Live in Constantinople, Feb 2019',
    description: 'Adds the CREATE2 opcode, so a contract can be deployed to an address computed before deployment.',
    significance: 'Enables counterfactual smart accounts, where an address is funded and used before its contract is on chain. ERC-4337 depends on it.',
  },
  {
    year: '2020',
    eip: 'EIP-2938',
    href: '/eip/2938',
    title: 'EIP-2938: Account Abstraction',
    category: 'aa',
    status: 'Withdrawn',
    meta: 'Core · Proposed Sep 2020 · Buterin, Dietrichs, Garnett, Villanueva, Wilson',
    description: 'The first attempt to make account abstraction a protocol-native transaction type, using new PAYGAS and NONCE opcodes.',
    significance: 'Surfaced the hard problems (mempool denial of service, paying gas before validation runs) that shaped every later design.',
  },
  {
    year: '2020',
    eip: 'EIP-3074',
    href: '/eip/3074',
    title: 'EIP-3074: AUTH and AUTHCALL opcodes',
    category: 'aa',
    status: 'Withdrawn',
    meta: 'Core · Proposed Oct 2020 · Wilson, Dietrichs, Garnett, Zoltu',
    description: 'Two EVM opcodes letting an EOA authorize an invoker contract to batch and sponsor actions on its behalf.',
    significance: 'The main pre-Pectra plan for upgrading EOAs. Debated for years, then withdrawn in favor of EIP-7702.',
  },
  {
    year: '2021',
    eip: 'EIP-2718',
    href: '/eip/2718',
    title: 'EIP-2718: Typed Transaction Envelope',
    category: 'infra',
    status: 'Final',
    meta: 'Core · Live in Berlin, Apr 2021',
    description: 'Defines the typed transaction envelope: a leading type byte so new transaction formats can be added without breaking old clients.',
    significance: 'Every later transaction type, including EIP-7702 (type 0x04), is registered under this envelope.',
  },
  {
    year: '2021',
    eip: 'ERC-4337',
    href: '/erc/4337',
    title: 'ERC-4337: Account Abstraction Using Alt Mempool',
    category: 'aa',
    status: 'Final',
    live: true,
    meta: 'ERC · Final · Proposed Sep 2021 · Live on mainnet since 2023',
    description: 'Account abstraction with no consensus change, using UserOperations, an alternative mempool, Bundlers, Paymasters, and a shared EntryPoint contract.',
    significance: 'Made smart-account wallets (passkeys, sponsored gas, batching) usable on mainnet without a hard fork.',
  },
  {
    year: '2022',
    eip: 'EIP-5792',
    href: '/eip/5792',
    title: 'EIP-5792: Wallet Call API',
    category: 'aa',
    status: 'Final',
    meta: 'Interface · Final · Proposed Oct 2022',
    description: 'Standard wallet RPC methods (wallet_sendCalls, wallet_getCapabilities) for batched calls and capability discovery.',
    significance: 'Lets a dApp use account abstraction features without knowing how the wallet implements them.',
  },
  {
    year: '2024',
    eip: 'EIP-7702',
    href: '/eip/7702',
    title: 'EIP-7702: Set Code for EOAs',
    category: 'aa',
    status: 'Final',
    live: true,
    meta: 'Core · Final · Proposed May 2024 · Live in Pectra (2025)',
    description: 'A type 0x04 transaction that sets a delegation indicator on an EOA, pointing it at contract code. The account keeps its address and key, and the delegation stays until it is replaced or cleared.',
    significance: 'The path that shipped: existing accounts gain batching and gas sponsorship with no migration to a new address.',
  },
  {
    year: '2025',
    eip: '',
    href: '/upgrade/pectra',
    title: 'Pectra upgrade (Prague and Electra)',
    category: 'infra',
    status: 'Enabling',
    meta: 'Network upgrade · May 2025',
    description: 'The Prague and Electra upgrade activated EIP-7702 on mainnet.',
    significance: 'Brought EOA code delegation live, so ordinary accounts can act as smart accounts.',
  },
  {
    year: '2025',
    eip: 'EIP-8130',
    href: '/eip/8130',
    title: 'EIP-8130: Keystore Accounts',
    category: 'aa',
    status: 'Draft',
    meta: 'Core · Draft · Proposed Oct 2025',
    description: 'A new transaction type plus an on-chain account configuration with explicit authenticators.',
    significance: 'Native account abstraction with validation cost a node can predict without running arbitrary wallet code.',
  },
  {
    year: '2026',
    eip: 'EIP-8141',
    href: '/eip/8141',
    title: 'EIP-8141: Frame Transaction',
    category: 'aa',
    status: 'Draft',
    meta: 'Core · Draft · Proposed Jan 2026',
    description: 'A native transaction type that splits a transaction into frames: separate calls that validate, approve payment, then execute.',
    significance: 'The current native AA direction. EIP-7701 was withdrawn in its favor.',
  },
  {
    year: '2026',
    eip: 'EIP-8202',
    href: '/eip/8202',
    title: 'EIP-8202: Scheme-Agile Transactions',
    category: 'aa',
    status: 'Draft',
    meta: 'Core · Draft · Proposed Mar 2026',
    description: 'A type 0x05 transaction combining an EIP-1559 fee header with swappable signature schemes and typed extensions.',
    significance: 'Carries EIP-7702-style set-code authorizations and pluggable auth schemes in one composable format.',
  },
];

// ── AA EIP family tree: one origin, three approaches ──
interface TreeNode {
  eip: string;
  name: string;
  status: Status;
  live?: boolean;
  role: string;
  href: string;
}
interface Lineage {
  key: string;
  title: string;
  blurb: string;
  icon: typeof Code2;
  nodes: TreeNode[];
}

const ROOT: TreeNode = {
  eip: 'EIP-86',
  name: 'Abstract the account',
  status: 'Stagnant',
  role: 'The 2017 origin idea: let account logic decide transaction validity.',
  href: '/eip/86',
};

const LINEAGES: Lineage[] = [
  {
    key: 'offchain',
    title: 'Off-protocol',
    blurb: 'No consensus change. AA lives in smart contracts and an alternative mempool.',
    icon: Code2,
    nodes: [
      { eip: 'ERC-4337', name: 'Alt-mempool AA', status: 'Final', live: true, role: 'UserOps, Bundlers, Paymasters, EntryPoint.', href: '/erc/4337' },
      { eip: 'EIP-5792', name: 'Wallet Call API', status: 'Final', role: 'Standard dApp to wallet batch calls.', href: '/eip/5792' },
    ],
  },
  {
    key: 'eoa',
    title: 'On existing EOAs',
    blurb: 'Give the accounts people already have smart-account behavior.',
    icon: Zap,
    nodes: [
      { eip: 'EIP-3074', name: 'AUTH / AUTHCALL', status: 'Withdrawn', role: 'Invoker-based batching for EOAs. Superseded by EIP-7702.', href: '/eip/3074' },
      { eip: 'EIP-7702', name: 'Set code for EOAs', status: 'Final', live: true, role: 'Type 0x04: an EOA runs contract code. Live in Pectra.', href: '/eip/7702' },
      { eip: 'EIP-8202', name: 'Scheme-Agile tx', status: 'Draft', role: 'Type 0x05 carrying EIP-7702-style auth.', href: '/eip/8202' },
    ],
  },
  {
    key: 'native',
    title: 'In-protocol (native)',
    blurb: 'A new transaction type with validation built into the protocol.',
    icon: Cpu,
    nodes: [
      { eip: 'EIP-2938', name: 'Account Abstraction', status: 'Withdrawn', role: 'First native attempt, using PAYGAS.', href: '/eip/2938' },
      { eip: 'EIP-7701', name: 'Native Account Abstraction', status: 'Withdrawn', role: 'Validation and execution phases. Withdrawn for EIP-8141.', href: '/eip/7701' },
      { eip: 'EIP-8141', name: 'Frame Transaction', status: 'Draft', role: 'Frame-based successor to EIP-7701.', href: '/eip/8141' },
      { eip: 'EIP-8130', name: 'Keystore Accounts', status: 'Draft', role: 'A separate native design: on-chain config and explicit authenticators.', href: '/eip/8130' },
    ],
  },
];

// ── Typed transaction families (EIP-2718) ──
const TX_TYPES: { type: string; eip: string; href: string; name: string; fork: string; aa: boolean; status?: string }[] = [
  { type: 'Legacy', eip: 'Pre-EIP-2718', href: '/eip/2718', name: 'Legacy RLP transaction', fork: 'Frontier', aa: false },
  { type: '0x01', eip: 'EIP-2930', href: '/eip/2930', name: 'Access list', fork: 'Berlin', aa: false },
  { type: '0x02', eip: 'EIP-1559', href: '/eip/1559', name: 'Dynamic fee', fork: 'London', aa: false },
  { type: '0x03', eip: 'EIP-4844', href: '/eip/4844', name: 'Blob-carrying', fork: 'Dencun', aa: false },
  { type: '0x04', eip: 'EIP-7702', href: '/eip/7702', name: 'Set code (EOA delegation)', fork: 'Pectra', aa: true, status: 'Final' },
  { type: '0x05', eip: 'EIP-8202', href: '/eip/8202', name: 'Scheme-agile', fork: 'Proposed', aa: true, status: 'Draft' },
];

// ── Comparison matrix: each row carries a plain-English explanation shown on hover ──
type Tone = 'good' | 'bad' | 'warn' | 'muted' | 'plain';
type Cell = { v: string; tone?: Tone; mono?: boolean };
interface CompareRow {
  property: string;
  explain: string;
  erc4337: Cell;
  eip7702: Cell;
  native: Cell;
}

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-red-500',
  warn: 'text-amber-600 dark:text-amber-400',
  muted: 'text-muted-foreground',
  plain: '',
};

const COMPARE_ROWS: CompareRow[] = [
  {
    property: 'Formal status',
    explain:
      'The status in the official EIP or ERC repository (Draft, Review, Last Call, Final, Stagnant, Withdrawn). Final means the specification is locked and will not change.',
    erc4337: { v: 'Final (ERC)', tone: 'good' },
    eip7702: { v: 'Final (Core)', tone: 'good' },
    native: { v: 'Draft' },
  },
  {
    property: 'Live on mainnet',
    explain:
      'Whether the mechanism is usable on Ethereum mainnet today, regardless of its formal status. ERC-4337 has run through deployed EntryPoint contracts since 2023; EIP-7702 activated in the Pectra upgrade in 2025.',
    erc4337: { v: 'Yes, since 2023', tone: 'good' },
    eip7702: { v: 'Yes, since Pectra (2025)', tone: 'good' },
    native: { v: 'Not yet', tone: 'muted' },
  },
  {
    property: 'Consensus change',
    explain:
      'Whether the approach needed a protocol change (a hard fork that every node must adopt), or whether it works purely with smart contracts on top of the existing protocol.',
    erc4337: { v: 'None', tone: 'good' },
    eip7702: { v: 'Pectra (shipped)', tone: 'warn' },
    native: { v: 'Future fork', tone: 'warn' },
  },
  {
    property: 'Works on your existing account',
    explain:
      'Whether you keep your current EOA address, or must move funds to a brand-new smart-contract account. ERC-4337 needs a new contract account; EIP-7702 upgrades the account you already have.',
    erc4337: { v: 'No, a new contract', tone: 'bad' },
    eip7702: { v: 'Yes, same EOA', tone: 'good' },
    native: { v: 'Yes', tone: 'good' },
  },
  {
    property: 'Transaction format',
    explain:
      'How the operation reaches the chain. ERC-4337 uses a UserOperation sent to a separate mempool and bundled into a normal transaction; EIP-7702 is a standard type 0x04 transaction; native AA proposes its own transaction type.',
    erc4337: { v: 'UserOperation (alt mempool)' },
    eip7702: { v: 'Type 0x04', mono: true },
    native: { v: 'Frame-based tx' },
  },
  {
    property: 'Needs bundler or EntryPoint',
    explain:
      'Whether the approach relies on extra off-protocol infrastructure. ERC-4337 needs bundlers and the shared EntryPoint contract; EIP-7702 is sent directly to Ethereum like any other transaction; native AA would be handled by ordinary block builders.',
    erc4337: { v: 'Yes' },
    eip7702: { v: 'No, a direct L1 tx' },
    native: { v: 'No, native builders', tone: 'good' },
  },
  {
    property: 'Custom validation (passkeys, multisig)',
    explain:
      'Whether the account can define its own rules for a valid signature, for example passkeys, multisig, or session keys, instead of only a single ECDSA key.',
    erc4337: { v: 'Yes', tone: 'good' },
    eip7702: { v: 'Yes, via delegated code', tone: 'good' },
    native: { v: 'Yes', tone: 'good' },
  },
  {
    property: 'Gas sponsorship',
    explain:
      'Whether someone other than the sender can pay the gas. ERC-4337 uses Paymaster contracts; EIP-7702 can delegate to code that sponsors the fee; native AA builds sponsorship into the protocol.',
    erc4337: { v: 'Paymaster', tone: 'good' },
    eip7702: { v: 'Sponsor tx', tone: 'good' },
    native: { v: 'Native', tone: 'good' },
  },
  {
    property: 'Atomic batching',
    explain:
      'Whether several actions can be bundled into one transaction that all succeed or all fail together, for example approve and swap in a single step.',
    erc4337: { v: 'Yes', tone: 'good' },
    eip7702: { v: 'Yes', tone: 'good' },
    native: { v: 'Yes', tone: 'good' },
  },
];

function CompareCell({ cell }: { cell: Cell }) {
  return <td className={cn('p-3', cell.mono && 'font-mono', cell.tone && TONE_CLASS[cell.tone], (cell.tone === 'good' || cell.tone === 'bad' || cell.tone === 'warn') && 'font-medium')}>{cell.v}</td>;
}

function statusPill(status: Status) {
  return cn(
    'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
    status === 'Final'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : status === 'Withdrawn'
      ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
      : status === 'Stagnant'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : status === 'Enabling'
      ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
      : 'border-border bg-muted text-muted-foreground',
  );
}

function TreeCard({ node }: { node: TreeNode }) {
  return (
    <Link href={node.href} className="block rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold text-foreground">{node.eip}</span>
        <div className="flex items-center gap-1">
          {node.live && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              On mainnet
            </span>
          )}
          <span className={statusPill(node.status)}>{node.status}</span>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold text-foreground">{node.name}</p>
      {/* Plain text: the card is already a link, so avoid nested anchors from linkify. */}
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{node.role}</p>
    </Link>
  );
}

export default function AaHistoryPage() {
  const [filter, setFilter] = useState<FilterCategory>('aa');

  const filteredEvents = TIMELINE_EVENTS.filter((e) => filter === 'all' || e.category === filter);
  const aaCount = TIMELINE_EVENTS.filter((e) => e.category === 'aa').length;
  const infraCount = TIMELINE_EVENTS.filter((e) => e.category === 'infra').length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-background p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <History className="h-3.5 w-3.5" /> History and genealogy
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How Ethereum accounts became programmable
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every major account abstraction proposal in one place, from {linkifyEips('EIP-86')} in 2017 to{' '}
              {linkifyEips('EIP-7702')} shipping in Pectra, plus the native AA work now in draft. Scoped to account
              abstraction; unrelated network upgrades are left out. Every proposal links to its full page.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <a
              href="#timeline"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <GitBranch className="h-4 w-4" /> Timeline
            </a>
            <a
              href="#family-tree"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <GitFork className="h-4 w-4 text-muted-foreground" /> Family tree
            </a>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="scroll-mt-20 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <GitBranch className="h-5 w-5 text-primary" /> Timeline
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Account abstraction proposals, and the infrastructure that made them possible.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1 text-xs">
            {(
              [
                ['all', `All (${TIMELINE_EVENTS.length})`],
                ['aa', `AA proposals (${aaCount})`],
                ['infra', `Enabling (${infraCount})`],
              ] as [FilterCategory, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-medium transition-colors',
                  filter === key ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative ml-4 space-y-5 border-l-2 border-border/80 pl-6 pt-2">
          {filteredEvents.map((evt, idx) => (
            <div key={idx} className="group relative">
              <div
                className={cn(
                  'absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-transform group-hover:scale-125',
                  evt.live
                    ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                    : evt.category === 'infra'
                    ? 'bg-blue-500/70'
                    : evt.status === 'Draft'
                    ? 'bg-primary ring-4 ring-primary/20'
                    : 'bg-muted-foreground/60',
                )}
              />
              <div className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{evt.year}</span>
                    <h3 className="text-sm font-semibold text-foreground">{evt.title}</h3>
                    {evt.category === 'infra' && (
                      <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        Enabling
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {evt.live && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                        On mainnet
                      </span>
                    )}
                    <span className={statusPill(evt.status)}>{evt.status}</span>
                    {evt.href && (
                      <Link href={evt.href} className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                        {evt.eip || 'Details'} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">{evt.meta}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{linkifyEips(evt.description)}</p>
                <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Why it matters:</strong> {linkifyEips(evt.significance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Family tree */}
      <section id="family-tree" className="scroll-mt-20 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <GitFork className="h-5 w-5 text-primary" /> Family tree of AA proposals
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One origin idea, three approaches to the same goal. Every proposal links to its page.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <Link href={ROOT.href} className="block rounded-xl border border-primary/40 bg-primary/5 p-4 text-center transition-colors hover:border-primary">
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{ROOT.eip}</span>
              <span className={statusPill(ROOT.status)}>{ROOT.status}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{ROOT.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{ROOT.role}</p>
          </Link>
          <div className="mx-auto h-5 w-px bg-border" aria-hidden />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {LINEAGES.map((lin) => (
            <div key={lin.key} className="rounded-2xl border border-border/80 bg-card/40 p-4">
              <div className="mb-1 flex items-center gap-2">
                <lin.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{lin.title}</h3>
              </div>
              <p className="mb-3 text-[11px] leading-snug text-muted-foreground">{lin.blurb}</p>
              <div>
                {lin.nodes.map((node, i) => (
                  <div key={node.eip}>
                    {/* Neutral connector: nodes are proposals within one approach over time,
                        not a strict "supersedes" chain. Supersession is stated in each card. */}
                    {i > 0 && <div className="mx-auto h-3 w-px bg-border" aria-hidden />}
                    <TreeCard node={node} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction types */}
      <section id="tx-types" className="scroll-mt-20 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Layers className="h-5 w-5 text-primary" /> Transaction types on mainnet
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every typed transaction family. Account abstraction added type <span className="font-mono">0x04</span> (
            {linkifyEips('EIP-7702')}); a proposed <span className="font-mono">0x05</span> ({linkifyEips('EIP-8202')})
            would carry the same set-code authorization.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">Tx type</th>
                <th className="p-3 font-semibold">EIP</th>
                <th className="p-3 font-semibold">Transaction</th>
                <th className="p-3 font-semibold">Introduced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-muted-foreground">
              {TX_TYPES.map((t) => (
                <tr key={t.type} className={cn(t.aa && 'bg-primary/5')}>
                  <td className="p-3 font-mono text-foreground">{t.type}</td>
                  <td className="p-3">
                    <Link href={t.href} className={cn('font-semibold hover:underline', t.aa ? 'text-primary' : 'text-foreground')}>
                      {t.eip}
                    </Link>
                  </td>
                  <td className="p-3">
                    {t.name}
                    {t.aa && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Account abstraction
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {t.fork}
                    {t.status && <span className={cn('ml-2', statusPill(t.status as Status))}>{t.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            {linkifyEips('EIP-2718')} is not a transaction type. It is the{' '}
            <span className="text-foreground">Typed Transaction Envelope</span> (Berlin, 2021) that added a leading type
            byte so new formats could be introduced without breaking old clients. Legacy transactions predate it; every
            type above (<span className="font-mono">0x01</span> to <span className="font-mono">0x05</span>) is defined as a
            new {linkifyEips('EIP-2718')} transaction type.
          </span>
        </p>
      </section>

      {/* Three ways to get a smart account */}
      <section id="mental-model" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Three ways to get a smart account</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Plain EOA</h3>
              </div>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">Since 2015</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Auth:</span> Fixed ECDSA key pair</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Gas:</span> Paid in native ETH</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Code:</span> None (empty account)</li>
            </ul>
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Limit:</strong> One key. Lose it and funds are gone. No batching or sponsorship.
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">{linkifyEips('ERC-4337')} smart account</h3>
              </div>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">Live 2023</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Auth:</span> Passkeys, multisig, session keys</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Gas:</span> Sponsored or paid in ERC-20</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Code:</span> Custom contract deployed on chain</li>
            </ul>
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Trade-off:</strong> A new contract address. It does not upgrade an existing EOA.
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{linkifyEips('EIP-7702')} delegated EOA</h3>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Live 2025</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Address:</span> Keeps the original EOA</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Auth:</span> ECDSA plus delegated contract code</li>
              <li className="flex items-start gap-2"><span className="shrink-0 font-mono text-foreground">Gets:</span> Batching and gas sponsorship</li>
            </ul>
            <div className="rounded-lg bg-primary/10 p-2.5 text-[11px] font-medium text-primary">
              <strong>Result:</strong> An existing account becomes a smart account with no migration.
            </div>
          </div>
        </div>
      </section>

      {/* The validation constraint */}
      <section id="validation" className="scroll-mt-20 space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">Why it took so long: the validation problem</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ethereum checks that a transaction is valid before it executes it. If verifying a signature required running
          arbitrary contract code, an attacker could flood the mempool with transactions that burn work and then turn out
          invalid. Every AA design is an answer to this one constraint.
        </p>
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="space-y-1 rounded-xl border border-border/80 bg-card p-3.5">
            <p className="font-semibold text-foreground">Cheap validation</p>
            <p className="text-muted-foreground">Nodes must reject invalid transactions without spending uncompensated compute.</p>
          </div>
          <div className="space-y-1 rounded-xl border border-border/80 bg-card p-3.5">
            <p className="font-semibold text-foreground">Guaranteed payment</p>
            <p className="text-muted-foreground">Something must guarantee gas before validation code runs.</p>
          </div>
          <div className="space-y-1 rounded-xl border border-border/80 bg-card p-3.5">
            <p className="font-semibold text-foreground">Stable mempool rules</p>
            <p className="text-muted-foreground">Validity cannot depend on state that changes within a block.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">How the three approaches compare</h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">Property</th>
                <th className="p-3 font-semibold text-foreground">{linkifyEips('ERC-4337')}</th>
                <th className="p-3 font-semibold text-foreground">{linkifyEips('EIP-7702')}</th>
                <th className="p-3 font-semibold text-foreground">Native ({linkifyEips('EIP-8141')})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-muted-foreground">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.property}>
                  <td className="p-3 font-semibold text-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="inline-flex cursor-help items-center gap-1 rounded underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {row.property}
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                        {row.explain}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <CompareCell cell={row.erc4337} />
                  <CompareCell cell={row.eip7702} />
                  <CompareCell cell={row.native} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
