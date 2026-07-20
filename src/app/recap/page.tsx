'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  GitMerge,
  GitPullRequest,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callSeriesShort } from '@/data/call-series';

type WeeklyData = Awaited<ReturnType<typeof client.dashboard.getWeeklyRecap>>;

type RecapFilter = 'all' | 'new_proposals' | 'status_changes' | 'merged_prs' | 'editor_activity' | 'calls_devnets' | 'last_call';
type RepoFilter = 'all' | 'eip' | 'erc' | 'rip';

function formatDate(isoString?: string | null) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(isoString?: string | null) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getProposalPath(category: string | null, number: number) {
  const cat = category?.toLowerCase();
  const folder = cat === 'erc' ? 'erc' : cat === 'rip' ? 'rip' : 'eip';
  return `/${folder}/${number}`;
}

function normalizeRepoSegment(repoName?: string | null): string {
  if (!repoName) return 'eips';
  let x = repoName.toLowerCase();
  if (x.includes('/')) {
    const parts = x.split('/');
    x = parts[parts.length - 1];
  }
  if (x === 'erc' || x === 'ercs') return 'ercs';
  if (x === 'rip' || x === 'rips') return 'rips';
  return 'eips';
}

function getAvatarUrl(actor?: string | null) {
  if (!actor || actor === 'system') return 'https://github.com/ethereum.png';
  const clean = actor.replace(/^@/, '').trim();
  return `https://github.com/${clean}.png`;
}

function extractTldrSummary(tldr: unknown): string {
  if (!tldr) return '';
  if (typeof tldr === 'string') return tldr;
  if (typeof tldr === 'object' && tldr !== null) {
    const obj = tldr as Record<string, unknown>;
    if (typeof obj.summary === 'string') return obj.summary;
    if (typeof obj.overview === 'string') return obj.overview;
    if (typeof obj.tldr === 'string') return obj.tldr;
    if (typeof obj.description === 'string') return obj.description;
    if (typeof obj.text === 'string') return obj.text;
    for (const val of Object.values(obj)) {
      if (typeof val === 'string' && val.length > 5) return val;
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') return val[0];
    }
  }
  return '';
}

