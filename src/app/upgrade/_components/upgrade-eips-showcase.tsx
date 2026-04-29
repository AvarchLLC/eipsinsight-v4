'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EIPItem {
  eip_number: number;
  title: string;
  bucket: string | null;
  status: string | null;
}

interface UpgradeEIPsShowcaseProps {
  upgradeName: string;
  composition: EIPItem[];
  upgradeColor?: string;
  heading?: string;
  description?: string;
}

const bucketColors: Record<string, { bg: string; text: string; border: string }> = {
  'included': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-emerald-400/30' },
  'scheduled': { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-300', border: 'border-cyan-400/30' },
  'proposed': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-400/30' },
  'considered': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', border: 'border-amber-400/30' },
  'declined': { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-400/30' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  'Draft': { bg: 'bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-300' },
  'Review': { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-300' },
  'Last Call': { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-300' },
  'Final': { bg: 'bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-300' },
  'Stagnant': { bg: 'bg-slate-500/20', text: 'text-slate-600 dark:text-slate-300' },
  'Withdrawn': { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-300' },
};

function formatBucket(bucket: string | null): string {
  if (!bucket) return 'Unknown';
  const bucketMap: Record<string, string> = {
    'included': 'Included',
    'scheduled': 'Scheduled For Inclusion (SFI)',
    'proposed': 'Proposed For Inclusion (PFI)',
    'considered': 'Considered For Inclusion (CFI)',
    'declined': 'Declined For Inclusion (DFI)',
  };
  return bucketMap[bucket.toLowerCase()] || bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

export function UpgradeEIPsShowcase({
  upgradeName,
  composition,
  upgradeColor = '#06B6D4',
  heading,
  description = 'Complete list of Ethereum Improvement Proposals in this upgrade',
}: UpgradeEIPsShowcaseProps) {
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [hoveredEip, setHoveredEip] = useState<number | null>(null);

  // Group by bucket
  const compositionByBucket = composition.reduce((acc, item) => {
    const bucket = item.bucket || 'unknown';
    if (!acc[bucket]) {
      acc[bucket] = [];
    }
    acc[bucket].push(item);
    return acc;
  }, {} as Record<string, EIPItem[]>);

  // Bucket order
  const bucketOrder = ['proposed', 'considered', 'scheduled', 'declined', 'included'];
  const orderedBuckets = bucketOrder.filter(b => compositionByBucket[b] && compositionByBucket[b].length > 0);
  const allExpanded = orderedBuckets.length > 0 && orderedBuckets.every((bucket) => expandedBuckets.has(bucket));

  const showInitialRows = 2;
  const cardsPerRow = 3;
  const initialVisibleCount = showInitialRows * cardsPerRow;
  const EIPCard = ({ eip }: { eip: EIPItem }) => {
    const bucketColor = bucketColors[eip.bucket || ''] || bucketColors['proposed'];
    const statusColor = statusColors[eip.status || ''] || statusColors['Draft'];
    const isHovered = hoveredEip === eip.eip_number;

    return (
      <Link href={`/eip/${eip.eip_number}`}>
        <motion.div
          className={cn(
            'group relative rounded-lg border border-border bg-card/60 p-2.5 cursor-pointer overflow-hidden',
            'transition-all',
            isHovered ? bucketColor.border : 'border-border',
            'hover:border-primary/40'
          )}
          onMouseEnter={() => setHoveredEip(eip.eip_number)}
          onMouseLeave={() => setHoveredEip(null)}
          whileHover={{ y: -2, scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top border accent */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-0.5 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-30'
            )}
            style={{ backgroundColor: upgradeColor }}
          />

          <div className="space-y-1.5 mt-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn(
                  'px-1.5 py-0.5 rounded-md text-xs font-bold',
                  bucketColor.bg,
                  bucketColor.text
                )}>
                  EIP-{eip.eip_number}
                </span>
                {eip.status && (
                  <span className={cn(
                    'px-1 py-0.5 rounded text-xs font-medium',
                    statusColor.bg,
                    statusColor.text
                  )}>
                    {eip.status}
                  </span>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
              {eip.title}
            </h4>

            <div className="flex items-center gap-1.5">
              <span className={cn('text-xs', bucketColor.text)}>
                {formatBucket(eip.bucket)}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  };

  if (orderedBuckets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-6">
        <p className="text-sm text-muted-foreground">No EIPs in this upgrade yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {heading || `${upgradeName} EIPs`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          {orderedBuckets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (allExpanded) {
                  setExpandedBuckets(new Set());
                } else {
                  setExpandedBuckets(new Set(orderedBuckets));
                }
              }}
              className="inline-flex shrink-0 items-center rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

      </div>

      {orderedBuckets.map((bucket) => {
        const items = compositionByBucket[bucket];
        const bucketColor = bucketColors[bucket] || bucketColors['proposed'];
        const isExpanded = expandedBuckets.has(bucket);
        const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);
        const hasMore = items.length > initialVisibleCount;

        const toggleBucket = () => {
          setExpandedBuckets(prev => {
            const next = new Set(prev);
            if (next.has(bucket)) {
              next.delete(bucket);
            } else {
              next.add(bucket);
            }
            return next;
          });
        };

        return (
          <div key={bucket} className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <h4 className={cn('text-sm font-semibold', bucketColor.text)}>
                {formatBucket(bucket)}
              </h4>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                bucketColor.bg,
                bucketColor.text
              )}>
                {items.length}
              </span>
              <div className={cn('h-px flex-1', bucketColor.border.replace('border-', 'bg-').replace('/30', '/20'))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <AnimatePresence mode="wait">
                {visibleItems.map((item, idx) => (
                  <motion.div
                    key={item.eip_number}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                  >
                    <EIPCard eip={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-1.5">
                <motion.button
                  onClick={toggleBucket}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    'border-border bg-muted/60 text-muted-foreground',
                    'hover:border-primary/40 hover:text-primary hover:bg-primary/10',
                    'flex items-center gap-1.5'
                  )}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show More ({items.length - initialVisibleCount} more)
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}
