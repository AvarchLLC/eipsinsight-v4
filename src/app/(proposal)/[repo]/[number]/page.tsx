'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Clock, 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Bell,
  Github,
  Activity,
  Package,
  Copy,
  Check,
  Link as LinkIcon
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { PageHeader } from '@/components/header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownRenderer } from '@/components/markdown-renderer';

// Status color mapping
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Draft': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-400/30' },
  'Review': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-400/30' },
  'Last Call': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-400/30' },
  'Final': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-400/30' },
  'Stagnant': { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-400/30' },
  'Withdrawn': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-400/30' },
};

// Type color mapping
const typeColors: Record<string, { bg: string; text: string }> = {
  'Core': { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  'ERC': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'Networking': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'Interface': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  'Meta': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'Informational': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
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
  const [linkCopied, setLinkCopied] = useState(false);
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

  // Fetch markdown content lazily
  useEffect(() => {
    if (!proposal || markdownContent !== null) return;

    const fetchMarkdown = async () => {
      try {
        setMarkdownLoading(true);
        setMarkdownError(null);
        
        // Fetch raw markdown from GitHub
        const response = await fetch(
          `https://raw.githubusercontent.com/ethereum/${repoPath}/master/${filePath}/${fileName}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch markdown');
        }
        
        const text = await response.text();
        setMarkdownContent(text);
      } catch (err: any) {
        console.error('Failed to fetch markdown:', err);
        setMarkdownError('Failed to load proposal content');
      } finally {
        setMarkdownLoading(false);
      }
    };

    fetchMarkdown();
  }, [proposal, repoPath, filePath, fileName, markdownContent]);

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

  const statusColor = statusColors[proposal.status] || statusColors['Draft'];
  const typeColor = proposal.type && typeColors[proposal.type] 
    ? typeColors[proposal.type] 
    : { bg: 'bg-slate-500/20', text: 'text-slate-300' };

  const proposalId = `${repoDisplayName}-${proposal.number}`;
  const githubUrl = `https://github.com/ethereum/${repoPath}/blob/master/${filePath}/${fileName}`;

  // Determine urgency color for governance signals
  const getUrgencyColor = (days: number | null) => {
    if (!days) return 'text-slate-300';
    if (days > 60) return 'text-red-400';
    if (days > 30) return 'text-amber-400';
    return 'text-emerald-300';
  };

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.08),_transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-300/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header with repo badge and copy link */}
        <div className="relative w-full bg-background">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-4 sm:px-6 sm:pt-12 sm:pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Repo badge */}
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
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
                <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  Track the governance lifecycle, status changes, and upgrade participation for this proposal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          {/* Status & Type Pills - Status is dominant */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Status pill - larger and more prominent */}
            <span className={cn(
              "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold",
              statusColor.bg,
              statusColor.text,
              statusColor.border
            )}>
              {proposal.status}
            </span>
            {/* Type and category - smaller and secondary */}
            {proposal.type && (
              <span className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                typeColor.bg,
                typeColor.text
              )}>
                {proposal.type}
              </span>
            )}
            {proposal.category && (
              <span className="inline-flex items-center rounded-full bg-slate-500/20 px-3 py-1 text-xs font-medium text-slate-300">
                {proposal.category}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-cyan-400/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
            >
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              Subscribe
            </Button>
          </div>

          {/* Governance Signals - Improved with human phrasing and color-coding */}
          {governanceState && (governanceState.waiting_on || governanceState.days_since_last_action !== null) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 mb-8 backdrop-blur-sm"
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

          {/* Upgrade Participation - Improved language */}
          {upgrades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-slate-900/60 to-slate-900/40 p-6 mb-8 backdrop-blur-sm"
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

          {/* Horizontal Lifecycle Timeline - Before Preamble */}
          {statusEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/60 to-slate-900/40 p-8 mb-8 backdrop-blur-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Lifecycle Timeline</h3>
              </div>
              
              {/* Horizontal Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/20 via-cyan-400/40 to-cyan-400/20" />
                
                {/* Timeline items */}
                <div className="relative flex items-start gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-500/20">
                  {statusEvents.map((event, index) => {
                    const prevEvent = index > 0 ? statusEvents[index - 1] : null;
                    const duration = calculateDuration(prevEvent?.changed_at || null, event.changed_at);
                    const isFinal = event.to === 'Final';
                    const isWithdrawn = event.to === 'Withdrawn';
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="flex-shrink-0 flex flex-col items-center min-w-[220px] max-w-[280px] relative"
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 mb-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.4, delay: index * 0.1 + 0.2, type: "spring" }}
                            className={cn(
                              "h-5 w-5 rounded-full border-2 shadow-lg",
                              isFinal 
                                ? "bg-emerald-500 border-emerald-400 shadow-emerald-500/50"
                                : isWithdrawn
                                ? "bg-red-500 border-red-400 shadow-red-500/50"
                                : "bg-cyan-500 border-cyan-400 shadow-cyan-500/50"
                            )}
                          />
                          {/* Pulse animation for current status */}
                          {index === statusEvents.length - 1 && (
                            <motion.div
                              animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className={cn(
                                "absolute inset-0 rounded-full -z-10",
                                isFinal 
                                  ? "bg-emerald-400"
                                  : isWithdrawn
                                  ? "bg-red-400"
                                  : "bg-cyan-400"
                              )}
                            />
                          )}
                        </div>
                        
                        {/* Event content */}
                        <div className="text-center w-full bg-slate-900/40 rounded-lg border border-slate-700/30 p-4 backdrop-blur-sm">
                          <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
                            {event.from && (
                              <>
                                <span className="text-xs text-slate-400">{event.from}</span>
                                <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                              </>
                            )}
                            <span className={cn(
                              "text-sm font-bold",
                              isFinal 
                                ? "text-emerald-300"
                                : isWithdrawn
                                ? "text-red-300"
                                : "text-cyan-300"
                            )}>
                              {event.to}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1 font-medium">
                            {new Date(event.changed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            {new Date(event.changed_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {duration && prevEvent && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 + 0.4 }}
                              className="pt-2 border-t border-slate-700/30"
                            >
                              <p className="text-xs text-slate-500 italic">
                                {duration} in {prevEvent.to}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Proposal Content - Article Format (Preamble + Markdown) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: statusEvents.length > 0 ? 0.2 : 0.1 }}
            className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-8 mb-8 backdrop-blur-sm"
          >
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
                preamble={{
                  eip: proposalId,
                  title: proposal.title,
                  status: proposal.status,
                  type: proposal.type || undefined,
                  category: proposal.category || undefined,
                  author: proposal.authors.join(', '),
                  created: proposal.created || undefined,
                  requires: proposal.requires.length > 0 ? proposal.requires.map(r => `${repoDisplayName}-${r}`).join(', ') : undefined,
                  discussionsTo: proposal.discussions_to || undefined,
                }}
              />
            ) : null}
          </motion.div>

          {/* External Links - Compressed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-4 backdrop-blur-sm"
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