export default function DedicatedRecapPage() {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<RecapFilter>('all');
  const [repoFilter, setRepoFilter] = useState<RepoFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRecap = async (daysRange: number) => {
    setLoading(true);
    try {
      const res = await client.dashboard.getWeeklyRecap({ days: daysRange });
      setData(res);
    } catch (err) {
      console.error('Failed to load public weekly recap:', err);
      toast.error('Failed to load recap data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecap(days);
  }, [days]);

  // Generate copyable / downloadable markdown
  const buildMarkdownReport = () => {
    if (!data) return '';

    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let md = `# Ethereum Standards Weekly Recap (${days} Days) - ${formattedDate}\n\n`;
    md += `Source: [EIPsInsight Verifiable Audit Feed](https://eipsinsight.com/recap)\n\n---\n\n`;

    if (data.newProposals.length > 0) {
      md += `### 🆕 New Proposals Introduced\n`;
      data.newProposals.forEach((p) => {
        const typeStr = p.category ? `${p.category} ` : '';
        md += `- **[${p.status}] [${typeStr}EIP-${p.number}](https://eipsinsight.com/${p.category?.toLowerCase() === 'erc' ? 'erc' : 'eip'}s/${p.number})**: ${p.title} *(Created ${formatDate(p.createdAt)})\*\n`;
      });
      md += `\n`;
    }

    if (data.statusChanges.length > 0) {
      md += `### 🔄 Lifecycle & Status Changes\n`;
      data.statusChanges.forEach((sc) => {
        const typeStr = sc.category ? `${sc.category} ` : '';
        md += `- **[${typeStr}EIP-${sc.number}](https://eipsinsight.com/${sc.category?.toLowerCase() === 'erc' ? 'erc' : 'eip'}s/${sc.number})**: \`${sc.from}\` ➔ \`${sc.to}\` *(Changed ${formatDate(sc.changedAt)})\*\n`;
      });
      md += `\n`;
    }

    if (data.mergedPRs.length > 0) {
      md += `### 🪵 Recently Merged Pull Requests\n`;
      data.mergedPRs.forEach((pr) => {
        const repoPath = normalizeRepoSegment(pr.repoName);
        md += `- **[PR #${pr.number}](https://eipsinsight.com/pr/${repoPath}/${pr.number})**: ${pr.title} *(Merged ${formatDate(pr.mergedAt)} by @${pr.author})\*\n`;
      });
      md += `\n`;
    }

    if (data.editorActions && data.editorActions.length > 0) {
      md += `### ✍️ Editor Review Activity\n`;
      data.editorActions.forEach((ea) => {
        const repoPath = normalizeRepoSegment(ea.repoName);
        md += `- **[PR #${ea.number}](https://eipsinsight.com/pr/${repoPath}/${ea.number})**: ${ea.title || 'Editor action'} *(Editor @${ea.editor} - ${ea.eventType} on ${formatDate(ea.actedAt)})\*\n`;
      });
      md += `\n`;
    }

    if (data.recentCalls.length > 0) {
      md += `### 🗣️ Core Dev Calls Highlights\n`;
      data.recentCalls.forEach((c) => {
        const shortName = callSeriesShort(c.series);
        const title = c.displayName || `${shortName} #${c.number ?? ''}`;
        const summary = extractTldrSummary(c.tldr);
        md += `#### ${title} *(Occurred ${formatDate(c.occurredOn)})\*\n`;
        if (summary) md += `* **Summary:** ${summary}\n`;
        md += `\n`;
      });
    }

    if (data.devnets.length > 0) {
      md += `### 🧪 Devnets Progression\n`;
      data.devnets.forEach((d) => {
        md += `- **[${d.active ? 'Active' : 'Closed'}] [${d.series.toUpperCase()} Devnet ${d.number}](https://eipsinsight.com/upgrade/devnets/${d.id})**: ${d.title}\n`;
      });
      md += `\n`;
    }

    if (data.lastCallEIPs.length > 0) {
      md += `### 📢 Last Call Deadlines\n`;
      data.lastCallEIPs.forEach((lc) => {
        md += `- **[EIP-${lc.number}](https://eipsinsight.com/eips/${lc.number})**: ${lc.title} *(Deadline: ${lc.deadline || 'Immediate'})\*\n`;
      });
      md += `\n`;
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = buildMarkdownReport();
    if (!md) return;
    navigator.clipboard.writeText(md);
    toast.success(`Copied ${days}-day verifiable recap markdown!`);
  };

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownReport();
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `eipsinsight-recap-${days}d-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded recap markdown file!');
  };

  // Combine items for rendering
  const items = useMemo(() => {
    if (!data) return [];
    const list: Array<{
      id: string;
      kind: 'new_proposal' | 'status_change' | 'merged_pr' | 'editor_activity' | 'call' | 'devnet' | 'last_call';
      repoCategory: 'eip' | 'erc' | 'rip';
      title: string;
      subtitle?: string;
      actor?: string | null;
      badgeText: string;
      badgeVariant?: string;
      dateIso: string | null;
      href: string;
      externalHref?: string;
      details?: React.ReactNode;
    }> = [];

    // New proposals
    data.newProposals.forEach((p) => {
      const cat = (p.category?.toLowerCase() || 'eip') as 'eip' | 'erc' | 'rip';
      list.push({
        id: `new-${p.number}`,
        kind: 'new_proposal',
        repoCategory: cat,
        title: `${p.category || 'EIP'}-${p.number}: ${p.title}`,
        subtitle: `Newly proposed ${p.category || 'EIP'} standard`,
        badgeText: p.status,
        badgeVariant: 'emerald',
        dateIso: p.createdAt,
        href: getProposalPath(p.category, p.number),
      });
    });

    // Status changes
    data.statusChanges.forEach((sc) => {
      const cat = (sc.category?.toLowerCase() || 'eip') as 'eip' | 'erc' | 'rip';
      list.push({
        id: `sc-${sc.number}-${sc.to}`,
        kind: 'status_change',
        repoCategory: cat,
        title: `${sc.category || 'EIP'}-${sc.number}: ${sc.title}`,
        subtitle: `Status transition from ${sc.from || 'Draft'} to ${sc.to}`,
        badgeText: `${sc.from || 'Draft'} ➔ ${sc.to}`,
        badgeVariant: 'amber',
        dateIso: sc.changedAt,
        href: getProposalPath(sc.category, sc.number),
      });
    });

    // Merged PRs
    data.mergedPRs.forEach((pr) => {
      const cat = pr.repoName?.includes('erc') ? 'erc' : pr.repoName?.includes('rip') ? 'rip' : 'eip';
      const repoPath = normalizeRepoSegment(pr.repoName);
      list.push({
        id: `pr-${pr.repoName}-${pr.number}`,
        kind: 'merged_pr',
        repoCategory: cat,
        title: `PR #${pr.number}: ${pr.title}`,
        subtitle: `Merged by @${pr.author} in ${pr.repoName}`,
        actor: pr.author,
        badgeText: 'Merged PR',
        badgeVariant: 'sky',
        dateIso: pr.mergedAt,
        href: `/pr/${repoPath}/${pr.number}`,
        externalHref: pr.repoName ? `https://github.com/${pr.repoName}/pull/${pr.number}` : undefined,
      });
    });

    // Editor Actions
    if (data.editorActions) {
      data.editorActions.forEach((ea) => {
        const cat = ea.repoName?.includes('erc') ? 'erc' : ea.repoName?.includes('rip') ? 'rip' : 'eip';
        const repoPath = normalizeRepoSegment(ea.repoName);
        list.push({
          id: `editor-${ea.repoName}-${ea.number}-${ea.editor}-${ea.actedAt}`,
          kind: 'editor_activity',
          repoCategory: cat,
          title: `PR #${ea.number}: ${ea.title || 'Editor Activity'}`,
          subtitle: `Editor @${ea.editor} (${ea.eventType}) in ${ea.repoName}`,
          actor: ea.editor,
          badgeText: `Editor ${ea.eventType}`,
          badgeVariant: 'indigo',
          dateIso: ea.actedAt,
          href: `/pr/${repoPath}/${ea.number}`,
          externalHref: ea.eventUrl || undefined,
        });
      });
    }

    // Recent calls
    data.recentCalls.forEach((c) => {
      const shortName = callSeriesShort(c.series);
      const callTitle = c.displayName || `${shortName} #${c.number ?? ''}`;
      const summaryText = extractTldrSummary(c.tldr);
      list.push({
        id: `call-${c.series}-${c.number}`,
        kind: 'call',
        repoCategory: 'eip',
        title: callTitle,
        subtitle: summaryText || 'Core Developer Meeting',
        badgeText: `${shortName} Call`,
        badgeVariant: 'purple',
        dateIso: c.occurredOn,
        href: `/upgrade/calls/${c.series.toLowerCase()}/${c.number || ''}`,
        details: c.keyDecisions && Array.isArray(c.keyDecisions) ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Key Decisions:</span>
            <ul className="list-disc pl-4 space-y-0.5">
              {(c.keyDecisions as string[]).map((dec, i) => (
                <li key={i}>{dec}</li>
              ))}
            </ul>
          </div>
        ) : undefined,
      });
    });

    // Devnets
    data.devnets.forEach((d) => {
      list.push({
        id: `devnet-${d.id}`,
        kind: 'devnet',
        repoCategory: 'eip',
        title: `${d.series.toUpperCase()} Devnet ${d.number}: ${d.title}`,
        subtitle: d.active ? 'Active Devnet progression' : 'Closed Devnet',
        badgeText: d.active ? 'Active Devnet' : 'Closed Devnet',
        badgeVariant: d.active ? 'emerald' : 'slate',
        dateIso: d.scrapedAt,
        href: `/upgrade/devnets/${d.id}`,
      });
    });

    // Last Call EIPs
    data.lastCallEIPs.forEach((lc) => {
      list.push({
        id: `lastcall-${lc.number}`,
        kind: 'last_call',
        repoCategory: 'eip',
        title: `EIP-${lc.number}: ${lc.title}`,
        subtitle: `Review Deadline: ${lc.deadline || 'Immediate'}`,
        badgeText: 'Last Call',
        badgeVariant: 'rose',
        dateIso: null,
        href: `/eip/${lc.number}`,
      });
    });

    // Sort by date descending
    list.sort((a, b) => {
      if (!a.dateIso) return 1;
      if (!b.dateIso) return -1;
      return new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime();
    });

    return list;
  }, [data]);

  // Filter items by type, repo, and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (filter === 'new_proposals' && item.kind !== 'new_proposal') return false;
      if (filter === 'status_changes' && item.kind !== 'status_change') return false;
      if (filter === 'merged_prs' && item.kind !== 'merged_pr') return false;
      if (filter === 'editor_activity' && item.kind !== 'editor_activity') return false;
      if (filter === 'calls_devnets' && item.kind !== 'call' && item.kind !== 'devnet') return false;
      if (filter === 'last_call' && item.kind !== 'last_call') return false;

      // Repo filter
      if (repoFilter !== 'all' && item.repoCategory !== repoFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const subMatch = item.subtitle?.toLowerCase().includes(q);
        const actorMatch = item.actor?.toLowerCase().includes(q);
        if (!titleMatch && !subMatch && !actorMatch) return false;
      }

      return true;
    });
  }, [items, filter, repoFilter, searchQuery]);

  const totalNew = data?.newProposals.length ?? 0;
  const totalChanges = data?.statusChanges.length ?? 0;
  const totalPRs = data?.mergedPRs.length ?? 0;
  const totalEditorActions = data?.editorActions?.length ?? 0;
  const totalCalls = (data?.recentCalls.length ?? 0) + (data?.devnets.length ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Homepage */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Homepage
        </Link>
      </div>

      {/* Main Page Header */}
      <div className="mb-8 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Weekly Standards Recap & Audit Feed
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                Verifiable Feed
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
              Comprehensive, real-time audit log tracking all new EIP/ERC/RIP proposals, status transitions, merged pull requests, editor reviews, devnet progressions, and core developer meeting decisions across Ethereum standards.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={handleCopyMarkdown}
              variant="outline"
              size="sm"
              className="border-border bg-card/60 hover:bg-muted text-xs gap-1.5"
            >
              <Copy className="h-3.5 w-3.5 text-primary" />
              Copy Markdown
            </Button>
            <Button
              onClick={handleDownloadMarkdown}
              variant="outline"
              size="sm"
              className="border-border bg-card/60 hover:bg-muted text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Download .md
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Proposals</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalNew}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In last {days} days</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Transitions</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalChanges}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In last {days} days</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Merged PRs</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalPRs}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In last {days} days</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Editor Reviews</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalEditorActions}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In last {days} days</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ACD & Devnets</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalCalls}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">In last {days} days</p>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, EIP number, or author handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs bg-background/80 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Timeframe:</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    days === d
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repository & Type Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Type:</span>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All Updates' },
                  { id: 'new_proposals', label: `New (${totalNew})` },
                  { id: 'status_changes', label: `Status Changes (${totalChanges})` },
                  { id: 'merged_prs', label: `Merged PRs (${totalPRs})` },
                  { id: 'editor_activity', label: `Editor Activity (${totalEditorActions})` },
                  { id: 'calls_devnets', label: `ACD & Devnets (${totalCalls})` },
                  { id: 'last_call', label: `Last Call (${data?.lastCallEIPs.length ?? 0})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as RecapFilter)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    filter === tab.id
                      ? 'bg-primary/15 border border-primary/40 text-primary font-semibold'
                      : 'border border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Repo:</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5">
              {(['all', 'eip', 'erc', 'rip'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRepoFilter(r as RepoFilter)}
                  className={`px-2 py-0.5 text-xs font-medium rounded-md uppercase transition-colors ${
                    repoFilter === r
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed List */}
      {loading ? (
        <div className="space-y-3 py-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-card/40 border border-border" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No recap entries match your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs transition-all hover:border-primary/40"
              >
                <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex flex-1 items-center gap-3 cursor-pointer min-w-0"
                  >
                    {item.actor ? (
                      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border" title={`@${item.actor}`}>
                        <img src={getAvatarUrl(item.actor)} alt={item.actor} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs bg-background/80 font-medium">
                        {item.badgeText}
                      </Badge>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.actor && (
                          <Badge variant="outline" className="shrink-0 text-xs bg-background/80 font-medium">
                            {item.badgeText}
                          </Badge>
                        )}
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      </div>
                      {item.subtitle && (
                        <p className="truncate text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.dateIso && (
                      <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums">
                        {formatDate(item.dateIso)} ({timeAgo(item.dateIso)})
                      </span>
                    )}

                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      [Check]
                    </Link>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/60 bg-muted/20 px-4 py-3"
                    >
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p className="text-foreground font-medium">{item.title}</p>
                        {item.subtitle && <p>{item.subtitle}</p>}
                        {item.details}

                        <div className="flex items-center gap-3 pt-2">
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            View Observability Details
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          {item.externalHref && (
                            <a
                              href={item.externalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              Verify on GitHub
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
