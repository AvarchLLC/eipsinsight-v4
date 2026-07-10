'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StageBadge } from '@/components/upgrade/stage-badge';
import type { UpgradeBucket } from '@/lib/upgrade-stages';

export interface ClientStanceView {
  clientName: string;
  clientType: 'EL' | 'CL';
  ratingSystem: string;
  rawRating: string;
  normalizedScore: number | null;
  comment?: string;
  sourceUrl?: string;
}

export interface ClientPriorityEip {
  eipId: number;
  title: string;
  bucket: UpgradeBucket | null;
  average: number | null;
  devnetCount: number;
  stances: ClientStanceView[];
}

/** Score → sentiment color for a client stance dot/pill. */
function scoreDot(score: number | null): string {
  if (score == null) return 'bg-muted-foreground/25';
  if (score >= 5) return 'bg-emerald-500';
  if (score >= 4) return 'bg-teal-500';
  if (score >= 3) return 'bg-amber-500';
  if (score >= 2) return 'bg-orange-500';
  return 'bg-red-500';
}

function scorePill(score: number | null): string {
  if (score == null) return 'border-border bg-muted/40 text-muted-foreground/60';
  if (score >= 5) return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (score >= 4) return 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300';
  if (score >= 3) return 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (score >= 2) return 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300';
  return 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300';
}

/** Overall consensus label from the average score. */
function consensus(average: number | null): { label: string; className: string } {
  if (average == null) return { label: 'No signal', className: 'text-muted-foreground' };
  if (average >= 4.2) return { label: 'Broad support', className: 'text-emerald-600 dark:text-emerald-300' };
  if (average >= 3.4) return { label: 'Leaning yes', className: 'text-teal-600 dark:text-teal-300' };
  if (average >= 2.6) return { label: 'Mixed', className: 'text-amber-600 dark:text-amber-300' };
  if (average >= 1.8) return { label: 'Contested', className: 'text-orange-600 dark:text-orange-300' };
  return { label: 'Opposed', className: 'text-red-600 dark:text-red-300' };
}

