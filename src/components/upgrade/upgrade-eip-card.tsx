'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpgradeCompositionEip } from '@/components/upgrade/types';
import { STAKEHOLDER_LABEL } from '@/lib/stakeholders';

function statusChipClass(status: string | null): string {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'draft') return 'bg-slate-500/15 text-slate-700 dark:text-slate-300';
  if (normalized === 'review') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (normalized.includes('last')) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
  if (normalized === 'final') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (normalized === 'living') return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300';
  if (normalized === 'withdrawn') return 'bg-red-500/15 text-red-700 dark:text-red-300';
  if (normalized === 'stagnant') return 'bg-gray-500/15 text-gray-600 dark:text-gray-400';
  return 'bg-muted text-muted-foreground';
}

const NORTH_STAR_LABELS: Record<string, string> = {
  scaleL1: 'Scale L1',
  scaleBlobs: 'Scale blobs',
  improveUX: 'Improve UX',
};

/**
 * EIP card for upgrade detail pages. Collapsed: number, layer, title, and a
 * plain-language summary. "Show more" expands benefits, tradeoffs, who it
 * affects, roadmap alignment, and metadata via a CSS grid-rows transition.
 */
export function UpgradeEipCard({
  eip,
  upgradeSlug,
}: {
  eip: UpgradeCompositionEip;
  upgradeSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const isHeadliner = eip.curation?.headliner_of === upgradeSlug;
  const displayTitle = eip.curation?.layman_title || eip.title || `EIP-${eip.eip_number}`;
  const summary = eip.curation?.layman_summary;
  const benefits = eip.curation?.benefits ?? [];
  const tradeoffs = eip.curation?.tradeoffs ?? [];
  const stakeholderImpacts = Object.entries(eip.curation?.stakeholder_impacts ?? {}).filter(
    ([, value]) => value?.description
  );
  const northStar = Object.entries(eip.curation?.north_star ?? {}).filter(
    ([, value]) => value?.description
  );
  const hasExpandableContent =
    benefits.length > 0 ||
    tradeoffs.length > 0 ||
    stakeholderImpacts.length > 0 ||
    northStar.length > 0 ||
    Boolean(eip.author) ||
    Boolean(eip.created_at);

  return (
    <div
      id={`eip-${eip.eip_number}`}
      className={cn(
        'scroll-mt-28 rounded-xl border bg-card/60 p-4 transition-colors sm:p-5',
        isHeadliner
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/40'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/eip/${eip.eip_number}`}
              className="font-mono text-sm font-semibold text-primary hover:underline"
            >
              EIP-{eip.eip_number}
            </Link>
            {isHeadliner && (
              <span
                title={eip.curation?.headliner_note || 'Headliner feature of this upgrade'}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
              >
                <Star className="h-3 w-3 fill-current" />
                Headliner
              </span>
            )}
            {eip.curation?.layer && (
              <span
                title={
                  eip.curation.layer === 'EL'
                    ? 'Primarily impacts the Execution Layer'
                    : 'Primarily impacts the Consensus Layer'
                }
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  eip.curation.layer === 'EL'
                    ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                )}
              >
                {eip.curation.layer}
              </span>
            )}
            {eip.status && (
              <span
                title={`Current status of the proposal itself: ${eip.status}`}
                className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusChipClass(eip.status))}
              >
                {eip.status}
              </span>
            )}
          </div>
          <h4 className="mt-1 text-sm font-semibold text-foreground">{displayTitle}</h4>
        </div>
      </div>

      {summary && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      )}

      {hasExpandableContent && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 pt-3">
              {benefits.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key benefits
                  </h5>
                  <ul className="mt-1.5 space-y-1">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 text-primary">+</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tradeoffs.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Trade-offs & considerations
                  </h5>
                  <ul className="mt-1.5 space-y-1">
                    {tradeoffs.map((tradeoff) => (
                      <li key={tradeoff} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 text-amber-500">–</span>
                        <span>{tradeoff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stakeholderImpacts.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Who this affects
                  </h5>
                  <dl className="mt-1.5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {stakeholderImpacts.map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-muted/40 p-2.5">
                        <dt className="text-[11px] font-semibold text-foreground/80">
                          {STAKEHOLDER_LABEL[key] ?? key}
                        </dt>
                        <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {value.description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {northStar.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Roadmap alignment
                  </h5>
                  <div className="mt-1.5 space-y-1.5">
                    {northStar.map(([key, value]) => (
                      <p key={key} className="text-xs leading-relaxed text-muted-foreground">
                        <span className="mr-1.5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {NORTH_STAR_LABELS[key] ?? key}
                        </span>
                        {value.description}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {(eip.author || eip.created_at) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  {eip.author && (
                    <span className="max-w-full truncate">
                      <span className="font-semibold text-foreground/70">Authors:</span> {eip.author}
                    </span>
                  )}
                  {eip.created_at && (
                    <span>
                      <span className="font-semibold text-foreground/70">Created:</span>{' '}
                      {eip.created_at.slice(0, 10)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {hasExpandableContent && (
          <button
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-300', expanded && 'rotate-180')}
            />
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <Link
          href={`/eip/${eip.eip_number}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Full proposal & spec
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
