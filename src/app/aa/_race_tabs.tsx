'use client';

import { useState } from 'react';
import { AaTxRace } from '@/components/aa-tx-race';
import { MempoolTxRace } from '@/components/mempool-tx-race';
import { Activity, Flame, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AaRaceTabs({
  granularity = 'month',
  from,
  to,
}: {
  granularity?: 'day' | 'week' | 'month';
  from?: string;
  to?: string;
}) {
  const [activeTab, setActiveTab] = useState<'aa-race' | 'mempool-race'>('aa-race');

  return (
    <section className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cumulative Growth & Mainnet Mix</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
            Synced with Timeline
          </span>
        </div>

        <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('aa-race')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all',
              activeTab === 'aa-race'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500" /> AA Growth Race
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mempool-race')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all',
              activeTab === 'mempool-race'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Layers className="h-3.5 w-3.5 text-blue-500" /> Mainnet Mempool Mix
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {activeTab === 'aa-race' ? (
          <AaTxRace granularity={granularity} from={from} to={to} />
        ) : (
          <MempoolTxRace />
        )}
      </div>
    </section>
  );
}
