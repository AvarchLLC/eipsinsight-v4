'use client';

import { useState, type ReactNode } from 'react';
import { FileText, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

type View = 'overview' | 'devnet';

/**
 * Segmented toggle for the EIP-8141 tab: switch between the curated proposal
 * tracker ("Overview") and the live frames-devnet activity charts ("Devnet").
 */
export function Eip8141ViewSwitch({ overview, devnet }: { overview: ReactNode; devnet: ReactNode }) {
  const [view, setView] = useState<View>('overview');
  const opts: { key: View; label: string; icon: typeof Radio }[] = [
    { key: 'overview', label: 'Proposal & status', icon: FileText },
    { key: 'devnet', label: 'Devnet activity', icon: Radio },
  ];
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
        {opts.map((o) => {
          const active = view === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setView(o.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={active}
            >
              <o.icon className="h-3.5 w-3.5" />
              {o.label}
              {o.key === 'devnet' && (
                <span className="ml-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
      {view === 'overview' ? overview : devnet}
    </div>
  );
}
