import Link from 'next/link';
import { Video } from 'lucide-react';
import { AccountAbstractionSection } from '@/components/account-abstraction-section';
import { AaAdoptionIndex } from '@/components/aa-adoption-index';
import { AaProposalFamily } from '@/components/aa-proposal-family';

export const revalidate = 300;

export default function AccountAbstractionDashboard() {
  return (
    <div className="space-y-6">
      {/* Plain-English explainer, written for non-blockchain-native readers. */}
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What it is</p>
        <h2 className="mt-1 dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Letting ordinary accounts behave like smart contracts.
        </h2>
        <div className="mt-3 grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            Today an Ethereum wallet is a plain key that pays its own gas and signs one transaction at a time. Account
            abstraction lets a wallet act like programmable code: batching several actions into one, paying gas in a
            token, adding recovery or spending limits, and letting someone else sponsor the fee.
          </p>
          <p>
            Two approaches are live on mainnet now. <span className="text-foreground">EIP-7702</span> lets a normal
            account temporarily run contract code (shipped in Pectra). <span className="text-foreground">ERC-4337</span>{' '}
            does it off-protocol through a shared EntryPoint contract. Below is how much each is actually used, plus the
            wider proposal family and the native-AA work still in progress.
          </p>
        </div>
        <div className="mt-3">
          <Link href="/aa/calls" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Video className="h-3.5 w-3.5" /> Native AA breakout calls
          </Link>
        </div>
      </section>

      {/* Usage charts */}
      <AccountAbstractionSection />

      {/* Adoption index (protocol / infra / app / user) */}
      <AaAdoptionIndex />

      {/* Proposal family */}
      <AaProposalFamily />
    </div>
  );
}
