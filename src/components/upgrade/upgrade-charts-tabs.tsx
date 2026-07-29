'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ZoomableTimeline } from '@/components/upgrade/zoomable-timeline';
import { NetworkUpgradesChart } from '@/components/upgrade/network-upgrades-chart';

/**
 * The two upgrade timeline charts from the old analytics page, merged into one
 * tabbed view on /upgrade: the illustrated "Ethereum Upgrade Timeline" and the
 * data-driven "distribution of EIPs" chart. One at a time keeps the page short.
 */

type ChartTab = 'timeline' | 'distribution';

const TABS: { key: ChartTab; label: string }[] = [
  { key: 'timeline', label: 'Ethereum Upgrade Timeline' },
  { key: 'distribution', label: 'Distribution of EIPs' },
];

export function UpgradeChartsTabs() {
  const [tab, setTab] = useState<ChartTab>('timeline');

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Upgrade charts" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both stay mounted (hidden when inactive) so switching tabs doesn't
          re-run the charts' layout work or lose zoom/scroll position. */}
      <div className={cn(tab !== 'timeline' && 'hidden')}>
        <ZoomableTimeline
          imagePath="/upgrade/ethupgradetimeline.png"
          alt="Ethereum Network Upgrade Timeline"
        />
      </div>
      <div className={cn(tab !== 'distribution' && 'hidden')}>
        <NetworkUpgradesChart />
      </div>
    </div>
  );
}
