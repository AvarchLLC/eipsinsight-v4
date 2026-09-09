'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AA_TERMS } from '@/components/aa/chart-kit';
import { TxTypeShareChart } from '@/components/aa/tx-type-share-chart';
import { Eip7702AdoptionChart } from '@/components/aa/eip7702-adoption-chart';
import { L1CompositionChart } from '@/components/aa/l1-composition-chart';
import { TxEconomicsChart } from '@/components/aa/tx-economics-chart';
import { TxMigrationChart } from '@/components/aa/tx-migration-chart';
import { BlobUsageChart } from '@/components/aa/blob-usage-chart';
import { Eip7702ActivationChart } from '@/components/aa/eip7702-activation-chart';

// Month counts are computed from anchor dates so the widest windows reach exactly
// the right point and grow on their own over time. "Since Dencun" (2024-03) is the
// earliest fully-indexed month; "All" (2015-07) needs the tx_type_monthly_history
// table loaded (BigQuery backfill) to fill the pre-Dencun stretch.
function monthsSince(year: number, month: number): number {
  const now = new Date();
  return (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month) + 1;
}

const RANGES: { months: number; label: string }[] = [
  { months: 6, label: '6M' },
  { months: 12, label: '1Y' },
  { months: 24, label: '2Y' },
  { months: monthsSince(2024, 3), label: 'Since Dencun' },
  // { months: monthsSince(2015, 7), label: 'All' }, // re-enable once pre-Dencun
  // history is loaded into tx_daily_type_stats (see blob_lens/scripts/load-tx-history.mjs).
];

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
 * adopted on mainnet. A shared timeframe drives the window-based charts; the two
 * EIP-7702 charts are anchored to the Pectra activation and stay fixed. Charts are
 * grouped by theme (mix, fees, 7702, blobs) so they read as a narrative.
 */
export function AaEcosystemSection() {
  const [months, setMonths] = useState(24);

  return (
    <section className="space-y-6">
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
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Chart range</span>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-0.5 text-xs">
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
      </div>

      <ChartGroup title="Transaction mix" hint="How each transaction format's share of mainnet traffic shifts over time.">
        <TxTypeShareChart months={months} />
        <TxMigrationChart months={months} />
      </ChartGroup>

      <ChartGroup title="Fees & composition" hint="What each transaction type and class costs and contributes, in USD or volume.">
        <TxEconomicsChart months={months} />
        <L1CompositionChart months={months} />
      </ChartGroup>

      <ChartGroup title="EIP-7702 adoption" hint="Uptake of set-code accounts since the Pectra activation.">
        <Eip7702AdoptionChart />
        <Eip7702ActivationChart />
      </ChartGroup>

      <ChartGroup title="Blob demand (EIP-4844)" hint="Layer-2 data-availability usage: blob transactions and how much data each carries.">
        <div className="xl:col-span-2">
          <BlobUsageChart months={months} />
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
