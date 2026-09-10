'use client';

import { Activity } from 'lucide-react';
import { AA_TERMS } from '@/components/aa/chart-kit';
import { useAaTimeframe } from '@/app/aa/_timeframe';
import { TxTypeShareChart } from '@/components/aa/tx-type-share-chart';
import { Eip7702AdoptionChart } from '@/components/aa/eip7702-adoption-chart';
import { L1CompositionChart } from '@/components/aa/l1-composition-chart';
import { TxEconomicsChart } from '@/components/aa/tx-economics-chart';
import { TxMigrationChart } from '@/components/aa/tx-migration-chart';
import { BlobUsageChart } from '@/components/aa/blob-usage-chart';
import { Eip7702ActivationChart } from '@/components/aa/eip7702-activation-chart';

/** A labelled group of related charts: a small heading, then a 2-up grid. */
function ChartGroup({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="border-l-2 border-primary/40 pl-2.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Ecosystem dashboard: how account abstraction and typed transactions are
 * adopted on mainnet. The window comes from the shared page-level timeframe; the
 * two EIP-7702 charts are anchored to the Pectra activation and stay fixed. Charts
 * are grouped by theme (mix, fees, 7702, blobs) so they read as a narrative.
 */
export function AaEcosystemSection() {
  const { range } = useAaTimeframe();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Ethereum ecosystem view</h2>
          <p className="text-xs text-muted-foreground">
            Where account abstraction sits inside all mainnet activity: transaction mix, composition, and economics.
          </p>
        </div>
      </div>

      <ChartGroup title="Transaction mix" hint="How each transaction format's share of mainnet traffic shifts over time.">
        <TxTypeShareChart range={range} />
        <TxMigrationChart range={range} />
      </ChartGroup>

      <ChartGroup title="Fees & composition" hint="What each transaction type and class costs and contributes, in USD or volume.">
        <TxEconomicsChart range={range} />
        <L1CompositionChart range={range} />
      </ChartGroup>

      <ChartGroup title="EIP-7702 adoption" hint="Uptake of set-code accounts since the Pectra activation.">
        <Eip7702AdoptionChart />
        <Eip7702ActivationChart />
      </ChartGroup>

      <ChartGroup title="Blob demand (EIP-4844)" hint="Layer-2 data-availability usage: blob transactions and how much data each carries.">
        <div className="xl:col-span-2">
          <BlobUsageChart range={range} />
        </div>
      </ChartGroup>

      {/* Plain-English glossary for the unusual terms across these charts. */}
      <details className="group rounded-xl border border-border bg-card/40 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground">
          Terms explained
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {AA_TERMS.map((t) => (
            <div key={t.term}>
              <dt className="text-xs font-semibold text-foreground">{t.term}</dt>
              <dd className="text-xs leading-relaxed text-muted-foreground">{t.def}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
