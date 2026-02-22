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
  ChevronRight
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    text: 'text-cyan-200', 
    border: 'border-cyan-400/40', 
    leftBorder: 'border-l-cyan-400',
    dot: 'bg-cyan-500',
    dotGlow: 'shadow-cyan-500/50',
    cardBg: 'bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-cyan-500/5'
  },
  'Review': { 
    bg: 'bg-blue-500/10', 
    bgGradient: 'bg-gradient-to-br from-blue-500/15 via-blue-500/8 to-transparent',
    text: 'text-blue-200', 
    border: 'border-blue-400/40', 
    leftBorder: 'border-l-blue-400',
    dot: 'bg-blue-500',
    dotGlow: 'shadow-blue-500/50',
    cardBg: 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5'
  },
  'Last Call': { 
    bg: 'bg-amber-500/10', 
    bgGradient: 'bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-transparent',
    text: 'text-amber-200', 
    border: 'border-amber-400/40', 
    leftBorder: 'border-l-amber-400',
    dot: 'bg-amber-500',
    dotGlow: 'shadow-amber-500/50',
    cardBg: 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5'
  },
  'Final': { 
    bg: 'bg-emerald-500/10', 
    bgGradient: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent',
    text: 'text-emerald-200', 
    border: 'border-emerald-400/40', 
    leftBorder: 'border-l-emerald-400',
    dot: 'bg-emerald-500',
    dotGlow: 'shadow-emerald-500/50',
    cardBg: 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5'
  },
  'Stagnant': { 
    bg: 'bg-slate-500/10', 
    bgGradient: 'bg-gradient-to-br from-slate-500/15 via-slate-500/8 to-transparent',
    text: 'text-slate-300', 
    border: 'border-slate-400/30', 
    leftBorder: 'border-l-slate-400',
    dot: 'bg-slate-500',
    dotGlow: 'shadow-slate-500/30',
    cardBg: 'bg-gradient-to-br from-slate-500/15 via-slate-500/8 to-slate-500/5'
  },
  'Withdrawn': { 
    bg: 'bg-red-500/10', 
    bgGradient: 'bg-gradient-to-br from-red-500/15 via-red-500/8 to-transparent',
    text: 'text-red-200', 
    border: 'border-red-400/40', 
    leftBorder: 'border-l-red-400',
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
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [discussionsTo, setDiscussionsTo] = useState<string | null>(null);
  const [proposalRequires, setProposalRequires] = useState<number[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize repo name
  const normalizedRepo = repo.toLowerCase().replace(/s$/, '');
  const repoDisplayName = normalizedRepo === 'eip' ? 'EIP' : normalizedRepo === 'erc' ? 'ERC' : 'RIP';
  const repoPath = normalizedRepo === 'eip' ? 'EIPs' : normalizedRepo === 'erc' ? 'ERCs' : 'RIPs';
  const filePath = normalizedRepo === 'eip' ? 'EIPS' : normalizedRepo === 'erc' ? 'ERCS' : 'RIPS';
  const fileName = `${normalizedRepo}-${number}.md`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [proposalData, statusData, governanceData, upgradesData] = await Promise.all([
          client.proposals.getProposal({ repo: normalizedRepo as any, number }),
          client.proposals.getStatusEvents({ repo: normalizedRepo as any, number }),
          client.proposals.getGovernanceState({ repo: normalizedRepo as any, number }),
          client.proposals.getUpgrades({ repo: normalizedRepo as any, number }),
        ]);

        setProposal(proposalData);
        setStatusEvents(statusData);
        setGovernanceState(governanceData);
        setUpgrades(upgradesData);
      } catch (err: any) {
        console.error('Failed to fetch proposal data:', err);
        setError(err.message || 'Failed to load proposal');
        if (err.code === 'NOT_FOUND') {
          setError('Proposal not found');
        }
      } finally {
        setLoading(false);
      }
    };

    if (number && normalizedRepo) {
      fetchData();
    }
  }, [number, normalizedRepo]);

  // Fetch markdown content lazily via getContent (includes discussions_to, requires from frontmatter)
  useEffect(() => {
    if (!proposal || markdownContent !== null) return;

    const fetchContent = async () => {
      try {
        setMarkdownLoading(true);
        setMarkdownError(null);

        const data = await client.proposals.getContent({
          repo: normalizedRepo as 'eip' | 'erc' | 'rip',
          number,
        });

        setMarkdownContent(data.content);
        setDiscussionsTo(data.discussions_to ?? null);
        setProposalRequires(data.requires ?? []);
      } catch (err: any) {
        console.error('Failed to fetch proposal content:', err);
        setMarkdownError('Failed to load proposal content');
      } finally {
        setMarkdownLoading(false);
      }
    };

    fetchContent();
  }, [proposal, normalizedRepo, number, markdownContent]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to load proposal</h2>
          <p className="text-slate-400">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const proposalId = `${repoDisplayName}-${proposal.number}`;
  const githubUrl = `https://github.com/ethereum/${repoPath}/blob/master/${filePath}/${fileName}`;
  const currentStatusIndex = statusEvents.length - 1;

  // Determine urgency color for governance signals
  const getUrgencyColor = (days: number | null) => {
    if (!days) return 'text-slate-300';
    if (days > 60) return 'text-red-400';
    if (days > 30) return 'text-amber-400';
    return 'text-emerald-300';
  };

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Seamless Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.15),_transparent_50%),_radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/10 via-emerald-400/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* 1. Identity Header (Minimal) */}
        <div className="relative w-full bg-background/80 backdrop-blur-xl border-b border-cyan-400/10">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 sm:pt-12 sm:pb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Repo badge and copy link */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 backdrop-blur-sm">
                    {repoDisplayName}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleCopyLink}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/40 bg-slate-900/50 backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-cyan-400/15"
                        >
                          {linkCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
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
                <h1 className="dec-title text-balance bg-gradient-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl">
                  {proposalId}: {proposal.title}
                </h1>

                {/* Description */}
                <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base mt-3">
                  Track the governance lifecycle, status changes, and upgrade participation for this proposal.
                </p>

                {/* Authors as Avatars */}
                {proposal.authors.length > 0 && (
                  <div className="mt-6 flex items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Authors</p>
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
                                  <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-300 font-semibold">
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
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          {/* 2. Preamble Table (RFC-style, flat, authoritative) */}
          <div className="mb-12 mt-8">
            <div className="overflow-hidden rounded-lg border border-slate-700/40 bg-slate-950/50">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-slate-700/30">
                  <tr>
                    <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">EIP</td>
                    <td className="px-6 py-4 text-sm text-white font-mono">{proposalId}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Title</td>
                    <td className="px-6 py-4 text-sm text-white">{proposal.title}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Status</td>
                    <td className="px-6 py-4 text-sm text-white">{proposal.status}</td>
                  </tr>
                  {proposal.type && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Type</td>
                      <td className="px-6 py-4 text-sm text-white">{proposal.type}</td>
                    </tr>
                  )}
                  {proposal.category && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Category</td>
                      <td className="px-6 py-4 text-sm text-white">{proposal.category}</td>
                    </tr>
                  )}
                  {proposal.authors.length > 0 && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Author</td>
                      <td className="px-6 py-4 text-sm text-white">{proposal.authors.join(', ')}</td>
                    </tr>
                  )}
                  {proposal.created && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Created</td>
                      <td className="px-6 py-4 text-sm text-white">{proposal.created}</td>
                    </tr>
                  )}
                  {proposalRequires.length > 0 && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Requires</td>
                      <td className="px-6 py-4 text-sm text-white font-mono">
                        {proposalRequires.map(r => `${repoDisplayName}-${r}`).join(', ')}
                      </td>
                    </tr>
                  )}
                  {(proposal.discussions_to || discussionsTo) && (
                    <tr>
                      <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Discussions-To</td>
                      <td className="px-6 py-4 text-sm">
                        <a 
                          href={proposal.discussions_to || discussionsTo || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyan-300 hover:text-cyan-200 transition-colors break-all"
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
                        <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Inclusion Status</td>
                        <td className="px-6 py-4 text-sm text-white">
                          {upgrades.map((upgrade, idx) => (
                            <span key={idx}>
                              {upgrade.bucket 
                                ? upgrade.bucket.charAt(0).toUpperCase() + upgrade.bucket.slice(1)
                                : 'Unknown'}
                              {idx < upgrades.length - 1 && ', '}
                            </span>
                          ))}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30 w-40 align-top">Network Upgrade</td>
                        <td className="px-6 py-4 text-sm text-white">
                          {upgrades.map((upgrade, idx) => (
                            <span key={idx}>
                              {upgrade.name || `Upgrade ${upgrade.upgrade_id}`}
                              {idx < upgrades.length - 1 && ', '}
                            </span>
                          ))}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Governance Signals + Lifecycle Timeline (Together) */}
          <div className="mb-12 space-y-8">
            {/* Governance Signals */}
            {governanceState && (governanceState.waiting_on || governanceState.days_since_last_action !== null) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Governance Signals</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {governanceState.waiting_on && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Waiting On</p>
                      <p className="text-sm font-semibold text-emerald-300">
                        {formatWaitingOn(governanceState.waiting_on)}
                      </p>
                    </div>
                  )}
                  {governanceState.days_since_last_action !== null && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Days Since Last Action</p>
                      <p className={cn("text-sm font-semibold", getUrgencyColor(governanceState.days_since_last_action))}>
                        {governanceState.days_since_last_action} day{governanceState.days_since_last_action !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Lifecycle Timeline - Improved with dominant current state */}
            {statusEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-cyan-400/20 bg-slate-900/40 p-8 backdrop-blur-sm overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Lifecycle Timeline</h3>
                  </div>
                  {/* Status pill - only here, glowy */}
                  {proposal.status && (
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold shadow-lg",
                      statusColors[proposal.status]?.bg || 'bg-slate-500/20',
                      statusColors[proposal.status]?.text || 'text-slate-300',
                      statusColors[proposal.status]?.border || 'border-slate-400/30',
                      'shadow-cyan-500/20'
                    )}>
                      {proposal.status}
                    </span>
                  )}
                </div>
                
                {/* Horizontal Timeline - State Conveyor */}
                <div className="relative">
                  {/* Hero Timeline Rail */}
                  <div className="absolute top-12 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
                  
                  {/* Progress Overlay */}
                  {statusEvents.length > 1 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentStatusIndex / (statusEvents.length - 1)) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute top-12 left-0 h-[2px] bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400"
                    />
                  )}
                  
                  {/* Timeline items */}
                  <div className="relative flex items-start gap-0 overflow-x-auto pb-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-500/20">
                    {statusEvents.map((event, index) => {
                      const prevEvent = index > 0 ? statusEvents[index - 1] : null;
                      const duration = calculateDuration(prevEvent?.changed_at || null, event.changed_at);
                      const isCurrent = index === currentStatusIndex;
                      const isFinal = event.to === 'Final';
                      const isWithdrawn = event.to === 'Withdrawn';
                      const shouldPulse = isCurrent || isFinal || isWithdrawn;
                      
                      const eventColor = statusColors[event.to] || statusColors['Draft'];
                      
                      // Build GitHub commit URL
                      const commitUrl = event.commit_sha && event.commit_sha.trim() !== ''
                        ? `https://github.com/ethereum/${repoPath}/commit/${event.commit_sha}`
                        : `https://github.com/ethereum/${repoPath}`;
                      
                      // Get pulse glow color
                      const getPulseColor = (status: string) => {
                        if (status === 'Final') return 'rgba(16,185,129,0.4)';
                        if (status === 'Withdrawn') return 'rgba(239,68,68,0.4)';
                        if (status === 'Last Call') return 'rgba(245,158,11,0.4)';
                        if (status === 'Review') return 'rgba(59,130,246,0.4)';
                        return 'rgba(6,182,212,0.4)';
                      };
                      
                      // Get border color
                      const getBorderColor = (status: string) => {
                        if (status === 'Final') return 'rgba(52,211,153,0.6)';
                        if (status === 'Withdrawn') return 'rgba(248,113,113,0.6)';
                        if (status === 'Last Call') return 'rgba(251,191,36,0.6)';
                        if (status === 'Review') return 'rgba(96,165,250,0.6)';
                        return 'rgba(34,211,238,0.6)';
                      };
                      
                      return (
                        <React.Fragment key={index}>
                          {/* Timeline item - dot on rail, card hangs from dot */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ 
                              opacity: isCurrent ? 1 : 0.7, 
                              scale: isCurrent ? 1 : 1,
                              y: 0 
                            }}
                            transition={{ duration: 0.5, delay: index * 0.1, type: "spring" }}
                            className={cn(
                              "flex-shrink-0 flex flex-col items-center w-[260px] relative group",
                              isCurrent && "z-10",
                              !isCurrent && "opacity-70 grayscale-[10%]"
                            )}
                          >
                            {/* Dot - snapped to rail */}
                            <div className="absolute top-12 -translate-y-1/2 z-20">
                              {/* Pulse animation only for current/Final/Withdrawn */}
                              {shouldPulse && (
                                <motion.div
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                  className="absolute inset-0 rounded-full blur-md -z-10"
                                  style={{ backgroundColor: getPulseColor(event.to) }}
                                />
                              )}
                              {/* Dot */}
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.1 + 0.2, type: "spring" }}
                                className={cn(
                                  "h-5 w-5 rounded-full border-2 relative z-10",
                                  isCurrent ? "shadow-lg" : "shadow-sm",
                                  eventColor.dot,
                                  eventColor.dotGlow
                                )}
                                style={{ borderColor: getBorderColor(event.to) }}
                              />
                            </div>
                            
                            {/* Event content card - hangs from dot */}
                            <div
                              className={cn(
                                "mt-10 w-full rounded-lg border-l-4 p-4 transition-all backdrop-blur-sm",
                                eventColor.leftBorder,
                                eventColor.cardBg,
                                eventColor.border,
                                event.commit_sha ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "",
                                isCurrent && "shadow-md"
                              )}
                              onClick={() => {
                                if (event.commit_sha) {
                                  window.open(commitUrl, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              {/* Status badge - uppercase, tighter */}
                              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                                {event.from && (
                                  <>
                                    <span className={cn(
                                      "text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded", 
                                      statusColors[event.from]?.bg || 'bg-slate-500/20',
                                      statusColors[event.from]?.text || 'text-slate-400'
                                    )}>
                                      {event.from}
                                    </span>
                                    <ChevronRight className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                                  </>
                                )}
                                <span className={cn(
                                  "text-[11px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded",
                                  eventColor.bg,
                                  eventColor.text
                                )}>
                                  {event.to}
                                </span>
                              </div>
                              
                              {/* Date and time */}
                              <div className="space-y-0.5 mb-2.5">
                                <p className="text-xs font-medium text-white">
                                  {new Date(event.changed_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(event.changed_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              
                              {/* Duration */}
                              {duration && prevEvent && (
                                <div className="pt-2 border-t border-white/10">
                                  <p className="text-[10px] text-slate-400 italic">
                                    {duration} in {prevEvent.to}
                                  </p>
                                </div>
                              )}
                              
                              {/* Commit link hint */}
                              {event.commit_sha && (
                                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-center gap-1">
                                  <Github className="h-2.5 w-2.5 text-slate-500" />
                                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">
                                    View commit
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>

                          {/* Flow gap connector (replaces chevron) */}
                          {index < statusEvents.length - 1 && (
                            <motion.div
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              transition={{ duration: 0.5, delay: index * 0.1 + 0.3, ease: "easeOut" }}
                              className="flex-shrink-0 w-8 flex items-center justify-center pt-12"
                            >
                              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />
                            </motion.div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 4. Upgrade Participation */}
          {upgrades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-xl border border-violet-400/20 bg-slate-900/40 p-6 mb-12 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-violet-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300">Network Upgrades</h3>
              </div>
              <div className="space-y-3">
                {upgrades.map((upgrade, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-violet-400/10 bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-help">
                          <div>
                            <p className="text-sm font-semibold text-violet-300">
                              Included in {upgrade.name} ({upgrade.bucket})
                            </p>
                            {upgrade.commit_date && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(upgrade.commit_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          <Link href={`/upgrade/${upgrade.slug}`}>
                            <Button variant="ghost" size="sm" className="text-violet-300 hover:text-violet-200">
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

          {/* 5. Canonical Proposal Text (Markdown body only) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-8 mb-12"
          >
            {/* Copy as Markdown button */}
            {markdownContent && (
              <div className="flex items-center justify-end mb-8">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyMarkdown}
                        className="border-slate-600/40 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all"
                      >
                        {markdownCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <FileCode className="h-3.5 w-3.5 mr-1.5" />
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
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400 mb-4">{markdownError}</p>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1.5"
                >
                  View on GitHub instead <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : markdownContent ? (
              <MarkdownRenderer
                content={markdownContent}
                skipPreamble={true}
                stripDuplicateHeaders={true}
              />
            ) : null}
          </motion.div>

          {/* 6. External Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="h-4 w-4 text-slate-400" />
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  View on GitHub
                </a>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