function StanceChip({ stance }: { stance: ClientStanceView }) {
  const content = (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-1.5 py-0.5 text-[10px] font-medium"
      title={`${stance.clientName}: ${stance.rawRating}${stance.comment ? ` — ${stance.comment}` : ''} (${stance.ratingSystem})`}
    >
      <span className={cn('h-2 w-2 rounded-full', scoreDot(stance.normalizedScore))} />
      <span className="text-foreground/80">{stance.clientName}</span>
    </span>
  );
  return stance.sourceUrl ? (
    <a href={stance.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
      {content}
    </a>
  ) : (
    content
  );
}

type LayerFilter = 'all' | 'EL' | 'CL';

export function ClientPriorityView({
  eips,
  hasDevnetData,
}: {
  eips: ClientPriorityEip[];
  hasDevnetData: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [layer, setLayer] = useState<LayerFilter>('all');

  const rows = useMemo(() => {
    return eips.map((eip) => {
      const stances =
        layer === 'all' ? eip.stances : eip.stances.filter((s) => s.clientType === layer);
      const scored = stances.filter((s) => s.normalizedScore != null);
      const positive = scored.filter((s) => (s.normalizedScore ?? 0) >= 4).length;
      const negative = scored.filter((s) => (s.normalizedScore ?? 0) <= 2).length;
      const average =
        scored.length > 0
          ? scored.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / scored.length
          : null;
      return { ...eip, filteredStances: stances, average, positive, negative, rated: scored.length };
    });
  }, [eips, layer]);

  return (
    <div className="space-y-4">
      {/* Layer filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Client layer</span>
        {(['all', 'EL', 'CL'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setLayer(option)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              layer === option
                ? option === 'EL'
                  ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : option === 'CL'
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                    : 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
            )}
          >
            {option === 'all' ? 'All teams' : option === 'EL' ? 'Execution' : 'Consensus'}
          </button>
        ))}
      </div>

      {/* EIP consensus cards */}
      <div className="space-y-2.5">
        {rows.map((row) => {
          const isOpen = expanded === row.eipId;
          const verdict = consensus(row.average);
          return (
            <div
              key={row.eipId}
              className={cn(
                'rounded-xl border bg-card/60 transition-colors',
                isOpen ? 'border-primary/40' : 'border-border hover:border-primary/30'
              )}
            >
              {/* Header row (click to expand) */}
              <button
                onClick={() => setExpanded(isOpen ? null : row.eipId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      EIP-{row.eipId}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">{row.title}</span>
                    <StageBadge bucket={row.bucket} abbreviated />
                  </div>
                  {/* Stance chips (the at-a-glance sentiment) */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {row.filteredStances.length > 0 ? (
                      row.filteredStances
                        .slice()
                        .sort((a, b) => (b.normalizedScore ?? -1) - (a.normalizedScore ?? -1))
                        .map((stance) => <StanceChip key={stance.clientName} stance={stance} />)
                    ) : (
                      <span className="text-xs text-muted-foreground/60">
                        No {layer === 'all' ? '' : layer + ' '}client stances recorded
                      </span>
                    )}
                  </div>
                </div>
                {/* Consensus summary */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn('text-xs font-semibold', verdict.className)}>{verdict.label}</span>
                  <div className="flex items-center gap-1.5">
                    {row.average != null && (
                      <span
                        className={cn(
                          'inline-flex min-w-8 justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                          scorePill(row.average)
                        )}
                        title="Average team score (1–5)"
                      >
                        {row.average.toFixed(1)}
                      </span>
                    )}
                    {hasDevnetData && row.devnetCount > 0 && (
                      <span
                        title={`Shipped in ${row.devnetCount} devnet(s)`}
                        className="inline-flex items-center gap-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        <FlaskConical className="h-2.5 w-2.5" />
                        {row.devnetCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded: per-client detail */}
              {isOpen && row.filteredStances.length > 0 && (
                <div className="border-t border-border/60 px-4 py-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="py-1.5 pr-3">Team</th>
                          <th className="py-1.5 pr-3">Rating</th>
                          <th className="py-1.5 pr-3">Rationale</th>
                          <th className="py-1.5">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.filteredStances
                          .slice()
                          .sort(
                            (a, b) =>
                              a.clientType.localeCompare(b.clientType) ||
                              (b.normalizedScore ?? -1) - (a.normalizedScore ?? -1)
                          )
                          .map((stance) => (
                            <tr key={stance.clientName} className="border-t border-border/40">
                              <td className="py-2 pr-3">
                                <span className="flex items-center gap-1.5">
                                  <span className={cn('h-2 w-2 rounded-full', scoreDot(stance.normalizedScore))} />
                                  <span className="font-medium text-foreground">{stance.clientName}</span>
                                  <span
                                    className={cn(
                                      'rounded px-1 text-[9px] font-semibold',
                                      stance.clientType === 'EL'
                                        ? 'text-indigo-600 dark:text-indigo-300'
                                        : 'text-teal-600 dark:text-teal-300'
                                    )}
                                  >
                                    {stance.clientType}
                                  </span>
                                </span>
                              </td>
                              <td className="py-2 pr-3">
                                <span
                                  className={cn(
                                    'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                                    scorePill(stance.normalizedScore)
                                  )}
                                >
                                  {stance.rawRating}
                                </span>
                              </td>
                              <td className="max-w-md py-2 pr-3 text-xs leading-relaxed text-muted-foreground">
                                {stance.comment || <span className="opacity-50">—</span>}
                              </td>
                              <td className="py-2">
                                {stance.sourceUrl ? (
                                  <a
                                    href={stance.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                                  >
                                    View <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <p className="text-[11px] text-muted-foreground">
        Each dot is a team&apos;s stance:{' '}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> strong support
        </span>{' '}
        →{' '}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> neutral
        </span>{' '}
        →{' '}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> opposed
        </span>
        . EIPs are sorted by overall support. Click one for each team&apos;s rating, rationale,
        and source.
      </p>
    </div>
  );
}
