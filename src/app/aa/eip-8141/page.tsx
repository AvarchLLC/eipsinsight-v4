import Link from 'next/link';
import { ArrowUpRight, Video, Clock } from 'lucide-react';
import { AaFocusCharts } from '@/components/aa-focus-charts';

export const revalidate = 300;

export default function Eip8141Tab() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">EIP-8141</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" /> Proposed for Hegota
          </span>
        </div>
        <h2 className="mt-1.5 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Frames (native account abstraction)
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          EIP-8141 is the leading native account-abstraction design (Frames), being worked out in the Native Account
          Abstraction breakouts and proposed for the Hegota upgrade. Unlike EIP-7702 and ERC-4337, it builds AA directly
          into the protocol. It is not live yet, so there is no on-chain usage to chart. This tab tracks the proposal and
          the calls shaping it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/aa/calls" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
            <Video className="h-3.5 w-3.5" /> Native AA breakouts
          </Link>
          <Link href="/eip/8141" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Full EIP-8141 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* EIP-8141 is not live, so there is no 8141 usage to chart. Instead show the
          existing AA demand (7702 + 4337) that native, in-protocol AA would serve. */}
      <AaFocusCharts mode="demand" />

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        The chart above is existing account-abstraction activity, not EIP-8141&apos;s own usage. Once native AA
        activates on a testnet or mainnet, its own usage charts will appear here. For now, see the latest decisions in
        the <Link href="/aa/calls" className="text-primary hover:underline">Calls</Link> tab.
      </div>
    </div>
  );
}
