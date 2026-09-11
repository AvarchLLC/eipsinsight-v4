import Link from 'next/link';
import { ArrowUpRight, LayoutDashboard, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AaFocusCharts } from '@/components/aa-focus-charts';

export const revalidate = 300;

export default function Eip7702Tab() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">EIP-7702</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Live since Pectra
          </span>
        </div>
        <h2 className="mt-1.5 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Set EOA account code
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          EIP-7702 lets a normal account (an EOA) temporarily point at contract code for a transaction, so a plain wallet
          can batch actions, use a sponsor to pay gas, or apply spending rules without moving to a separate smart-contract
          wallet. It shipped in the Pectra upgrade and shows up on-chain as transaction type 4.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/aa" className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15">
            <LayoutDashboard className="h-3.5 w-3.5" /> Usage charts <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/eip/7702" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Full EIP-7702 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Live, EIP-7702-only usage charts */}
      <AaFocusCharts mode="7702" />

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        For the 7702-vs-4337 race, value breakdown and the full timeline controls, see the{' '}
        <Link href="/aa" className="text-primary hover:underline">Dashboard</Link> tab.
      </div>
    </div>
  );
}
