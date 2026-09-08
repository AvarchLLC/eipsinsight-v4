import { TxTypeShareChart } from '@/components/aa/tx-type-share-chart';
import { Eip7702AdoptionChart } from '@/components/aa/eip7702-adoption-chart';
import { L1CompositionChart } from '@/components/aa/l1-composition-chart';
import { TxEconomicsChart } from '@/components/aa/tx-economics-chart';

export const revalidate = 300;

/**
 * Staging page for the account-abstraction ecosystem dashboard. New standalone
 * charts land here first so they can be reviewed without touching the main /aa
 * page; once approved they fold into the /aa dashboard.
 */
export default function AaEcosystemDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Ecosystem dashboard</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Headline charts for how account abstraction and typed transactions are adopted on mainnet. Staging preview.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TxTypeShareChart />
        <Eip7702AdoptionChart />
        <L1CompositionChart />
        <TxEconomicsChart />
      </div>
    </div>
  );
}
