'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Package,
  AlertCircle,
  FileText,
  Clock,
  Activity,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UpgradeTimelineChart } from '@/app/upgrade/_components/upgrade-timeline-chart';
import { PageHeader } from '@/components/header';
import { getUpgradeTimelineData } from '@/data/upgrade-timelines';
import { UpgradeBlogCarousel } from '@/app/upgrade/_components/upgrade-blog-carousel';
import { UpgradeEIPsShowcase } from '@/app/upgrade/_components/upgrade-eips-showcase';
import { getUpgradeBlogs } from '@/data/upgrade-blogs';
import { Info, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

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


export default function UpgradePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [upgrade, setUpgrade] = useState<UpgradeData | null>(null);
  const [composition, setComposition] = useState<CompositionItem[]>([]);
  const [timelineData, setTimelineData] = useState<Array<{
    date: string;
    included: string[];
    scheduled: string[];
    declined: string[];
    considered: string[];
    proposed: string[];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const blogPosts = getUpgradeBlogs(slug);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we have constant timeline data for this upgrade
        const constantTimeline = getUpgradeTimelineData(slug);
        
        if (constantTimeline) {
          // Use constant data for Pectra/Fusaka
          const upgradeData = await client.upgrades.getUpgrade({ slug });
          setUpgrade(upgradeData);

          // Get the last entry from timeline (final state)
          const lastEntry = constantTimeline[constantTimeline.length - 1];
          
          // Collect all EIP numbers from the final state with their buckets
          const eipBucketMap = new Map<number, string>();
          
          lastEntry.included.forEach(eip => {
            const num = parseInt(eip.replace('EIP-', ''));
            if (!isNaN(num)) eipBucketMap.set(num, 'included');
          });
          lastEntry.scheduled.forEach(eip => {
            const num = parseInt(eip.replace('EIP-', ''));
            if (!isNaN(num) && !eipBucketMap.has(num)) eipBucketMap.set(num, 'scheduled');
          });
          lastEntry.declined.forEach(eip => {
            const num = parseInt(eip.replace('EIP-', ''));
            if (!isNaN(num) && !eipBucketMap.has(num)) eipBucketMap.set(num, 'declined');
          });
          lastEntry.considered.forEach(eip => {
            const num = parseInt(eip.replace('EIP-', ''));
            if (!isNaN(num) && !eipBucketMap.has(num)) eipBucketMap.set(num, 'considered');
          });
          lastEntry.proposed.forEach(eip => {
            const num = parseInt(eip.replace('EIP-', ''));
            if (!isNaN(num) && !eipBucketMap.has(num)) eipBucketMap.set(num, 'proposed');
          });

          const allEipNumbers = Array.from(eipBucketMap.keys());

          // Fetch EIP details for all EIPs in batches to avoid too many requests
          const eipDetailsPromises = allEipNumbers.map(async (eipNum) => {
            try {
              const eipData = await client.proposals.getProposal({ repo: 'eip', number: eipNum });
              return {
                eip_number: eipNum,
                title: eipData.title || `EIP-${eipNum}`,
                status: eipData.status || null,
                bucket: eipBucketMap.get(eipNum) || null,
                updated_at: null,
              };
            } catch (err) {
              // Fallback if EIP not found
              console.warn(`Failed to fetch EIP-${eipNum}:`, err);
              return {
                eip_number: eipNum,
                title: `EIP-${eipNum}`,
                status: null,
                bucket: eipBucketMap.get(eipNum) || null,
                updated_at: null,
              };
            }
          });

          const compositionFromTimeline = await Promise.all(eipDetailsPromises);
          setComposition(compositionFromTimeline);

          // Convert constant data to match API format (EIP numbers as strings)
          setTimelineData(constantTimeline.map(item => ({
            date: item.date,
            included: item.included.map(eip => eip.replace('EIP-', '')),
            scheduled: item.scheduled.map(eip => eip.replace('EIP-', '')),
            declined: item.declined.map(eip => eip.replace('EIP-', '')),
            considered: item.considered.map(eip => eip.replace('EIP-', '')),
            proposed: item.proposed.map(eip => eip.replace('EIP-', '')),
          })));
        } else {
          // Fetch from database for other upgrades
          const [upgradeData, compositionData, timelineDataResult] = await Promise.all([
            client.upgrades.getUpgrade({ slug }),
            client.upgrades.getUpgradeCompositionCurrent({ slug }),
            client.upgrades.getUpgradeTimeline({ slug }),
          ]);

          setUpgrade(upgradeData);
          setComposition(compositionData);
          setTimelineData(timelineDataResult);
        }
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
          <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 sm:pt-10 sm:pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Upgrade name */}
                <h1 className="dec-title text-balance bg-gradient-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl">
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
              
              {/* Info Toggle Button */}
              <motion.button
                onClick={() => setIsInfoOpen(!isInfoOpen)}
                className={cn(
                  "group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  "border-slate-700/40 bg-slate-900/50 backdrop-blur-sm",
                  "transition-all hover:border-cyan-400/50 hover:bg-cyan-400/15",
                  "hover:shadow-lg hover:shadow-cyan-500/10"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isInfoOpen ? 'Hide info' : 'Show info'}
              >
                <Info className={cn(
                  "h-4 w-4 transition-all",
                  "text-slate-400 group-hover:text-cyan-300",
                  isInfoOpen && "text-cyan-300"
                )} />
              </motion.button>
            </div>

            {/* Collapsible Info Panel */}
            <AnimatePresence>
              {isInfoOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 shrink-0">
                          <Package className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">
                            EIP Composition
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Track which EIPs are included, scheduled, or under consideration for this upgrade
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 shrink-0">
                          <Clock className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">
                            Timeline
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Visualize how EIP statuses change over time as the upgrade progresses
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 shrink-0">
                          <Activity className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">
                            Activity
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            View all changes, additions, and removals of EIPs in this upgrade
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
          {/* Timeline Chart Section */}
          {timelineData.length > 0 && (
            <motion.div
              id="timeline-chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 mb-6"
            >
              <UpgradeTimelineChart data={timelineData} upgradeName={upgrade.name} />
            </motion.div>
          )}

          {/* About This Upgrade Section */}
          <motion.div
            id="about"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-lg border border-slate-700/40 bg-slate-950/50 p-4 sm:p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-white">About {upgrade.name}</h2>
            </div>
            {slug === 'pectra' ? (
              <p className="text-sm leading-relaxed text-slate-300">
                Ethereum developers are moving toward the next major network upgrade, Prague and Electra,
                collectively known as{' '}
                <Link href="/eip/7600" className="text-cyan-300 hover:text-cyan-200 underline">
                  Pectra
                </Link>
                . This upgrade will involve significant changes to the{' '}
                <a
                  href="https://www.youtube.com/watch?v=nJ57mkttCH0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline"
                >
                  Execution and Consensus layers
                </a>{' '}
                on the mainnet. Due to the complexity of testing and scope involving 11{' '}
                <a
                  href="https://www.youtube.com/watch?v=AyidVR6X6J8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline"
                >
                  Ethereum Improvement Proposals (EIPs)
                </a>
                , some EIPs were deferred to{' '}
                <Link href="/upgrade/fusaka" className="text-cyan-300 hover:text-cyan-200 underline">
                  Fusaka
                </Link>
                . Testing is ongoing on{' '}
                <a
                  href="https://notes.ethereum.org/@ethpandaops/pectra-devnet-6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline"
                >
                  Devnet 6
                </a>
                .
              </p>
            ) : slug === 'fusaka' ? (
              <p className="text-sm leading-relaxed text-slate-300">
                <Link href="/upgrade/fusaka" className="text-cyan-300 hover:text-cyan-200 underline">
                  Fusaka
                </Link>{' '}
                follows the Pectra upgrade, focusing on scaling and efficiency. Its headlining feature is{' '}
                <Link href="/eip/7594" className="text-cyan-300 hover:text-cyan-200 underline">
                  PeerDAS
                </Link>{' '}
                (Peer Data Availability Sampling), enabling significant blob throughput scaling. Fusaka also raises the L1 gas limit to 60M and introduces "Blob Parameter Only" (BPO) forks to safely scale blob capacity. Scheduled for Mainnet activation at slot{' '}
                <span className="font-semibold text-white">13,164,544</span> (Dec 3, 2025), it includes optimizations for L1 performance and UX improvements.
              </p>
            ) : slug === 'hegota' ? (
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  Early Planning Stage
                </span>
                <p className="text-sm leading-relaxed text-slate-300">
                  <Link href="/eip/8081" className="text-cyan-300 hover:text-cyan-200 underline font-semibold">
                    Hegotá
                  </Link>{' '}
                  is in early planning. The headliner proposal window will open soon. Check back for updates as the upgrade planning process begins.
                </p>
                <p className="text-xs leading-relaxed text-slate-400">
                  Future network upgrade currently in early planning stages. Named after the combination of{' '}
                  <span className="font-semibold">"Heze"</span> (consensus layer upgrade, named after a star) and{' '}
                  <span className="font-semibold">"Bogotá"</span> (execution layer upgrade, named after a Devcon location).
                </p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">
                Ethereum developers are now preparing for the next major network upgrade, known as{' '}
                <Link href="/eip/7773" className="text-cyan-300 hover:text-cyan-200 underline">
                  Glamsterdam
                </Link>
                . This upgrade will introduce key changes to both the{' '}
                <a
                  href="https://www.youtube.com/watch?v=nJ57mkttCH0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline"
                >
                  Execution and Consensus layers
                </a>{' '}
                on mainnet. The name combines{' '}
                <span className="font-semibold text-white">Amsterdam</span> (execution layer, from the previous Devconnect location) and{' '}
                <span className="font-semibold text-white">Gloas</span> (consensus layer, named after a star), highlighting its focus on both core protocol areas. The headliner feature for Glamsterdam is still being decided, with several{' '}
                <a
                  href="https://github.com/ethereum/EIPs/pulls?q=is%3Apr+is%3Aopen+milestone%3A%22Glamsterdam%22"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline"
                >
                  Ethereum Improvement Proposals (EIPs)
                </a>{' '}
                under review and active community discussions ongoing.
              </p>
            )}
          </motion.div>

          {/* Blog Carousel Section */}
          {blogPosts.length > 0 && (
            <motion.div
              id="related-articles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6"
            >
              <UpgradeBlogCarousel posts={blogPosts} upgradeName={upgrade.name} />
            </motion.div>
          )}

          {/* EIPs Showcase Section */}
          <motion.div
            id="eips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-lg border border-slate-700/40 bg-slate-950/50 p-4 sm:p-5 mb-6"
          >
            <UpgradeEIPsShowcase
              upgradeName={upgrade.name}
              composition={composition}
              upgradeColor="#06B6D4"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
