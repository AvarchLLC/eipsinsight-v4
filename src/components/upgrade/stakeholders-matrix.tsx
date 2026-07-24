'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Code2,
  Cpu,
  Layers,
  Network,
  Users,
  Wallet,
  Wrench,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAKEHOLDER_GROUPS, type StakeholderKey } from '@/lib/stakeholders';
import { StageBadge } from '@/components/upgrade/stage-badge';
import type { UpgradeBucket } from '@/lib/upgrade-stages';

const STAKEHOLDER_ICON: Record<string, LucideIcon> = {
  endUsers: Users,
  appDevs: Code2,
  walletDevs: Wallet,
  toolingInfra: Wrench,
  layer2s: Layers,
  stakersNodes: Coins,
  elClients: Cpu,
  clClients: Network,
};

export interface StakeholderEip {
  eip_number: number;
  title: string;
  bucket: UpgradeBucket | null;
  impacts: Partial<Record<StakeholderKey, string>>;
}

/**
 * EIP × stakeholder impact matrix. Each EIP is one row (no repetition);
 * columns are stakeholder groups. A filled cell means that EIP affects that
 * group — click a row to read every impact for it, or pick a stakeholder chip
 * to focus one column.
 */
export function StakeholdersMatrix({ eips }: { eips: StakeholderEip[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [focus, setFocus] = useState<StakeholderKey | null>(null);

  const counts = useMemo(() => {
    const map = new Map<StakeholderKey, number>();
    for (const group of STAKEHOLDER_GROUPS) {
      map.set(
        group.key,
        eips.filter((eip) => eip.impacts[group.key]).length
      );
    }
    return map;
  }, [eips]);

  const visibleEips = useMemo(
    () => (focus ? eips.filter((eip) => eip.impacts[focus]) : eips),
    [eips, focus]
  );

  const focusGroup = STAKEHOLDER_GROUPS.find((g) => g.key === focus);

  return (
    <div className="space-y-5">
      {/* Stakeholder summary chips — counts + column focus */}
      <div className="flex flex-wrap gap-2">
        {STAKEHOLDER_GROUPS.map((group) => {
          const Icon = STAKEHOLDER_ICON[group.key];
          const active = focus === group.key;
          const count = counts.get(group.key) ?? 0;
          return (
            <button
              key={group.key}
              onClick={() => setFocus(active ? null : group.key)}
              disabled={count === 0}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
                active
                  ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                count === 0 && 'cursor-not-allowed opacity-40'
              )}
              title={group.blurb}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {group.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-semibold',
                  active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {focus && focusGroup && (
        <p className="text-sm text-muted-foreground">
          Showing the {visibleEips.length} EIP{visibleEips.length === 1 ? '' : 's'} that affect{' '}
          <span className="font-medium text-foreground">{focusGroup.label}</span>.{' '}
          <button onClick={() => setFocus(null)} className="text-primary hover:underline">
            Show all
          </button>
        </p>
      )}

      {/* Matrix */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  EIP
                </th>
                {STAKEHOLDER_GROUPS.map((group) => {
                  const Icon = STAKEHOLDER_ICON[group.key];
                  return (
                    <th
                      key={group.key}
                      onClick={() => setFocus(focus === group.key ? null : group.key)}
                      className={cn(
                        'cursor-pointer px-1 py-2.5 text-center align-bottom transition-colors',
                        focus === group.key ? 'bg-primary/10' : 'hover:bg-muted/40'
                      )}
                      title={`${group.label} - ${group.blurb}`}
                    >
                      <div className="mx-auto flex flex-col items-center gap-1">
                        {Icon && (
                          <Icon
                            className={cn(
                              'h-4 w-4',
                              focus === group.key ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            'hidden max-w-16 text-[9px] font-medium leading-tight lg:block',
                            focus === group.key ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {group.label}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleEips.map((eip) => {
                const isOpen = expanded === eip.eip_number;
                const affected = STAKEHOLDER_GROUPS.filter((g) => eip.impacts[g.key]);
                return (
                  <Fragment key={eip.eip_number}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : eip.eip_number)}
                      className={cn(
                        'cursor-pointer border-b border-border/50 transition-colors',
                        isOpen ? 'bg-muted/40' : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                              isOpen && 'rotate-180'
                            )}
                          />
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-semibold text-primary">
                              EIP-{eip.eip_number}
                            </span>
                            <span className="ml-2 hidden max-w-56 truncate align-middle text-xs text-muted-foreground xl:inline">
                              {eip.title}
                            </span>
                          </div>
                          <StageBadge bucket={eip.bucket} abbreviated className="ml-1 shrink-0" />
                        </div>
                      </td>
                      {STAKEHOLDER_GROUPS.map((group) => {
                        const impacted = Boolean(eip.impacts[group.key]);
                        return (
                          <td
                            key={group.key}
                            className={cn(
                              'px-1 py-2.5 text-center',
                              focus === group.key && 'bg-primary/5'
                            )}
                          >
                            {impacted ? (
                              <span
                                className={cn(
                                  'mx-auto block h-2 w-2 rounded-full',
                                  focus === group.key ? 'bg-primary' : 'bg-primary/50'
                                )}
                              />
                            ) : (
                              <span className="mx-auto block h-2 w-2 rounded-full bg-muted-foreground/15" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td colSpan={STAKEHOLDER_GROUPS.length + 1} className="px-3 py-4 sm:px-5">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/eip/${eip.eip_number}`}
                              className="font-mono text-xs font-semibold text-primary hover:underline"
                            >
                              EIP-{eip.eip_number}
                            </Link>
                            <span className="text-sm font-medium text-foreground">{eip.title}</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {affected.map((group) => {
                              const Icon = STAKEHOLDER_ICON[group.key];
                              return (
                                <div
                                  key={group.key}
                                  className={cn(
                                    'rounded-lg border p-3',
                                    focus === group.key
                                      ? 'border-primary/40 bg-primary/5'
                                      : 'border-border/60 bg-card/60'
                                  )}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
                                    <span className="text-xs font-semibold text-foreground">
                                      {group.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {eip.impacts[group.key]}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        A filled dot means the EIP affects that group. Click any row to read the full impact
        for each affected stakeholder, or a column to focus one group.
      </p>
    </div>
  );
}
