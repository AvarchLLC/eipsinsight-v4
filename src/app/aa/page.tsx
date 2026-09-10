import { AccountAbstractionSection } from '@/components/account-abstraction-section';
import { AaAdoptionIndex } from '@/components/aa-adoption-index';
import { AaProposalFamily } from '@/components/aa-proposal-family';
import { AaEcosystemSection } from '@/components/aa/ecosystem-section';
import { AaExplainer } from './_explainer';
import { AaTimeframeProvider } from './_timeframe';

export const revalidate = 300;

export default function AccountAbstractionDashboard() {
  return (
    <div className="space-y-6">
      {/* Collapsible plain-English intro */}
      <AaExplainer />

      {/* One page-level timeframe drives both the usage metrics and the ecosystem charts. */}
      <AaTimeframeProvider>
        {/* Core mainnet usage metrics, charts & synced race visualizer */}
        <AccountAbstractionSection />

        {/* Ecosystem view: tx-type share, composition, and per-type economics (rollup-backed) */}
        <AaEcosystemSection />
      </AaTimeframeProvider>

      {/* 2-Column Ecosystem Layout: Adoption Index & Proposal Family */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AaAdoptionIndex />
        <AaProposalFamily />
      </div>
    </div>
  );
}
