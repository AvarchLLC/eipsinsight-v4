'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Package,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Github,
  Calendar,
  Layers,
  FileText,
  Clock,
  Activity
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpgradeData {
  id: number;
  slug: string;
  name: string;
  meta_eip: number | null;
  created_at: string | null;
}

interface CompositionItem {
  eip_number: number;
  bucket: string | null;
  title: string;
  status: string | null;
  updated_at: string | null;
}

interface CompositionEvent {
  commit_date: string | null;
  eip_number: number | null;
  event_type: string | null;
  bucket: string | null;
  commit_sha: string | null;
}

// Bucket color mapping
const bucketColors: Record<string, { bg: string; text: string; border: string }> = {
  'scheduled': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-400/30' },
  'proposed': { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-400/30' },
  'considered': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-400/30' },
  'declined': { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-400/30' },
};

// Status color mapping
const statusColors: Record<string, { bg: string; text: string }> = {
  'Draft': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'Review': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'Last Call': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'Final': { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  'Stagnant': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
  'Withdrawn': { bg: 'bg-red-500/20', text: 'text-red-300' },
};

// Helper to format bucket name
function formatBucket(bucket: string | null): string {
  if (!bucket) return 'Unknown';
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

// Helper to format event type
function formatEventType(eventType: string | null): string {
  if (!eventType) return 'Changed';
  return eventType.toLowerCase().replace(/_/g, ' ');
}

export default function UpgradePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [upgrade, setUpgrade] = useState<UpgradeData | null>(null);
  const [composition, setComposition] = useState<CompositionItem[]>([]);
  const [events, setEvents] = useState<CompositionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [upgradeData, compositionData, eventsData] = await Promise.all([
          client.upgrades.getUpgrade({ slug }),
          client.upgrades.getUpgradeCompositionCurrent({ slug }),
          client.upgrades.getUpgradeCompositionEvents({ slug, limit: 50 }),
        ]);

        setUpgrade(upgradeData);
        setComposition(compositionData);
        setEvents(eventsData);
      } catch (err: any) {
        console.error('Failed to fetch upgrade data:', err);
        setError(err.message || 'Failed to load upgrade');
        if (err.code === 'NOT_FOUND') {
          setError('Upgrade not found');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !upgrade) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to load upgrade</h2>
          <p className="text-slate-400">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  // Group composition by bucket
  const compositionByBucket = composition.reduce((acc, item) => {
    const bucket = item.bucket || 'unknown';
    if (!acc[bucket]) {
      acc[bucket] = [];
    }
    acc[bucket].push(item);
    return acc;
  }, {} as Record<string, CompositionItem[]>);

  // Bucket order
  const bucketOrder = ['scheduled', 'proposed', 'considered', 'declined'];
  const orderedBuckets = bucketOrder.filter(b => compositionByBucket[b]);

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Seamless Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15),_transparent_50%),_radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/10 via-emerald-400/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* 1. Upgrade Header */}
        <div className="relative w-full bg-background/80 backdrop-blur-xl border-b border-cyan-400/10">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-12 sm:pb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Upgrade name */}
                <h1 className="dec-title text-balance bg-gradient-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
                  {upgrade.name}
                </h1>

                {/* Subtitle and Meta EIP */}
                <div className="flex items-center gap-4 flex-wrap">
                  <p className="text-sm text-slate-400">
                    Network Upgrade
                  </p>
                  {upgrade.meta_eip && (
                    <Link 
                      href={`/eip/${upgrade.meta_eip}`}
                      className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Meta EIP: EIP-{upgrade.meta_eip}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          {/* 2. Upgrade Snapshot - Simplified for now */}
          {upgrade.created_at && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-6 mb-12 mt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-white">
                    {new Date(upgrade.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total EIPs</p>
                  <p className="text-sm text-white font-semibold">{composition.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Buckets</p>
                  <p className="text-sm text-white">{orderedBuckets.length}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. Upgrade Timeline - Major milestones (simplified for now) */}
          {upgrade.created_at && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-6 mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Timeline</h3>
              </div>
              <div className="space-y-3">
                {upgrade.created_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex-shrink-0 w-32 text-slate-400">
                      {new Date(upgrade.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-slate-300">Upgrade created</div>
                  </div>
                )}
                {upgrade.meta_eip && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex-shrink-0 w-32 text-slate-400">—</div>
                    <div className="text-slate-300">
                      Meta EIP{' '}
                      <Link 
                        href={`/eip/${upgrade.meta_eip}`}
                        className="text-cyan-300 hover:text-cyan-200 transition-colors font-mono"
                      >
                        EIP-{upgrade.meta_eip}
                      </Link>
                      {' '}created
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. EIP Composition (Core Section) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-8 mb-12"
          >
            <div className="flex items-center gap-2 mb-8">
              <Package className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">EIP Composition</h3>
            </div>

            {orderedBuckets.length === 0 ? (
              <p className="text-slate-400 text-sm">No EIPs in this upgrade yet.</p>
            ) : (
              <div className="space-y-8">
                {orderedBuckets.map((bucket) => {
                  const items = compositionByBucket[bucket];
                  const bucketColor = bucketColors[bucket] || bucketColors['scheduled'];
                  
                  return (
                    <div key={bucket}>
                      {/* Bucket header */}
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className={cn(
                          "text-lg font-semibold",
                          bucketColor.text
                        )}>
                          {formatBucket(bucket)} for Inclusion ({items.length})
                        </h4>
                        <div className={cn(
                          "h-px flex-1",
                          bucketColor.border.replace('border-', 'bg-').replace('/30', '/20')
                        )} />
                      </div>

                      {/* EIP rows */}
                      <div className="space-y-2">
                        {items.map((item) => {
                          const statusColor = statusColors[item.status || ''] || statusColors['Draft'];
                          
                          return (
                            <Link
                              key={item.eip_number}
                              href={`/eip/${item.eip_number}`}
                              className="block rounded-lg border border-slate-700/30 bg-slate-900/30 p-4 hover:bg-slate-900/50 hover:border-cyan-400/30 transition-all group"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-mono text-cyan-300 group-hover:text-cyan-200 transition-colors">
                                      EIP-{item.eip_number}
                                    </span>
                                    {item.status && (
                                      <span className={cn(
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                        statusColor.bg,
                                        statusColor.text
                                      )}>
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-white truncate">{item.title}</p>
                                  {item.updated_at && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      Updated {new Date(item.updated_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* 5. Upgrade Activity (Event Feed) */}
          {events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-6 mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-violet-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">All Activity</h3>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm py-2 border-b border-slate-700/20 last:border-0">
                    <div className="flex-shrink-0 w-28 text-slate-400 text-xs">
                      {event.commit_date ? (
                        new Date(event.commit_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      ) : (
                        'Unknown'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {event.eip_number ? (
                        <span>
                          <Link 
                            href={`/eip/${event.eip_number}`}
                            className="text-cyan-300 hover:text-cyan-200 transition-colors font-mono"
                          >
                            EIP-{event.eip_number}
                          </Link>
                          {' '}
                          <span className="text-slate-300">
                            {formatEventType(event.event_type)} to {formatBucket(event.bucket)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {formatEventType(event.event_type)}
                        </span>
                      )}
                    </div>
                    {event.commit_sha && (
                      <a
                        href={`https://github.com/ethereum/EIPs/commit/${event.commit_sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Github className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 6. About This Upgrade - Placeholder for future content */}
          {/* This would come from upgrade.description_markdown when available */}

          {/* 7. Related Resources - Optional, hide if empty */}
        </div>
      </div>
    </div>
  );
}
