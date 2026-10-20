'use client';

import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Boxes, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DENCUN, TimeframeControl, presetToRange, type Range } from './blob-shared';
import { BlobOverviewTab } from './blob-overview';
import { BlobFeeMarketTab } from './blob-fee-market';
import { BlobRollupsTab } from './blob-rollups';

type TabKey = 'overview' | 'fees' | 'rollups';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; live?: boolean }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'fees', label: 'Fee Market', icon: Activity, live: true },
  { key: 'rollups', label: 'Rollups', icon: Boxes },
];

export function BlobHub() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [bounds, setBounds] = useState<{ min: string; max: string }>({ min: DENCUN, max: new Date().toISOString().slice(0, 10) });

  const range: Range = useMemo(() => presetToRange(preset, custom), [preset, custom]);
  const showTimeframe = tab !== 'fees';

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.live && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Radio className="h-2 w-2 animate-pulse" /> live
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {showTimeframe && (
          <div className="pb-2">
            <TimeframeControl
              preset={preset}
              custom={custom}
              onPreset={(k) => {
                setCustom(null);
                setPreset(k);
              }}
              onCustom={setCustom}
              dataMin={bounds.min}
              dataMax={bounds.max}
            />
          </div>
        )}
      </div>

      {tab === 'overview' && <BlobOverviewTab range={range} onBounds={setBounds} />}
      {tab === 'fees' && <BlobFeeMarketTab />}
      {tab === 'rollups' && <BlobRollupsTab range={range} />}
    </div>
  );
}
