'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Package,
  AlertCircle,
  FileText,
  Clock,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { UpgradeTimelineChart } from '@/app/upgrade/_components/upgrade-timeline-chart';
import { getUpgradeTimelineData } from '@/data/upgrade-timelines';
import { UpgradeBlogCarousel } from '@/app/upgrade/_components/upgrade-blog-carousel';
import { UpgradeEIPsShowcase } from '@/app/upgrade/_components/upgrade-eips-showcase';
import { Info } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { UpgradeSubscriptionCard } from '@/components/upgrade-subscription-card';
import type { UpgradeArticle } from '@/lib/upgrade-articles';

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
  const [blogPosts, setBlogPosts] = useState<UpgradeArticle[]>([]);
  const [expandedDashboardBuckets, setExpandedDashboardBuckets] = useState({
    review: false,
    blocked: false,
    ready: false,
  });
  const isPectra = slug === 'pectra';
  const isDashboardUpgrade = slug === 'glamsterdam' || slug === 'hegota';
  const dashboardBreakdown = useMemo(() => {
    if (!isDashboardUpgrade) {
      return {
        inReview: [] as CompositionItem[],
        blocked: [] as CompositionItem[],
        readyForLastCall: [] as CompositionItem[],
      };
    }
    const blocked = composition.filter((item) => (item.bucket ?? '').toLowerCase() === 'declined');
    const activePool = composition.filter((item) => (item.bucket ?? '').toLowerCase() !== 'declined');
    const readyForLastCall = activePool.filter((item) => (item.status ?? '').toLowerCase() === 'last call');
    const inReview = activePool.filter((item) => (item.status ?? '').toLowerCase() !== 'last call');

    return {
      inReview,
      blocked,
      readyForLastCall,
    };
  }, [isDashboardUpgrade, composition]);
  const upgradeBreakdown = useMemo(() => {
    if (!isDashboardUpgrade) return null;
    if (timelineData.length > 0) {
      const latest = [...timelineData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[timelineData.length - 1];
      if (latest) {
        return {
          totalEips: latest.included.length + latest.scheduled.length + latest.declined.length + latest.considered.length + latest.proposed.length,
          inReview: latest.considered.length,
          blocked: latest.declined.length,
          readyForLastCall: latest.scheduled.length,
        };
      }
    }
    return {
      totalEips: composition.length,
      inReview: dashboardBreakdown.inReview.length,
      blocked: dashboardBreakdown.blocked.length,
      readyForLastCall: dashboardBreakdown.readyForLastCall.length,
    };
  }, [isDashboardUpgrade, timelineData, composition.length, dashboardBreakdown]);
  const dashboardSections = [
    {
      key: 'ready' as const,
      label: 'Ready for Last Call',
      items: dashboardBreakdown.readyForLastCall,
      accent: 'text-cyan-700 dark:text-cyan-300',
      line: 'border-cyan-400/30',
      card: 'border-cyan-400/30',
      helper: 'Ready for Last Call',
    },
    {
      key: 'review' as const,
      label: 'In Review',
      items: dashboardBreakdown.inReview,
      accent: 'text-amber-700 dark:text-amber-300',
      line: 'border-amber-400/30',
      card: 'border-amber-400/30',
      helper: 'In Review',
    },
    {
      key: 'blocked' as const,
      label: 'Blocked',
      items: dashboardBreakdown.blocked,
      accent: 'text-red-700 dark:text-red-300',
      line: 'border-red-400/30',
      card: 'border-red-400/30',
      helper: 'Blocked',
    },
  ];

  const statusChipClass = (status: string | null) => {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'draft') return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300';
    if (normalized === 'review') return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    if (normalized.includes('last')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    if (normalized === 'final') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    if (normalized === 'withdrawn' || normalized === 'stagnant') return 'bg-slate-500/15 text-slate-700 dark:text-slate-300';
    return 'bg-muted text-muted-foreground';
  };

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
      } catch (err: unknown) {
        console.error('Failed to fetch upgrade data:', err);
        const message = err instanceof Error ? err.message : 'Failed to load upgrade';
        setError(message);
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === 'NOT_FOUND'
        ) {
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

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch(`/api/upgrade-articles/${slug}`);
        if (!response.ok) {
          throw new Error('Failed to load related articles');
        }
        const posts = (await response.json()) as UpgradeArticle[];
        setBlogPosts(posts);
      } catch (err) {
        console.error('Failed to fetch related articles:', err);
        setBlogPosts([]);
      }
    };

    if (slug) {
      fetchArticles();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !upgrade) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Failed to load upgrade</h2>
          <p className="text-muted-foreground">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      <div className="relative z-10">
        {/* 1. Upgrade Header */}
        <div className="relative w-full bg-background border-b border-border/60">
          <div className="mx-auto w-full px-3 pt-8 pb-4 sm:px-4 sm:pt-10 sm:pb-6 lg:px-5 xl:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Upgrade name */}
                <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl md:text-5xl">
                  {upgrade.name}
                </h1>

                {/* Subtitle and Meta EIP */}
                <div className="flex items-center gap-4 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Network Upgrade
                  </p>
                  {upgrade.meta_eip && (
                    <Link 
                      href={`/eip/${upgrade.meta_eip}`}
                      className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
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
                  "border-border bg-muted/60 backdrop-blur-sm",
                  "transition-all hover:border-primary/40 hover:bg-primary/10",
                  "hover:shadow-lg hover:shadow-primary/15"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isInfoOpen ? 'Hide info' : 'Show info'}
              >
                <Info className={cn(
                  "h-4 w-4 transition-all",
                  "text-muted-foreground group-hover:text-primary",
                  isInfoOpen && "text-primary"
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
                  <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground mb-1">
                            EIP Composition
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Track which EIPs are included, scheduled, or under consideration for this upgrade
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground mb-1">
                            Timeline
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Visualize how EIP statuses change over time as the upgrade progresses
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground mb-1">
                            Activity
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
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

        <div className="mx-auto w-full space-y-6 px-3 pb-8 pt-3 sm:px-4 sm:pt-4 lg:px-5 xl:px-6">
          {!['pectra', 'fusaka'].includes(slug) && (
            <div>
              <UpgradeSubscriptionCard slug={upgrade.slug} name={upgrade.name} />
            </div>
          )}

          {/* About This Upgrade Section */}
          <motion.div
            id="about"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-xl border border-border bg-card/60 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">About {upgrade.name}</h2>
            </div>
            {slug === 'pectra' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ethereum developers are moving toward the next major network upgrade, Prague and Electra,
                collectively known as{' '}
                <Link href="/eip/7600" className="text-primary hover:text-primary/80 underline">
                  Pectra
                </Link>
                . This upgrade will involve significant changes to the{' '}
                <a
                  href="https://www.youtube.com/watch?v=nJ57mkttCH0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Execution and Consensus layers
                </a>{' '}
                on the mainnet. Due to the complexity of testing and scope involving 11{' '}
                <a
                  href="https://www.youtube.com/watch?v=AyidVR6X6J8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Ethereum Improvement Proposals (EIPs)
                </a>
                , some EIPs were deferred to{' '}
                <Link href="/upgrade/fusaka" className="text-primary hover:text-primary/80 underline">
                  Fusaka
                </Link>
                . Testing is ongoing on{' '}
                <a
                  href="https://notes.ethereum.org/@ethpandaops/pectra-devnet-6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Devnet 6
                </a>
                .
              </p>
            ) : slug === 'fusaka' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                <Link href="/upgrade/fusaka" className="text-primary hover:text-primary/80 underline">
                  Fusaka
                </Link>{' '}
                follows the Pectra upgrade, focusing on scaling and efficiency. Its headlining feature is{' '}
                <Link href="/eip/7594" className="text-primary hover:text-primary/80 underline">
                  PeerDAS
                </Link>{' '}
                (Peer Data Availability Sampling), enabling significant blob throughput scaling. Fusaka also raises the L1 gas limit to 60M and introduces &quot;Blob Parameter Only&quot; (BPO) forks to safely scale blob capacity. Scheduled for Mainnet activation at slot{' '}
                <span className="font-semibold text-foreground">13,164,544</span> (Dec 3, 2025), it includes optimizations for L1 performance and UX improvements.
              </p>
            ) : slug === 'hegota' ? (
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Early Planning Stage
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <Link href="/eip/8081" className="text-primary hover:text-primary/80 underline font-semibold">
                    Hegotá
                  </Link>{' '}
                  is in early planning. The headliner proposal window will open soon. Check back for updates as the upgrade planning process begins.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Future network upgrade currently in early planning stages. Named after the combination of{' '}
                  <span className="font-semibold">&quot;Heze&quot;</span> (consensus layer upgrade, named after a star) and{' '}
                  <span className="font-semibold">&quot;Bogotá&quot;</span> (execution layer upgrade, named after a Devcon location).
                </p>
              </div>
            ) : slug === 'frontier' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Frontier was Ethereum&apos;s genesis release on July 30, 2015, marked the official launch of the Ethereum mainnet. It enabled the deployment of smart contracts and laid the foundation for decentralized applications, establishing the core protocol functionality that Ethereum is built upon today.
              </p>
            ) : slug === 'homestead' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Homestead was the first planned Ethereum upgrade, introducing critical safety improvements. It added the DELEGATECALL opcode for complex contract interactions and fixed vulnerabilities in the contract creation process, establishing a foundation for more secure smart contract development.
              </p>
            ) : slug === 'dao-fork' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                The DAO Fork was an irregular state transition coordinated by the community to recover funds stolen in The DAO exploit. This upgrade demonstrated the power of community governance and established an important precedent for protocol decision-making during critical security incidents.
              </p>
            ) : slug === 'tangerine-whistle' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tangerine Whistle addressed denial-of-service vulnerabilities by repricing gas for state-heavy operations. This upgrade made attacks economically infeasible and significantly enhanced network resilience against spam attacks.
              </p>
            ) : slug === 'spurious-dragon' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Spurious Dragon continued Ethereum&apos;s security improvements with EXP gas repricing, contract code size limits, and transaction replay protection via the ChainID parameter (EIP-155). It hardened the network against further DoS vectors and enabled cross-chain transaction safety.
              </p>
            ) : slug === 'byzantium' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Byzantium was a major Metropolis phase upgrade introducing the REVERT opcode for safer contract development, zk-SNARKs precompiles for privacy technologies, and block rewards reduction moving the network toward Proof-of-Stake. It represented a significant modernization of the EVM.
              </p>
            ) : slug === 'constantinople' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Constantinople optimized EVM operations including SSTORE gas cost improvements, the CREATE2 opcode, and bitwise shifting. These changes reduced smart contract deployment costs and significantly improved EVM performance.
              </p>
            ) : slug === 'istanbul' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Istanbul introduced gas repricing for state-rent preparation, privacy-enabling precompiles, and STATICCALL optimizations. These changes prepared the network for scalability solutions and enhanced interoperability between different systems.
              </p>
            ) : slug === 'berlin' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Berlin optimized gas accounting for state-access operations and introduced transaction access lists to enable more efficient Layer 2 solutions. This upgrade improved L2 scalability readiness and optimized gas costs for users.
              </p>
            ) : slug === 'london' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                London fundamentally reformed Ethereum&apos;s fee market with EIP-1559, introducing dynamic base fees and a burn mechanism. This upgrade revolutionized how transaction fees work, improved user experience, and began Ethereum&apos;s deflationary phase.
              </p>
            ) : slug === 'paris' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Merge was Ethereum&apos;s most significant upgrade, transitioning consensus from Proof-of-Work to Proof-of-Stake. This historic change reduced energy consumption by 99.95% and established validator-based security, marking a fundamental shift in how the network operates.
              </p>
            ) : slug === 'shanghai' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Shanghai enabled validators to withdraw accrued staking rewards and exit the validator set, fulfilling a critical Proof-of-Stake requirement. This upgrade unlocked staking functionality and completed the core capabilities needed for validator participation.
              </p>
            ) : slug === 'cancun' ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cancun delivered proto-danksharding through EIP-4844 (blobs), enabling Layer 2 solutions to post data more economically. This upgrade reduced rollup costs by orders of magnitude and laid crucial groundwork for full danksharding scalability.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ethereum developers are now preparing for the next major network upgrade, known as{' '}
                <Link href="/eip/7773" className="text-primary hover:text-primary/80 underline">
                  Glamsterdam
                </Link>
                . This upgrade will introduce key changes to both the{' '}
                <a
                  href="https://www.youtube.com/watch?v=nJ57mkttCH0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Execution and Consensus layers
                </a>{' '}
                on mainnet. The name combines{' '}
                <span className="font-semibold text-foreground">Amsterdam</span> (execution layer, from the previous Devconnect location) and{' '}
                <span className="font-semibold text-foreground">Gloas</span> (consensus layer, named after a star), highlighting its focus on both core protocol areas. The headliner feature for Glamsterdam is still being decided, with several{' '}
                <a
                  href="https://github.com/ethereum/EIPs/pulls?q=is%3Apr+is%3Aopen+milestone%3A%22Glamsterdam%22"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  Ethereum Improvement Proposals (EIPs)
                </a>{' '}
                under review and active community discussions ongoing.
              </p>
            )}
          </motion.div>

          {isDashboardUpgrade && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-cyan-500/8 to-emerald-500/8 p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Upgrade Dashboard
                  </p>
                  <h3 className="dec-title text-2xl font-semibold tracking-tight text-foreground">{upgrade.name}</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
                    <p><span className="font-semibold text-foreground">{upgradeBreakdown?.totalEips ?? 0}</span> EIPs</p>
                    <p><span className="font-semibold text-foreground">{upgradeBreakdown?.inReview ?? 0}</span> in Review</p>
                    <p><span className="font-semibold text-foreground">{upgradeBreakdown?.blocked ?? 0}</span> blocked</p>
                    <p><span className="font-semibold text-foreground">{upgradeBreakdown?.readyForLastCall ?? 0}</span> ready for Last Call</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Protocol readiness snapshot for core teams and operators
                </p>
              </div>

              <div className="space-y-5">
                {dashboardSections.map((section) => {
                  const expanded =
                    section.key === 'review'
                      ? expandedDashboardBuckets.review
                      : section.key === 'blocked'
                        ? expandedDashboardBuckets.blocked
                        : expandedDashboardBuckets.ready;
                  const visibleItems = expanded ? section.items : section.items.slice(0, 6);

                  return (
                    <div key={section.key} className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <h4 className={cn('text-sm font-semibold', section.accent)}>{section.label}</h4>
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-semibold text-foreground">
                          {section.items.length}
                        </span>
                        <div className={cn('h-px flex-1 border-t', section.line)} />
                      </div>

                      {section.items.length === 0 ? (
                        <p className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                          No EIPs in this bucket right now.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleItems.map((item) => (
                              <Link key={`${section.key}-${item.eip_number}`} href={`/eip/${item.eip_number}`}>
                                <motion.div
                                  whileHover={{ y: -2 }}
                                  transition={{ duration: 0.18 }}
                                  className={cn('rounded-lg border bg-background/70 p-3 transition-colors hover:border-primary/40', section.card)}
                                >
                                  <div className="mb-2 flex items-center gap-1.5">
                                    <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-bold', section.accent, 'bg-muted/60')}>
                                      EIP-{item.eip_number}
                                    </span>
                                    {item.status && (
                                      <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', statusChipClass(item.status))}>
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                                  <p className={cn('mt-1 text-xs', section.accent)}>{section.helper}</p>
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                          {section.items.length > 6 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (section.key === 'review') {
                                  setExpandedDashboardBuckets((prev) => ({ ...prev, review: !prev.review }));
                                } else if (section.key === 'blocked') {
                                  setExpandedDashboardBuckets((prev) => ({ ...prev, blocked: !prev.blocked }));
                                } else {
                                  setExpandedDashboardBuckets((prev) => ({ ...prev, ready: !prev.ready }));
                                }
                              }}
                              className="rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
                            >
                              {expanded ? 'Show less' : `Show more (${section.items.length - 6})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Timeline Chart Section */}
          {timelineData.length > 0 && (
            <motion.div
              id="timeline-chart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className=""
            >
              <UpgradeTimelineChart data={timelineData} upgradeName={upgrade.name} />
            </motion.div>
          )}

          {/* EIPs Showcase Section */}
          <motion.div
            id="eips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-xl border border-border bg-card/60 p-4 sm:p-5"
          >
            <UpgradeEIPsShowcase
              upgradeName={upgrade.name}
              composition={composition}
              upgradeColor="#06B6D4"
              heading={isPectra ? 'Prague/Electra (Pectra) EIPs' : undefined}
            />
          </motion.div>

          {/* Blog Carousel Section */}
          {blogPosts.length > 0 && (
            <motion.div
              id="related-articles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className=""
            >
              <UpgradeBlogCarousel posts={blogPosts} upgradeName={upgrade.name} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
