'use client';

import React from 'react';
import { ArrowUpRight, Rocket, Code, Layers, Network, FileText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TOTAL_NETWORK_UPGRADES,
  EXECUTION_EIP_COUNT,
  CONSENSUS_EIP_COUNT,
  TOTAL_EIPS_DEPLOYED,
} from '@/data/upgrade-timeline-stats';
import { upgradeMetaEIPs } from '@/data/network-upgrades';

interface UpgradeStatsCardsProps {
  totalUpgrades?: number;
  independentIncludedAuthors?: number;
  activeTable?: 'core' | 'meta' | 'execution' | 'consensus' | 'authors' | null;
  onSelectTable?: (mode: 'core' | 'meta' | 'execution' | 'consensus' | 'authors') => void;
}

// Meta EIPs paired with upgrades (one per hard fork that has a meta EIP).
const META_EIP_COUNT = Object.keys(upgradeMetaEIPs).length;

type Accent = 'indigo' | 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';

const ACCENTS: Record<Accent, { chip: string; active: string; arrow: string }> = {
  indigo: { chip: 'bg-indigo-500/10 text-indigo-500 ring-indigo-500/20', active: 'border-indigo-500/50 ring-1 ring-indigo-500/40', arrow: 'group-hover:text-indigo-500' },
  blue: { chip: 'bg-blue-500/10 text-blue-500 ring-blue-500/20', active: 'border-blue-500/50 ring-1 ring-blue-500/40', arrow: 'group-hover:text-blue-500' },
  violet: { chip: 'bg-violet-500/10 text-violet-500 ring-violet-500/20', active: 'border-violet-500/50 ring-1 ring-violet-500/40', arrow: 'group-hover:text-violet-500' },
  emerald: { chip: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20', active: 'border-emerald-500/50 ring-1 ring-emerald-500/40', arrow: 'group-hover:text-emerald-500' },
  rose: { chip: 'bg-rose-500/10 text-rose-500 ring-rose-500/20', active: 'border-rose-500/50 ring-1 ring-rose-500/40', arrow: 'group-hover:text-rose-500' },
  amber: { chip: 'bg-amber-500/10 text-amber-500 ring-amber-500/20', active: 'border-amber-500/50 ring-1 ring-amber-500/40', arrow: 'group-hover:text-amber-500' },
};

function StatCard({
  icon: Icon,
  accent,
  label,
  value,
  sublabel,
  hint,
  active = false,
  href,
  onClick,
}: {
  icon: LucideIcon;
  accent: Accent;
  label: string;
  value: number;
  sublabel: string;
  hint: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const a = ACCENTS[accent];
  const className = cn(
    'group relative flex cursor-pointer flex-col gap-2.5 rounded-xl border border-border bg-card/60 p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    active && a.active
  );

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset',
            a.chip
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <ArrowUpRight
          className={cn('h-4 w-4 text-muted-foreground/30 transition-colors', a.arrow)}
        />
      </div>
      <div>
        <p className="text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <h3 className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{sublabel}</p>
      <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:text-foreground/70">
        {hint}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {inner}
    </button>
  );
}

export function UpgradeStatsCards({
  // All defaults derive from the static timeline so the cards, the chart, and the
  // /upgrade page can't disagree. Callers may still override totalUpgrades.
  totalUpgrades = TOTAL_NETWORK_UPGRADES,
  independentIncludedAuthors = 0,
  activeTable = null,
  onSelectTable,
}: UpgradeStatsCardsProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
      <StatCard
        icon={Rocket}
        accent="indigo"
        label="Total Network Upgrades"
        value={totalUpgrades}
        sublabel="Activated forks across execution and consensus layers"
        hint="See the timeline →"
        href="#upgrade-charts"
      />
      <StatCard
        icon={Code}
        accent="blue"
        label="Execution Layer"
        value={EXECUTION_EIP_COUNT}
        sublabel="EIPs · Protocol & EVM"
        hint="Click to view EIPs →"
        active={activeTable === 'execution'}
        onClick={() => onSelectTable?.('execution')}
      />
      <StatCard
        icon={Layers}
        accent="violet"
        label="Consensus Layer"
        value={CONSENSUS_EIP_COUNT}
        sublabel="EIPs · Beacon Chain"
        hint="Click to view EIPs →"
        active={activeTable === 'consensus'}
        onClick={() => onSelectTable?.('consensus')}
      />
      <StatCard
        icon={Network}
        accent="emerald"
        label="EIPs Deployed"
        value={TOTAL_EIPS_DEPLOYED}
        sublabel="EIPs deployed in upgrades (EL + CL)"
        hint="Click to view EIPs →"
        active={activeTable === 'core'}
        onClick={() => onSelectTable?.('core')}
      />
      <StatCard
        icon={FileText}
        accent="rose"
        label="Hard Fork Meta EIPs"
        value={META_EIP_COUNT}
        sublabel="Meta EIPs paired with upgrades"
        hint="Click to view EIPs →"
        active={activeTable === 'meta'}
        onClick={() => onSelectTable?.('meta')}
      />
      <StatCard
        icon={Users}
        accent="amber"
        label="Included EIP Authors"
        value={independentIncludedAuthors}
        sublabel="Unique EIP authors across network upgrades"
        hint="Click to view authors →"
        active={activeTable === 'authors'}
        onClick={() => onSelectTable?.('authors')}
      />
    </div>
  );
}
