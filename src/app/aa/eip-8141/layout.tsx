import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Radio, Server, Flag, Video } from 'lucide-react';
import { Eip8141ViewTabs } from '@/components/aa/eip8141-view-switch';

const AS_OF = 'October 2026';

const FACTS: { icon: typeof Radio; label: string; value: string; accent?: boolean }[] = [
  { icon: CheckCircle2, label: 'Status', value: "SFI'd · Hegota headliner", accent: true },
  { icon: Radio, label: 'Devnet', value: 'frames-devnet-0 · live' },
  { icon: Server, label: 'Clients', value: '3 of 4 ready (ethrex, Geth, Nethermind)' },
  { icon: Flag, label: 'Next', value: 'Hegota scoping by Devcon (Nov 3)' },
];

/**
 * Shared chrome for the EIP-8141 section: the proposal header + the route-based
 * view tabs. Children are either the proposal tracker (/aa/eip-8141) or the
 * live frames-devnet charts (/aa/eip-8141/devnet).
 */
export default function Eip8141Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-8">
          {/* Left: identity + description + CTAs */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">EIP-8141</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> SFI&apos;d · Hegota headliner
              </span>
              <span className="text-[10px] text-muted-foreground">as of {AS_OF}</span>
            </div>
            <h2 className="mt-1.5 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Frames (native account abstraction)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              EIP-8141 is the leading native account-abstraction design (Frames): unlike EIP-7702 and ERC-4337, it builds
              AA directly into the protocol. It is scheduled for inclusion as the Hegota headliner and is being hardened
              in the Native AA breakouts, with a live spec-test devnet (frames-devnet) and reference clients. It is not
              live on a public network yet, but the frames-devnet is actively producing frame transactions. Switch to{' '}
              <span className="font-medium text-foreground">Devnet activity</span> for live metrics, or stay on{' '}
              <span className="font-medium text-foreground">Proposal &amp; status</span> for the proposal, releases, and
              calls shaping it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/aa/calls"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <Video className="h-3.5 w-3.5" /> Native AA breakouts
              </Link>
              <Link
                href="/eip/8141"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Full EIP-8141 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: at-a-glance facts (fills the width on large screens) */}
          <div className="rounded-xl border border-border/70 bg-background/50 p-4 lg:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">At a glance</p>
            <dl className="mt-3 space-y-3">
              {FACTS.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon className={`mt-0.5 h-4 w-4 shrink-0 ${f.accent ? 'text-emerald-500' : 'text-primary'}`} />
                  <div className="min-w-0">
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                    <dd className="text-xs font-medium leading-snug text-foreground">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Eip8141ViewTabs />

      {children}
    </div>
  );
}
