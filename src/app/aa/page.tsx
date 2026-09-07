import { AccountAbstractionSection } from '@/components/account-abstraction-section';
import { AaAdoptionIndex } from '@/components/aa-adoption-index';
import { AaProposalFamily } from '@/components/aa-proposal-family';
import { AaTxRace } from '@/components/aa-tx-race';
import { MempoolTxRace } from '@/components/mempool-tx-race';
import { AaExplainer } from './_explainer';

export const revalidate = 300;

export default function AccountAbstractionDashboard() {
  return (
    <div className="space-y-6">
      {/* Collapsible plain-English intro */}
      <AaExplainer />

      {/* Animated tx races (WatcherGuru-style) */}
      <AaTxRace />

      {/* All mainnet transactions by type — shows where 7702 sits in the wider mix */}
      <MempoolTxRace />

      {/* Usage charts */}
      <AccountAbstractionSection />

      {/* Adoption index (protocol / infra / app / user) */}
      <AaAdoptionIndex />

      {/* Proposal family */}
      <AaProposalFamily />
    </div>
  );
}
