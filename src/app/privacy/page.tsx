import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, ArrowUpRight, EyeOff, Layers, Coins } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Analytics · EIPsInsight',
  description:
    "Verifiable privacy for Ethereum: measuring mempool order-flow exposure and private-transfer adoption from public chain data. Coming soon.",
};

const PREVIEW = [
  {
    icon: EyeOff,
    title: 'Mempool privacy',
    body: 'How much transaction order flow the public mempool exposes before inclusion, and what encrypted-mempool designs (EIP-8184) would remove.',
  },
  {
    icon: Coins,
    title: 'Transfer privacy',
    body: 'Adoption of stealth-address transfers (EIP-5564, EIP-6538) today, and shielded-pool private transfers (EIP-8182) once they activate.',
  },
  {
    icon: Layers,
    title: 'Verifiable by anyone',
    body: 'Every number rebuilds from public Ethereum chain data with a documented method. Privacy you cannot verify is privacy you cannot trust.',
  },
];

export default function PrivacyAnalyticsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <ShieldCheck className="h-3.5 w-3.5" /> Coming soon
      </span>

      <h1 className="dec-title mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Privacy Analytics
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        A public, verifiable view of Ethereum&apos;s privacy: how much the mempool exposes, how much
        private-transfer demand already exists, and what upcoming privacy upgrades actually change, all
        measured from public chain data.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        {PREVIEW.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-card/60 p-4 text-left">
            <p.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold text-foreground">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/lucid"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          See the live mempool console
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/eips/8182"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        >
          Track EIP-8182 (private transfers)
        </Link>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground">
        Looking for how we handle your data? See the{' '}
        <Link href="/privacy-policy" className="underline transition-colors hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
