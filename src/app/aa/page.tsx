import Link from 'next/link';
import { ArrowRight, Boxes } from 'lucide-react';
import { AccountAbstractionSection } from '@/components/account-abstraction-section';
import { AaMeetingsSection } from '@/components/aa-meetings-section';

export const revalidate = 300;

export default function AccountAbstractionPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
      {/* Hero */}
      <header className="space-y-2 border-b border-border/40 pb-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          <Boxes className="h-3.5 w-3.5" /> Native Account Abstraction
        </div>
        <h1 className="persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Account Abstraction
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tracking Ethereum&apos;s account-abstraction effort: live on-chain usage of the mechanisms in production today,
          the proposal family, and the native-AA work in progress. Related calls are on the{' '}
          <Link href="/calls/aa/003" className="text-primary hover:underline">
            Native Account Abstraction breakout
          </Link>{' '}
          series.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/eip/8141"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            EIP-8141 (Frames) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/calls/aa/003"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Latest breakout call
          </Link>
        </div>
      </header>

      <AaMeetingsSection />

      <AccountAbstractionSection />
    </div>
  );
}
