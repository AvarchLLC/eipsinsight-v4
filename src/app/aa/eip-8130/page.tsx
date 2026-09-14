import Link from 'next/link';
import {
  ArrowUpRight,
  Video,
  KeyRound,
  Layers,
  CircleDashed,
  Rocket,
  FlaskConical,
} from 'lucide-react';

export const revalidate = 300;

// Curated tracker for EIP-8130 (Account Abstraction by Account Configuration).
// Facts are sourced from the Native AA breakouts (/aa/calls) and All Core Devs
// calls; snapshot dated below. The live source of truth is the Calls tab.
const AS_OF = 'September 2026';

type Feature = { title: string; blurb: string };
const FEATURES: Feature[] = [
  { title: 'Account configuration model', blurb: 'A singleton account-config contract defines how an account authenticates, rather than deploying code to the account itself.' },
  { title: 'Deterministic authenticators', blurb: 'Native support for K1, P256, and passkey authenticators, declared top-level in the transaction so dependencies are inspectable without tracing.' },
  { title: '2D & nonceless nonces', blurb: 'Two-dimensional nonces plus nonceless transactions for parallel and out-of-order flows.' },
  { title: 'No EVM changes', blurb: 'EOAs work out of the box, no protocol EVM changes required, and the model is cross-chain portable.' },
];

type MileStone = { date: string; label: string; kind: 'done' | 'now' | 'next' };
const TIMELINE: MileStone[] = [
  { date: 'Jul 2026', label: 'Base announces EIP-8130 (Account Abstraction by Account Configuration)', kind: 'done' },
  { date: 'Aug 27, 2026', label: 'ACDE #244: default path set, 8130 proceeds on L2s and 8141 on L1', kind: 'done' },
  { date: 'Late Sep 2026', label: 'Launch on Base; OP Stack and Arbitrum also committing', kind: 'now' },
  { date: 'Ongoing', label: 'Timeboxed 8141 ↔ 8130 convergence; shared ERC-1979 key lifecycle', kind: 'next' },
];

type Research = { label: string; href: string; blurb: string };
const RESEARCH: Research[] = [
  {
    label: 'EIP-8130 ↔ ERC-1271 timelock PoC (lucadonnoh)',
    href: 'https://github.com/lucadonnoh/eip-8130-wallet-lock-poc',
    blurb: 'Community PoC exploring direct dispatch versus a locked ERC-1271 wallet, the kind of edge case the design discussion is working through.',
  },
  {
    label: 'Codeless-account constraints (CH / @_chunter)',
    href: 'https://ethereum-magicians.org/',
    blurb: 'Discussion of how default code for codeless accounts interacts with the ~65M existing smart accounts, passkey-only accounts, and custom-code accounts.',
  },
];

export default function Eip8130Tab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">EIP-8130</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Rocket className="h-3 w-3" /> Launching on Base · late Sep 2026
          </span>
          <span className="text-[10px] text-muted-foreground">as of {AS_OF}</span>
        </div>
        <h2 className="mt-1.5 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Account Abstraction by Account Configuration
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          EIP-8130 is Base&apos;s native account-abstraction design and the L2 counterpart to EIP-8141. Instead of
          building AA into L1 consensus, it uses an account-configuration model with deterministic authenticators, needs
          no EVM changes, and is cross-chain portable. Core Devs set the default path as 8130 on L2s (Base, OP Stack,
          Arbitrum) and 8141 on L1, with convergence work ongoing, so the two are complementary layers rather than
          rivals.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/aa/eip-8141" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
            <Layers className="h-3.5 w-3.5" /> Compare with EIP-8141 (L1)
          </Link>
          <Link href="/aa/calls" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Video className="h-3.5 w-3.5" /> Native AA breakouts
          </Link>
          <Link href="/eip/8130" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Full EIP-8130 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* What it is */}
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <KeyRound className="h-4 w-4 text-primary" /> How the model works
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{f.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Adoption timeline */}
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <Rocket className="h-4 w-4 text-primary" /> Adoption status
          </h3>
          <span className="text-[11px] text-muted-foreground">L2 path · Base, OP Stack, Arbitrum</span>
        </div>
        <ol className="relative mt-4 space-y-4 border-l border-border/70 pl-5">
          {TIMELINE.map((m, i) => (
            <li key={i} className="relative">
              <span
                className={
                  'absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ' +
                  (m.kind === 'now' ? 'bg-amber-500' : m.kind === 'next' ? 'bg-primary/60' : 'bg-muted-foreground/60')
                }
                aria-hidden
              />
              <p className="text-xs font-mono text-muted-foreground">{m.date}</p>
              <p className={'text-sm ' + (m.kind === 'now' ? 'font-semibold text-foreground' : 'text-foreground/90')}>{m.label}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 8130 vs 8141 framing */}
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Layers className="h-4 w-4 text-primary" /> 8130 and 8141: two layers, one goal
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <p className="text-sm font-semibold text-foreground">EIP-8130 · L2</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Account-configuration model, no EVM changes, launching on Base and other rollups. Thesis: no capability gap
              versus 8141 at lower cost; authenticators declared top-level for inspectability.
            </p>
          </div>
          <Link href="/aa/eip-8141" className="group rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">EIP-8141 · L1</p>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              In-protocol Frames, SFI&apos;d as the Hegota headliner. Coupled account model is the main point of debate;
              the two efforts share the ERC-1979 key-lifecycle standard and are attempting convergence.
            </p>
          </Link>
        </div>
      </section>

      {/* Discussion & research */}
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <FlaskConical className="h-4 w-4 text-primary" /> Discussion &amp; research
        </h3>
        <div className="mt-4 space-y-3">
          {RESEARCH.map((r) => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-primary/40"
            >
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  {r.label} <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{r.blurb}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
          Links are community discussion and research, shared for context, not endorsements or security disclosures.
        </p>
      </section>
    </div>
  );
}
