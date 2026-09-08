'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TxTypeShareChart } from '@/components/aa/tx-type-share-chart';
import { Eip7702AdoptionChart } from '@/components/aa/eip7702-adoption-chart';
import { L1CompositionChart } from '@/components/aa/l1-composition-chart';
import { TxEconomicsChart } from '@/components/aa/tx-economics-chart';
import { TxMigrationChart } from '@/components/aa/tx-migration-chart';
import { BlobUsageChart } from '@/components/aa/blob-usage-chart';
import { Eip7702ActivationChart } from '@/components/aa/eip7702-activation-chart';

const RANGES: { months: number; label: string }[] = [
  { months: 6, label: '6M' },
  { months: 12, label: '1Y' },
  { months: 24, label: '2Y' },
];

/**
 * Ecosystem dashboard: how account abstraction and typed transactions are
 * adopted on mainnet. A shared timeframe drives the window-based charts; the two
 * EIP-7702 charts are anchored to the Pectra activation and stay fixed.
 */
export function AaEcosystemSection() {
  const [months, setMonths] = useState(24);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Ethereum ecosystem view</h2>
            <p className="text-xs text-muted-foreground">
              Where account abstraction sits inside all mainnet activity: transaction mix, composition, and economics.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/60 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.months}
              onClick={() => setMonths(r.months)}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                months === r.months ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TxTypeShareChart months={months} />
        <TxMigrationChart months={months} />
        <Eip7702AdoptionChart />
        <Eip7702ActivationChart />
        <L1CompositionChart months={months} />
        <TxEconomicsChart months={months} />
        <BlobUsageChart months={months} />
      </div>
    </section>
  );
}
