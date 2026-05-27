'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  TrendingUp,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Github,
  Activity,
  Package,
  Copy,
  Check,
  FileCode,
  ChevronRight,
  RefreshCw,
  Newspaper,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProposalSubscriptionCard } from '@/components/proposal-subscription-card';
import { RepositorySubscriptionCard } from '@/components/repository-subscription-card';
import { rawData, pairedUpgradeNames } from '@/data/network-upgrades';

// Status color mapping for timeline - richer colors
const statusColors: Record<string, { 
  bg: string; 
  bgGradient: string;
  text: string; 
  border: string; 
  leftBorder: string;
  dot: string;
  dotGlow: string;
  cardBg: string;
}> = {
  'Draft': { 
    bg: 'bg-cyan-500/10', 
    bgGradient: 'bg-gradient-to-br from-cyan-500/15 via-cyan-500/8 to-transparent',
    text: 'text-cyan-700 dark:text-cyan-200', 
    border: 'border-cyan-400/40', 
    leftBorder: 'border-l-cyan-500 dark:border-l-cyan-400',
    dot: 'bg-cyan-500',
    dotGlow: 'shadow-cyan-500/50',
    cardBg: 'bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/20 dark:via-cyan-500/10 dark:to-cyan-500/5'
  },
  'Review': { 
    bg: 'bg-blue-500/10', 
    bgGradient: 'bg-gradient-to-br from-blue-500/15 via-blue-500/8 to-transparent',
    text: 'text-blue-700 dark:text-blue-200', 
    border: 'border-blue-400/40', 
    leftBorder: 'border-l-blue-500 dark:border-l-blue-400',
    dot: 'bg-blue-500',
    dotGlow: 'shadow-blue-500/50',
    cardBg: 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5'
  },
  'Last Call': { 
    bg: 'bg-amber-500/10', 
    bgGradient: 'bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-transparent',
    text: 'text-amber-700 dark:text-amber-200', 
    border: 'border-amber-400/40', 
    leftBorder: 'border-l-amber-500 dark:border-l-amber-400',
    dot: 'bg-amber-500',
    dotGlow: 'shadow-amber-500/50',
    cardBg: 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5'
  },
  'Final': { 
    bg: 'bg-emerald-500/10', 
    bgGradient: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent',
    text: 'text-emerald-700 dark:text-emerald-200', 
    border: 'border-emerald-400/40', 
    leftBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    dot: 'bg-emerald-500',
    dotGlow: 'shadow-emerald-500/50',
    cardBg: 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5'
  },
  'Stagnant': { 
    bg: 'bg-slate-500/10', 
    bgGradient: 'bg-gradient-to-br from-slate-500/15 via-slate-500/8 to-transparent',
    text: 'text-slate-700 dark:text-slate-300', 
    border: 'border-slate-400/30', 
    leftBorder: 'border-l-slate-500 dark:border-l-slate-400',
    dot: 'bg-slate-500',
    dotGlow: 'shadow-slate-500/30',
    cardBg: 'bg-gradient-to-br from-slate-500/15 via-slate-500/8 to-slate-500/5'
  },
  'Withdrawn': { 
    bg: 'bg-red-500/10', 
    bgGradient: 'bg-gradient-to-br from-red-500/15 via-red-500/8 to-transparent',
    text: 'text-red-700 dark:text-red-200', 
    border: 'border-red-400/40', 
    leftBorder: 'border-l-red-500 dark:border-l-red-400',
    dot: 'bg-red-500',
    dotGlow: 'shadow-red-500/50',
    cardBg: 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-500/5'
  },
};

interface ProposalData {
  repo: string;
  number: number;
  title: string;
  authors: string[];
  created: string | null;
  type: string | null;
  category: string | null;
  status: string;
  last_call_deadline: string | null;
  discussions_to: string | null;
  requires: number[];
}

interface StatusEvent {
  from: string | null;
  to: string;
  changed_at: string;
  commit_sha?: string;
}

interface GovernanceState {
  current_pr_state: string | null;
  waiting_on: string | null;
  days_since_last_action: number | null;
  review_velocity: number | null;
}

interface UpgradeInclusion {
  upgrade_id: number;
  name: string;
  slug: string;
  bucket: string;
  commit_date: string | null;
}

