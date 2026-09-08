import { Activity } from 'lucide-react';
import { TxTypeShareChart } from '@/components/aa/tx-type-share-chart';
import { Eip7702AdoptionChart } from '@/components/aa/eip7702-adoption-chart';
import { L1CompositionChart } from '@/components/aa/l1-composition-chart';
import { TxEconomicsChart } from '@/components/aa/tx-economics-chart';
import { TxMigrationChart } from '@/components/aa/tx-migration-chart';
import { BlobUsageChart } from '@/components/aa/blob-usage-chart';
import { Eip7702ActivationChart } from '@/components/aa/eip7702-activation-chart';

/**
 * Ecosystem dashboard: how account abstraction and typed transactions are
 * adopted on mainnet. Reads the pre-aggregated blob_lens.tx_daily_type_stats
 * rollup (transaction share, composition, per-type economics) plus live AA usage.
 */
export function AaEcosystemSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Ethereum ecosystem view</h2>
          <p className="text-xs text-muted-foreground">
            Where account abstraction sits inside all mainnet activity: transaction mix, composition, and economics.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TxTypeShareChart />
        <TxMigrationChart />
        <Eip7702AdoptionChart />
        <Eip7702ActivationChart />
        <L1CompositionChart />
        <TxEconomicsChart />
        <BlobUsageChart />
      </div>
    </section>
  );
}
