'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ExternalLink,
  AlertCircle,
  Github,
  Copy,
  Check,
  FileCode,
  RefreshCw,
  Newspaper,
  Sparkles,
  BookOpen,
  Building2,
  MessageSquare,
  Users,
  ListTree,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowUpRight,
  Video,
  Calendar,
  GitFork,
  Link2,
  Clock,
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
import { normalizeUpgradeBucket } from '@/lib/upgrade-stages';
import { UpgradeStageSplitBadge } from '@/components/upgrade/stage-badge';
import { EnterpriseEIPBrief, type EipCuration } from '@/components/enterprise-eip-brief';
import { ProposalTimeline } from '@/components/proposal-timeline';
import { BrandLoader } from '@/components/brand-loader';
import { LucidProposalSection } from '@/components/lucid-proposal-section';


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

interface StageEvent {
  upgrade_id: number | null;
  upgrade: string;
  slug: string;
  bucket: string;
  commit_sha: string | null;
  commit_date: string | null;
}

interface GovernanceState {
  pr_number: number | null;
  pr_url: string | null;
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
  layer?: string | null;
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

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadingsFromMarkdown(markdown: string): HeadingItem[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const headings: HeadingItem[] = [];
  const seenIds = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    let text = match[2].trim();
    const customIdMatch = text.match(/^(.*?)\s*\{#([a-zA-Z0-9_-]+)\}\s*$/);
    let id = '';
    if (customIdMatch) {
      text = customIdMatch[1].trim();
      id = customIdMatch[2].trim();
    } else {
      id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const lowerText = text.toLowerCase();
    if (
      lowerText.startsWith('eip-') ||
      lowerText.startsWith('erc-') ||
      lowerText.startsWith('rip-')
    ) {
      continue;
    }

    headings.push({ id, text, level });
  }

  return headings;
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
        layer: item.layer || null,
      });
    }
  });

  return Array.from(entries.values());
}

type ProposalRepo = 'eip' | 'erc' | 'rip';

// =============================================================================
// Helper functions
// =============================================================================

// Higher = more "active"/advanced. When an EIP sits in several upgrades (e.g.
// declined in one, then re-proposed in a newer one), the headline inclusion
// status should surface the live stage, not the dead-end DFI. Per-upgrade stages
// are still listed separately so the DFI history is preserved.
function bucketRank(bucket: string | null): number {
  switch (normalizeUpgradeBucket(bucket)) {
    case 'included':
      return 5;
    case 'scheduled':
      return 4;
    case 'considered':
      return 3;
    case 'proposed':
      return 2;
    case 'declined':
      return 1;
    default:
      return 0;
  }
}