interface ResourceArticle {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string;
}

interface ResourceVideo {
  title: string;
  url: string;
  description: string;
}

interface AiResourceRecommendation {
  kind: 'text' | 'audio' | 'video' | 'discussion';
  label: string;
  url: string;
  reason: string;
}

interface LiveSearchResult {
  title: string;
  url: string;
  snippet: string;
}

function getHistoricalUpgradeSlug(name: string, date: string): string {
  const pairedName = pairedUpgradeNames[date];
  if (pairedName === 'Shapella') return 'shanghai';
  if (pairedName === 'Dencun') return 'cancun';
  if (pairedName === 'Pectra') return 'pectra';
  if (pairedName === 'Fusaka') return 'fusaka';

  const directMap: Record<string, string> = {
    'frontier thawing': 'frontier-thawing',
    frontier: 'frontier',
    homestead: 'homestead',
    'dao fork': 'dao-fork',
    'tangerine whistle': 'tangerine-whistle',
    'spurious dragon': 'spurious-dragon',
    byzantium: 'byzantium',
    constantinople: 'constantinople',
    petersburg: 'petersburg',
    istanbul: 'istanbul',
    'muir glacier': 'muir-glacier',
    berlin: 'berlin',
    london: 'london',
    altair: 'altair',
    'arrow glacier': 'arrow-glacier',
    'gray glacier': 'gray-glacier',
    bellatrix: 'bellatrix',
    paris: 'paris',
    shanghai: 'shanghai',
    capella: 'capella',
    cancun: 'cancun',
    deneb: 'deneb',
    prague: 'pectra',
    electra: 'pectra',
    osaka: 'fusaka',
    fulu: 'fusaka',
  };

  return directMap[name.toLowerCase()] ?? name.toLowerCase().replace(/\s+/g, '-');
}

function getHistoricalIncludedUpgrades(eipNumber: number): UpgradeInclusion[] {
  const normalized = String(eipNumber);
  const mergeTimestamp = new Date('2022-09-15').getTime();
  const entries = new Map<string, UpgradeInclusion>();

  rawData.forEach((item) => {
    const includesEip = item.eips.some((value) => value.replace('EIP-', '').replace('-removed', '') === normalized);
    if (!includesEip) return;

    const itemTime = new Date(item.date).getTime();
    const displayName =
      itemTime > mergeTimestamp && pairedUpgradeNames[item.date]
        ? pairedUpgradeNames[item.date]
        : item.upgrade;
    const slug = getHistoricalUpgradeSlug(displayName, item.date);
    const key = `${item.date}:${slug}`;

    if (!entries.has(key)) {
      entries.set(key, {
        upgrade_id: -(entries.size + 1),
        name: displayName,
        slug,
        bucket: 'included',
        commit_date: new Date(item.date).toISOString(),
      });
    }
  });

  return Array.from(entries.values());
}

type ProposalRepo = 'eip' | 'erc' | 'rip';

function formatInclusionBucket(bucket: string | null): string {
  if (!bucket) return 'Unknown';
  const normalized = bucket.toLowerCase();
  const labels: Record<string, string> = {
    included: 'Included',
    scheduled: 'SFI',
    considered: 'CFI',
    declined: 'DFI',
    proposed: 'PFI',
  };
  return labels[normalized] || bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

function getBucketBadgeClass(bucket: string | null): string {
  const normalized = bucket?.toLowerCase();
  if (normalized === 'included') return 'border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
  if (normalized === 'scheduled') return 'border-cyan-500/25 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
  if (normalized === 'considered') return 'border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300';
  if (normalized === 'declined') return 'border-red-500/25 bg-red-500/12 text-red-700 dark:text-red-300';
  if (normalized === 'proposed') return 'border-blue-500/25 bg-blue-500/12 text-blue-700 dark:text-blue-300';
  return 'border-border bg-muted/60 text-muted-foreground';
}

// Helper to format waiting_on state
function formatWaitingOn(state: string | null): string {
  if (!state) return '';
  return state
    .replace(/WAITING_ON_/g, 'Waiting on ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to calculate duration between events
function calculateDuration(prevDate: string | null, currentDate: string): string | null {
  if (!prevDate) return null;
  const prev = new Date(prevDate);
  const curr = new Date(currentDate);
  const days = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return null;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// Helper to get author initials
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Helper to get GitHub avatar URL
function getGitHubAvatar(name: string): string | undefined {
  if (!name || !name.trim()) return undefined;
  
  // Pattern 1: Extract from parentheses like "Name (@username)"
  const parenMatch = name.match(/\(@([\w-]+)\)/i);
  if (parenMatch) {
    return `https://github.com/${parenMatch[1]}.png`;
  }
  
  // Pattern 2: Extract from URL like "github.com/username"
  const urlMatch = name.match(/github\.com\/([\w-]+)/i);
  if (urlMatch) {
    return `https://github.com/${urlMatch[1]}.png`;
  }
  
  // Pattern 3: Extract from email domain (if it's a GitHub email)
  const emailMatch = name.match(/([\w-]+)@users\.noreply\.github\.com/i);
  if (emailMatch) {
    return `https://github.com/${emailMatch[1]}.png`;
  }
  
  // Pattern 4: If name looks like a GitHub username (no spaces, alphanumeric + hyphens)
  const cleanName = name.trim();
  if (/^[\w-]+$/.test(cleanName) && cleanName.length > 0 && cleanName.length < 40) {
    // Could be a username, but don't assume - return undefined to use fallback
    // This prevents false positives
    return undefined;
  }
  
  // If we can't determine, return undefined to show fallback
  return undefined;
}

export default function ProposalDetailPage() {
  const params = useParams();
  const repo = params.repo as string;
  const number = parseInt(params.number as string, 10);

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([]);
  const [governanceState, setGovernanceState] = useState<GovernanceState | null>(null);
  const [upgrades, setUpgrades] = useState<UpgradeInclusion[]>([]);
  const [resourceArticles, setResourceArticles] = useState<ResourceArticle[]>([]);
  const [resourceVideos, setResourceVideos] = useState<ResourceVideo[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AiResourceRecommendation[]>([]);
  const [webSuggestions, setWebSuggestions] = useState<LiveSearchResult[]>([]);
  const [videoSuggestions, setVideoSuggestions] = useState<LiveSearchResult[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [discussionsTo, setDiscussionsTo] = useState<string | null>(null);
  const [proposalRequires, setProposalRequires] = useState<number[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

  // Normalize repo name
  const normalizedRepo = repo.toLowerCase().replace(/s$/, '');
  const proposalRepo = normalizedRepo as ProposalRepo;
  const repoDisplayName = normalizedRepo === 'eip' ? 'EIP' : normalizedRepo === 'erc' ? 'ERC' : 'RIP';
  const repoPath = normalizedRepo === 'eip' ? 'EIPs' : normalizedRepo === 'erc' ? 'ERCs' : 'RIPs';
  const filePath = normalizedRepo === 'eip' ? 'EIPS' : normalizedRepo === 'erc' ? 'ERCS' : 'RIPS';
  const fileName = `${normalizedRepo}-${number}.md`;
  const latestUpgrade = upgrades.find((upgrade) => upgrade.bucket.toLowerCase() === 'included') ?? upgrades[0] ?? null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [proposalData, statusData, governanceData, upgradesData] = await Promise.all([
          client.proposals.getProposal({ repo: proposalRepo, number }),
          client.proposals.getStatusEvents({ repo: proposalRepo, number }),
          client.proposals.getGovernanceState({ repo: proposalRepo, number }),
          client.proposals.getUpgrades({ repo: proposalRepo, number }),
        ]);

        setProposal(proposalData);
        setStatusEvents(statusData);
        setGovernanceState(governanceData);
        const historical = getHistoricalIncludedUpgrades(number);
        const mergedBySlug = new Map<string, UpgradeInclusion>();
        upgradesData.forEach((entry) => mergedBySlug.set(entry.slug || entry.name.toLowerCase(), entry));
        historical.forEach((entry) => {
          const key = entry.slug || entry.name.toLowerCase();
          if (!mergedBySlug.has(key)) {
            mergedBySlug.set(key, entry);
          }
        });

        const mergedUpgrades = Array.from(mergedBySlug.values()).sort((a, b) => {
          const aTime = a.commit_date ? new Date(a.commit_date).getTime() : 0;
          const bTime = b.commit_date ? new Date(b.commit_date).getTime() : 0;
          return bTime - aTime;
        });

        setUpgrades(mergedUpgrades);
      } catch (err: unknown) {
        console.error('Failed to fetch proposal data:', err);
        const message = err instanceof Error ? err.message : 'Failed to load proposal';
        setError(message);
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === 'NOT_FOUND'
        ) {
          setError('Proposal not found');
        }
      } finally {
        setLoading(false);
      }
    };

    if (number && normalizedRepo) {
      fetchData();
    }
  }, [number, normalizedRepo, proposalRepo]);

  // Fetch markdown content lazily via getContent (includes discussions_to, requires from frontmatter)
  useEffect(() => {
    if (!proposal || markdownContent !== null) return;

    const fetchContent = async () => {
      try {
        setMarkdownLoading(true);
        setMarkdownError(null);

        const data = await client.proposals.getContent({
          repo: proposalRepo,
          number,
        });

        setMarkdownContent(data.content);
        setDiscussionsTo(data.discussions_to ?? null);
        setProposalRequires(data.requires ?? []);
      } catch (err: unknown) {
        console.error('Failed to fetch proposal content:', err);
        setMarkdownError('Failed to load proposal content');
      } finally {
        setMarkdownLoading(false);
      }
    };

    fetchContent();
  }, [proposal, proposalRepo, number, markdownContent]);

  useEffect(() => {
    if (!proposal?.title) return;

    let cancelled = false;
    const fetchResources = async () => {
      try {
        setResourceLoading(true);
        const res = await fetch('/api/proposal-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number,
            title: proposal.title,
          }),
        });

        const data = await res.json();
        if (cancelled) return;

        setResourceArticles(Array.isArray(data.articles) ? data.articles : []);
        setResourceVideos(Array.isArray(data.videos) ? data.videos : []);
        setAiRecommendations(Array.isArray(data.aiRecommendations) ? data.aiRecommendations : []);
        setWebSuggestions(Array.isArray(data.webSuggestions) ? data.webSuggestions : []);
        setVideoSuggestions(Array.isArray(data.videoSuggestions) ? data.videoSuggestions : []);
      } catch {
        if (cancelled) return;
        setResourceArticles([]);
        setResourceVideos([]);
        setAiRecommendations([]);
        setWebSuggestions([]);
        setVideoSuggestions([]);
      } finally {
        if (!cancelled) setResourceLoading(false);
      }
    };

    fetchResources();
    return () => { cancelled = true; };
  }, [number, proposal?.title]);

  // Fetch AI summary when markdown content is available
  useEffect(() => {
    if (!markdownContent || !number || normalizedRepo !== 'eip') return;

    let cancelled = false;
    setAiSummaryLoading(true);
    setAiSummaryError(null);

    fetch('/api/eip-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eipNo: number, content: markdownContent }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setAiSummary(data.summary);
        } else {
          setAiSummaryError(data.error || 'Failed to generate summary');
        }
      })
      .catch(() => {
        if (!cancelled) setAiSummaryError('Failed to generate summary');
      })
      .finally(() => {
        if (!cancelled) setAiSummaryLoading(false);
      });

    return () => { cancelled = true; };
  }, [markdownContent, number, normalizedRepo]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setMarkdownCopied(true);
      setTimeout(() => setMarkdownCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 dark:border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="dec-title mb-2 text-xl font-semibold tracking-tight text-foreground">Failed to load proposal</h2>
          <p className="text-muted-foreground">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const proposalId = `${repoDisplayName}-${proposal.number}`;
  const githubUrl = `https://github.com/ethereum/${repoPath}/blob/master/${filePath}/${fileName}`;

  // Determine urgency color for governance signals
  const getUrgencyColor = (days: number | null) => {
    if (!days) return 'text-muted-foreground';
    if (days > 60) return 'text-red-600 dark:text-red-400';
    if (days > 30) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-300';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full border-b border-border bg-card/40">
        <div className="mx-auto w-full px-3 pb-6 pt-10 sm:px-4 sm:pb-8 sm:pt-12 lg:px-5 xl:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Repo badge and copy link */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {repoDisplayName}
                  </span>
                  <Link
                    href={`/timeline?repo=${normalizedRepo}s&number=${proposal.number}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Timeline
                  </Link>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleCopyLink}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card/70 transition-colors hover:border-primary/40 hover:bg-primary/10"
                        >
                          {linkCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Copy link to this proposal</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Title */}
                <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {proposalId}: {proposal.title}
                </h1>

                {/* Description */}
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Reference view for specification metadata, lifecycle transitions, governance signals, and linked upgrade context.
                </p>

                {/* Authors as Avatars */}
                {proposal.authors.length > 0 && (
                <div className="mt-6 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authors</p>
                    <div className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:grayscale-0">
                      <TooltipProvider>
                        {proposal.authors.map((author, index) => (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div className="cursor-pointer">
                                <Avatar className="h-10 w-10 border-2 border-cyan-400/20 hover:border-cyan-400/40 transition-all hover:scale-110">
                                  <AvatarImage 
                                    src={getGitHubAvatar(author) || undefined} 
                                    alt={author}
                                    onError={(e) => {
                                      // Hide image on error, show fallback
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                    {getInitials(author)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{author}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                )}
                
                {/* AI Summary toggle (collapsible inline) */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAi(s => !s)}
                    className="text-sm font-medium text-primary hover:underline focus:outline-none"
                  >
                    {showAi ? 'Hide AI summary' : 'Show AI summary'}
                  </button>
                  {showAi && (
                    <div className="mt-2 text-sm text-foreground/90">
                      {aiSummaryLoading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span>Generating summary...</span>
                        </div>
                      ) : aiSummaryError ? (
                        <div className="text-sm text-muted-foreground">{aiSummaryError}</div>
                      ) : aiSummary ? (
                        <div
                          className="max-w-none text-sm [&_h4]:text-foreground [&_p]:text-foreground/90 [&_strong]:text-foreground"
                          dangerouslySetInnerHTML={{ __html: aiSummary }}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">AI summary will appear here.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>

        <div className="mx-auto mt-6 w-full px-3 pb-10 sm:px-4 lg:px-5 xl:px-6">
          <div className="space-y-4">
          {/* 2. Preamble Table (RFC-style, flat, authoritative) */}
          <div id="preamble" className="scroll-mt-28">
            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-border/70">
                  <tr>
                    <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">EIP</td>
                    <td className="px-6 py-4 font-mono text-sm text-foreground">{proposalId}</td>
                  </tr>
                  <tr>
                    <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</td>
                    <td className="px-6 py-4 text-sm text-foreground">{proposal.title}</td>
                  </tr>
                  <tr>
                    <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</td>
                    <td className="px-6 py-4 text-sm text-foreground">{proposal.status}</td>
                  </tr>
                  {proposal.type && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.type}</td>
                    </tr>
                  )}
                  {proposal.category && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.category}</td>
                    </tr>
                  )}
                  {proposal.authors.length > 0 && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Author</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.authors.join(', ')}</td>
                    </tr>
                  )}
                  {proposal.created && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</td>
                      <td className="px-6 py-4 text-sm text-foreground">{proposal.created}</td>
                    </tr>
                  )}
                  {proposalRequires.length > 0 && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requires</td>
                      <td className="px-6 py-4 font-mono text-sm text-foreground">
                        {proposalRequires.map(r => `${repoDisplayName}-${r}`).join(', ')}
                      </td>
                    </tr>
                  )}
                  {(proposal.discussions_to || discussionsTo) && (
                    <tr>
                      <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discussions-To</td>
                      <td className="px-6 py-4 text-sm">
                        <a 
                          href={proposal.discussions_to || discussionsTo || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="break-all text-primary transition-colors hover:text-primary/80"
                        >
                          {proposal.discussions_to || discussionsTo}
                        </a>
                      </td>
                    </tr>
                  )}
                  {/* Inclusion Status and Network Upgrade - show if upgrades exist */}
                  {upgrades.length > 0 && (
                    <>
                      <tr>
                        <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inclusion Status</td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', getBucketBadgeClass(latestUpgrade?.bucket || null))}>
                              {formatInclusionBucket(latestUpgrade?.bucket || null)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-40 bg-muted/50 px-6 py-4 align-top text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Network Upgrade</td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            {upgrades.map((upgrade) => (
                              <Link
                                key={upgrade.upgrade_id}
                                href={upgrade.slug ? `/upgrade/${upgrade.slug}` : '#'}
                                className="inline-flex rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-primary hover:border-primary/40 hover:underline"
                              >
                                {upgrade.name || `Upgrade ${upgrade.upgrade_id}`}
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Lifecycle Timeline */}
          {statusEvents.length > 0 && (
            <motion.div
              id="lifecycle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-6"
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle Timeline</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/timeline?repo=${normalizedRepo}s&number=${proposal.number}`}>
                    <Button variant="outline" size="sm" className="h-8 border-border bg-muted/50 text-xs text-foreground hover:bg-muted">
                      Show Full Timeline
                    </Button>
                  </Link>
                  {proposal.status && (
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      statusColors[proposal.status]?.bg || 'bg-slate-500/20',
                      statusColors[proposal.status]?.text || 'text-slate-300',
                      statusColors[proposal.status]?.border || 'border-slate-400/30'
                    )}>
                      {proposal.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative overflow-x-auto pb-2">
                <div className="absolute left-6 right-6 top-3 h-px bg-border/80" />
                <div className="relative flex min-w-max items-start gap-4 pr-4">
                  {statusEvents.map((event, index) => {
                    const prevEvent = index > 0 ? statusEvents[index - 1] : null;
                    const duration = calculateDuration(prevEvent?.changed_at || null, event.changed_at);
                    const eventColor = statusColors[event.to] || statusColors.Draft;
                    const commitUrl = event.commit_sha && event.commit_sha.trim() !== ''
                      ? `https://github.com/ethereum/${repoPath}/commit/${event.commit_sha}`
                      : null;
                    const isLatest = index === statusEvents.length - 1;

                    return (
                      <div key={`${event.changed_at}-${event.to}-${index}`} className="w-[280px] shrink-0">
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full ring-2 ring-background",
                              eventColor.dot,
                              isLatest && "shadow-md shadow-primary/30"
                            )}
                          />
                          {index < statusEvents.length - 1 && (
                            <div className="h-px flex-1 bg-border/70" />
                          )}
                        </div>

                        <div className={cn("rounded-lg border border-border/70 bg-muted/30 p-4", isLatest && "border-primary/30 bg-primary/5")}>
                          <div className="flex items-center gap-2">
                            {event.from && (
                              <>
                                <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusColors[event.from]?.bg || "bg-muted", statusColors[event.from]?.text || "text-foreground")}>
                                  {event.from}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </>
                            )}
                            <span className={cn("rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", eventColor.bg, eventColor.text, eventColor.border)}>
                              {event.to}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(event.changed_at).toLocaleString()}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {duration && prevEvent && <span>{duration} in {prevEvent.to}</span>}
                            {event.commit_sha && <span className="font-mono">{event.commit_sha.slice(0, 8)}</span>}
                            {commitUrl && (
                              <a
                                href={commitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                              >
                                <Github className="h-3.5 w-3.5" />
                                View commit
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          <ProposalSubscriptionCard
            repo={normalizedRepo as 'eip' | 'erc' | 'rip'}
            number={number}
            currentStatus={proposal.status}
          />

          <RepositorySubscriptionCard
            repo={normalizedRepo as 'eip' | 'erc' | 'rip'}
          />

          {/* 4. Governance Signals */}
          <div className="space-y-8">
            {/* Governance Signals */}
            {governanceState && (governanceState.waiting_on || governanceState.days_since_last_action !== null) && (
              <motion.div
                id="governance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Governance Signals</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {governanceState.waiting_on && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Waiting On</p>
                      {(() => {
                        const waitingStr = formatWaitingOn(governanceState.waiting_on);
                        const isClosed = /closed/i.test(waitingStr);
                        const valueClass = isClosed ? 'text-sm font-semibold text-slate-700 dark:text-slate-300' : 'text-sm font-semibold text-emerald-700 dark:text-emerald-300';
                        return <p className={valueClass}>{waitingStr}</p>;
                      })()}
                    </div>
                  )}
                  {governanceState.days_since_last_action !== null && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Days Since Last Action</p>
                      <p className={cn("text-sm font-semibold", getUrgencyColor(governanceState.days_since_last_action))}>
                        {governanceState.days_since_last_action} day{governanceState.days_since_last_action !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 5. Upgrade Participation */}
          {upgrades.length > 0 && (
            <motion.div
              id="upgrades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network Upgrades</h3>
              </div>
              <div className="space-y-3">
                {upgrades.map((upgrade, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex cursor-help items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {upgrade.name}
                              </p>
                              <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', getBucketBadgeClass(upgrade.bucket))}>
                                {formatInclusionBucket(upgrade.bucket)}
                              </span>
                            </div>
                            {upgrade.commit_date && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {new Date(upgrade.commit_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          <Link href={upgrade.slug ? `/upgrade/${upgrade.slug}` : '#'}>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                              View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Source: {proposalId}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </motion.div>
          )}

          {/* 6. Proposal Body */}
          <motion.div
            id="proposal-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="scroll-mt-28 flex flex-col overflow-hidden"
          >
                {markdownContent && (
                  <div className="mb-4 flex items-center justify-end">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyMarkdown}
                            className="border-border bg-muted/50 text-foreground hover:bg-muted"
                          >
                            {markdownCopied ? (
                              <>
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <FileCode className="mr-1.5 h-3.5 w-3.5" />
                                Copy as Markdown
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Copy proposal markdown to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {markdownLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  </div>
                ) : markdownError ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="mb-4 text-sm text-muted-foreground">{markdownError}</p>
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                    >
                      View on GitHub instead <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : markdownContent ? (
                  <MarkdownRenderer
                    content={markdownContent}
                    skipPreamble={true}
                    stripDuplicateHeaders={true}
                    collapsibleSections={true}
                  />
                ) : null}
          </motion.div>

          <motion.section
            id="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="scroll-mt-28 rounded-xl border border-border bg-card/60 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</h3>
              <Link
                href={`/resources?q=${encodeURIComponent(`EIP-${proposal.number}`)}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open Resources Hub
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Web Suggestions
                </p>
                {webSuggestions.slice(0, 6).map((item, idx) => (
                  <a
                    key={`${item.url}-${idx}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-md border border-border bg-background/60 p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                      {item.title}
                    </div>
                    {item.snippet && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.snippet}</p>}
                  </a>
                ))}
                {!resourceLoading && webSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No live web suggestions found right now.</p>
                )}
                {aiRecommendations.slice(0, 2).map((item, idx) => (
                  <a
                    key={`${item.url}-ai-${idx}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-dashed border-border bg-background/40 p-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    AI fallback: {item.label}
                  </a>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Newspaper className="h-3.5 w-3.5" />
                  Latest Articles
                </p>
                {resourceArticles.slice(0, 6).map((article, idx) => (
                  <a
                    key={`${article.url}-${idx}`}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-border bg-background/60 p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{article.title}</p>
                    {article.publishedAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </a>
                ))}
                {!resourceLoading && resourceArticles.length === 0 && (
                  <p className="text-xs text-muted-foreground">We don&apos;t have relevant articles for this proposal yet.</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Video & Audio</p>
                {videoSuggestions.slice(0, 4).map((video, idx) => (
                  <a
                    key={`${video.url}-search-${idx}`}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    {video.title}
                  </a>
                ))}
                {resourceVideos.slice(0, 3).map((video, idx) => (
                  <a
                    key={`${video.url}-${idx}`}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    {video.title}
                  </a>
                ))}
                {!resourceLoading && videoSuggestions.length === 0 && resourceVideos.length === 0 && (
                  <p className="text-xs text-muted-foreground">No relevant video links found yet.</p>
                )}
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`EIP-${proposal.number} podcast`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  Explore more podcasts
                </a>
                <a
                  href={`https://ethereum-magicians.org/search?q=${encodeURIComponent(`EIP-${proposal.number}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  Open Magicians threads
                </a>
              </div>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="border-t border-border/70 pt-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="h-4 w-4 text-muted-foreground" />
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  View on GitHub
                </a>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </motion.div>
          </div>
        </div>
    </div>
  );
}