function getStatusBadgeClass(status: string | null): string {
  if (!status) return 'border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-300';
  const norm = status.toLowerCase();
  if (norm === 'draft') return 'border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-300';
  if (norm === 'review') return 'border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300';
  if (norm === 'last call') return 'border-orange-500/25 bg-orange-500/12 text-orange-700 dark:text-orange-300';
  if (norm === 'final') return 'border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
  if (norm === 'living') return 'border-cyan-500/25 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
  if (norm === 'stagnant') return 'border-gray-500/25 bg-gray-500/12 text-gray-700 dark:text-gray-400';
  if (norm === 'withdrawn') return 'border-red-500/25 bg-red-500/12 text-red-700 dark:text-red-300';
  return 'border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-300';
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
  const [stageEvents, setStageEvents] = useState<StageEvent[]>([]);
  const [governanceState, setGovernanceState] = useState<GovernanceState | null>(null);
  const [curation, setCuration] = useState<EipCuration | null>(null);
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
  const [aiSummaryReload, setAiSummaryReload] = useState(0);
  const [showAi, setShowAi] = useState(false);
  const [showFullSpecification, setShowFullSpecification] = useState(false);
  // Enterprise view is URL-driven (?enterprise=1) so the exact view is shareable,
  // and remembered in localStorage so a user who prefers it keeps it across EIPs.
  const ENTERPRISE_STORAGE_KEY = 'eip-enterprise-view';
  const searchParams = useSearchParams();
  const [showEnterpriseView, setShowEnterpriseView] = useState(() => {
    if (searchParams.get('enterprise') === '1') return true;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(ENTERPRISE_STORAGE_KEY) === '1';
      } catch {
        return false;
      }
    }
    return false;
  });

  const setEnterprise = React.useCallback((next: boolean) => {
    setShowEnterpriseView(next);
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (next) p.set('enterprise', '1');
      else p.delete('enterprise');
      const qs = p.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
      try {
        localStorage.setItem(ENTERPRISE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Normalize repo name
  const normalizedRepo = repo.toLowerCase().replace(/s$/, '');
  const proposalRepo = normalizedRepo as ProposalRepo;
  const repoDisplayName = normalizedRepo === 'eip' ? 'EIP' : normalizedRepo === 'erc' ? 'ERC' : 'RIP';
  const repoPath = normalizedRepo === 'eip' ? 'EIPs' : normalizedRepo === 'erc' ? 'ERCs' : 'RIPs';
  const filePath = normalizedRepo === 'eip' ? 'EIPS' : normalizedRepo === 'erc' ? 'ERCS' : 'RIPS';
  const fileName = `${normalizedRepo}-${number}.md`;
  // The "current" upgrade for headline fields: the most active/advanced stage
  // across all upgrades this EIP appears in (newest as tiebreak), so a DFI in an
  // older fork doesn't mask a live PFI/CFI/SFI in a newer one.
  const latestUpgrade =
    [...upgrades].sort((a, b) => {
      const rankDiff = bucketRank(b.bucket) - bucketRank(a.bucket);
      if (rankDiff !== 0) return rankDiff;
      const at = a.commit_date ? new Date(a.commit_date).getTime() : 0;
      const bt = b.commit_date ? new Date(b.commit_date).getTime() : 0;
      return bt - at;
    })[0] ?? null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [proposalData, statusData, stageData, governanceData, upgradesData, curationData] = await Promise.all([
          client.proposals.getProposal({ repo: proposalRepo, number }),
          client.proposals.getStatusEvents({ repo: proposalRepo, number }),
          // Historical stage journey (PFI → CFI → SFI, declines, re-proposals).
          client.proposals.getStageEvents({ repo: proposalRepo, number }).catch(() => []),
          client.proposals.getGovernanceState({ repo: proposalRepo, number }),
          client.proposals.getUpgrades({ repo: proposalRepo, number }),
          // Curated per-EIP stakeholder impacts (editable in admin) ground the
          // Enterprise view instead of keyword-guessing from the title.
          client.curations.getEipCurations({ eipNumbers: [Number(number)] }).catch(() => []),
        ]);

        setProposal(proposalData);
        setStatusEvents(statusData);
        setStageEvents(stageData);
        setGovernanceState(governanceData);
        setCuration(curationData?.[0] ?? null);
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

  // Fetch AI summary when markdown content is available.
  useEffect(() => {
    if (!markdownContent || !number) return;

    // AbortController (not just a `cancelled` flag) so a superseded run actually
    // cancels its in-flight request. Without this, React StrictMode's double-invoke
    // in dev fired TWO concurrent LLM calls; the second raced the first into the
    // provider's rate limit and 503'd, and its error clobbered the good first result.
    const controller = new AbortController();

    const fetchAiSummary = async () => {
      try {
        setAiSummaryLoading(true);
        setAiSummaryError(null);

        const res = await fetch('/api/eip-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eipNo: number, content: markdownContent, proposalType: repoDisplayName }),
          signal: controller.signal,
        });

        const data = await res.json();

        // Guard against a provider quota/error notice slipping through as a
        // "summary" (the old Cohere trial-key warning did exactly this).
        const summary: string = typeof data.summary === 'string' ? data.summary : '';
        const looksLikeNoise = /trial key|api-keys|rate limit|dashboard\.cohere|upgrade to a production key/i.test(
          summary
        );

        if (res.ok && summary && !looksLikeNoise) {
          setAiSummary(summary);
        } else {
          setAiSummaryError("We couldn't generate a summary right now. Please try again in a moment.");
        }
      } catch (err) {
        // An abort is expected on cleanup — don't surface it as a failure.
        if ((err as Error)?.name !== 'AbortError') {
          setAiSummaryError("We couldn't generate a summary right now. Please try again in a moment.");
        }
      } finally {
        if (!controller.signal.aborted) setAiSummaryLoading(false);
      }
    };

    fetchAiSummary();

    return () => controller.abort();
  }, [markdownContent, number, repoDisplayName, aiSummaryReload]);

  useEffect(() => {
    const handleEnableEnterprise = () => {
      setEnterprise(true);
    };

    window.addEventListener('enable-enterprise', handleEnableEnterprise);
    if (typeof window !== 'undefined' && (window.location.hash === '#enterprise-brief' || window.location.hash === '#enterprise')) {
      setEnterprise(true);
    }

    return () => {
      window.removeEventListener('enable-enterprise', handleEnableEnterprise);
    };
  }, [setEnterprise]);



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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <BrandLoader
          title="Loading Proposal Details"
          description="Fetching EIP specifications, coordination status, and related resources..."
          minHeight="min-h-[300px]"
          className="w-full max-w-lg border border-border/40"
        />
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
  const discussionUrl = proposal.discussions_to || discussionsTo || null;

  return (
    <div className="min-h-screen bg-background">
      <section id="proposal-overview" data-sidebar-label="Overview" className="w-full border-b border-border bg-card/40">
        <div className="mx-auto w-full px-3 pb-6 pt-10 sm:px-4 sm:pb-8 sm:pt-12 lg:px-5 xl:px-6">
            <div className="space-y-3">
                {/* Metadata chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status chip — value only, no "Status:" prefix */}
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                    getStatusBadgeClass(proposal.status)
                  )}>
                    {proposal.status}
                  </span>

                  {/* Type/Category Chip */}
                  {(proposal.type || proposal.category) && (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 text-muted-foreground px-3 py-1 text-xs font-medium">
                      {proposal.type && proposal.category
                        ? `${proposal.type}: ${proposal.category}`
                        : proposal.type || proposal.category}
                    </span>
                  )}

                  {/* Layer Chip — only when we actually know it's EL or CL */}
                  {proposal.category === 'Core' && (latestUpgrade?.layer === 'consensus' || latestUpgrade?.layer === 'execution') && (
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                      latestUpgrade?.layer === 'consensus'
                        ? 'border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300'
                        : 'border-cyan-500/25 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
                    )}>
                      {latestUpgrade?.layer === 'consensus'
                        ? 'Consensus Layer (CL)'
                        : 'Execution Layer (EL)'}
                    </span>
                  )}

                  {/* Network upgrade chips */}
                  {upgrades.length > 0 && upgrades.map((upgrade) => (
                    <UpgradeStageSplitBadge
                      key={upgrade.slug ?? upgrade.name}
                      upgradeName={upgrade.name || `Upgrade ${upgrade.upgrade_id}`}
                      bucket={upgrade.bucket}
                      className="text-xs"
                    />
                  ))}

                  {/* Community / Enterprise view toggle — shareable via ?enterprise=1,
                      remembered in localStorage. */}
                  <div
                    role="radiogroup"
                    aria-label="View mode"
                    className="ml-auto inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 text-xs font-medium"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!showEnterpriseView}
                      onClick={() => setEnterprise(false)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors',
                        !showEnterpriseView
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Community
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={showEnterpriseView}
                      onClick={() => setEnterprise(true)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors',
                        showEnterpriseView
                          ? 'bg-violet-500/15 text-violet-700 shadow-sm dark:text-violet-300'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Enterprise
                    </button>
                  </div>
                </div>

                {/* Title with action icons inline at the end */}
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <h1 className="dec-title persona-title text-pretty text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-[2.5rem] md:leading-[1.1]">
                    {proposalId}: {proposal.title}
                  </h1>
                  <TooltipProvider>
                    <div className="flex items-center gap-2 pb-1">
                      {discussionUrl && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={discussionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open discussion thread"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <MessageSquare className="h-[18px] w-[18px]" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Discussion thread</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View specification on GitHub"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Github className="h-[18px] w-[18px]" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">View on GitHub</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleCopyLink}
                            aria-label="Copy link to this proposal"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                          >
                            {linkCopied ? (
                              <Check className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-[18px] w-[18px]" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{linkCopied ? 'Copied!' : 'Copy link'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>

                {/* Description */}
                <p className="mt-3 max-w-5xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Reference view for specification metadata, lifecycle transitions, governance signals, and linked upgrade context.
                </p>

                {/* Compact Metadata Row */}
                {(proposal.authors.length > 0 || proposal.created || proposalRequires.length > 0) && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                    {/* Authors */}
                    {proposal.authors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">Authors:</span>
                        <div className="flex -space-x-1.5 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background">
                          <TooltipProvider>
                            {proposal.authors.map((author, index) => (
                              <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                  <div className="cursor-pointer">
                                    <Avatar className="h-7 w-7 border border-primary/20 hover:border-primary/50 transition-all hover:scale-110">
                                      <AvatarImage
                                        src={getGitHubAvatar(author) || undefined}
                                        alt={author}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <AvatarFallback className="bg-primary/10 font-semibold text-primary text-[10px]">
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

                    {/* Created Date */}
                    {proposal.created && (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-foreground font-medium shadow-2xs">
                        <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                        <span className="text-muted-foreground font-normal">Created:</span>
                        <span className="text-foreground">
                          {Number.isNaN(Date.parse(proposal.created))
                            ? proposal.created
                            : new Date(proposal.created).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC',
                              }) + ' UTC'}
                        </span>
                      </div>
                    )}

                    {/* Requires Dependencies */}
                    {proposalRequires.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">Requires:</span>
                        {proposalRequires.map((r) => (
                          <Link
                            key={r}
                            href={`/${normalizedRepo}s/${r}`}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:border-primary/60 shadow-2xs"
                          >
                            <Link2 className="h-3 w-3 text-primary/70" />
                            {repoDisplayName}-{r}
                          </Link>
                        ))}
                      </div>
                    )}
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
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-muted-foreground">{aiSummaryError}</span>
                          <button
                            onClick={() => setAiSummaryReload((n) => n + 1)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        </div>
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
      </section>

        <div className="mx-auto mt-6 w-full max-w-6xl px-3 pb-10 sm:px-4 lg:px-5 xl:px-6">
          <div className="space-y-6">
            {/* Enterprise Brief Section — Always rendered so it appears in sidebar */}
            <section id="enterprise-brief" data-sidebar-label="Enterprise Assessment" className="scroll-mt-28">
              {showEnterpriseView ? (
                <EnterpriseEIPBrief
                  proposal={proposal}
                  upgrades={upgrades}
                  statusEvents={statusEvents}
                  governanceState={governanceState}
                  proposalRequires={proposalRequires}
                  curation={curation}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-card/60 p-5 backdrop-blur-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Enterprise Assessment</h3>
                      <p className="text-xs text-muted-foreground">
                        View node client readiness, technical complexity breakdown, and enterprise risk metrics for {repoDisplayName}-{proposal.number}.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setEnterprise(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                  >
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    View Enterprise Brief
                  </Button>
                </div>
              )}
            </section>

            {/* Unified lifecycle, upgrade-stage & PR timeline */}
            <section id="proposal-timeline" data-sidebar-label="Lifecycle & Upgrade Timeline">
              <ProposalTimeline
                proposal={proposal}
                statusEvents={statusEvents}
                stageEvents={stageEvents}
                upgrades={upgrades}
                governanceState={governanceState}
                repoPath={repoPath}
                normalizedRepo={normalizedRepo}
              />
            </section>

            {/* Dedicated Lucid (EIP-8184) Encrypted Mempool Sections */}
            {number === 8184 && <LucidProposalSection />}

            {/* Proposal Body (Single Card, Collapsed by Default) */}
            <section id="proposal-text" data-sidebar-label="Specification" className="scroll-mt-28">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xs shadow-xs"
              >
                {/* Single Collapsible Card Header */}
                <div
                  onClick={() => setShowFullSpecification((s) => !s)}
                  className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground sm:text-base">
                        {repoDisplayName}-{proposal.number} Specification
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {showFullSpecification
                          ? 'Click to collapse specification document'
                          : 'Click to expand full proposal specification'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {markdownContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyMarkdown();
                        }}
                        className="h-8 border-border bg-background/80 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        {markdownCopied ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <FileCode className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                            Copy Markdown
                          </>
                        )}
                      </Button>
                    )}

                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-primary/10"
                    >
                      <span>{showFullSpecification ? 'Collapse' : 'Expand Specification'}</span>
                      {showFullSpecification ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Content Body - Collapsed by Default */}
                {showFullSpecification && (
                  <div className="p-5 sm:p-6 border-t border-border/50">
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
                        collapsibleSections={false}
                      />
                    ) : null}
                  </div>
                )}
              </motion.div>
            </section>

            {/* Resources */}
            <motion.section
              id="resources"
              data-sidebar-label="Resources & Media"
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

              {number === 8184 && (
                <div className="mb-6 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-card/70 to-card/50 p-4">
                  <p className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                    <Sparkles className="h-4 w-4" />
                    Official EIP-8184 (Lucid) Resources & Research
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <a
                      href="https://encryptedmempool.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-violet-500" />
                        <span>encryptedmempool.org (Official Hub)</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>

                    <a
                      href="https://ethereum-magicians.org/t/eip-8184-lucid-encrypted-mempool/28017"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-cyan-500" />
                        <span>Ethereum Magicians: EIP-8184</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>

                    <a
                      href="https://ethresear.ch/t/lucid-encrypted-mempool-with-distributed-payload-propagation/24042"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-emerald-500" />
                        <span>ethresear.ch: Lucid Architecture</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>

                    <Link
                      href="/calls?series=etm"
                      className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-3.5 py-2.5 text-xs font-medium text-foreground transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-amber-500" />
                        <span>ETM Working Group Call Transcripts</span>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              )}

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

            {/* Email updates */}
            <section id="proposal-subscription" data-sidebar-label="Subscriptions">
              <div className="grid gap-4 md:grid-cols-2">
                <ProposalSubscriptionCard
                  repo={normalizedRepo as 'eip' | 'erc' | 'rip'}
                  number={number}
                  currentStatus={proposal.status}
                />
                <RepositorySubscriptionCard
                  repo={normalizedRepo as 'eip' | 'erc' | 'rip'}
                />
              </div>
            </section>
          </div>
        </div>
    </div>
  );
}
