"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { client } from "@/lib/orpc";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  ChevronLeft,
  Clock,
  Copy,
  FileText,
  Flame,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WeeklyData = Awaited<ReturnType<typeof client.dashboard.getWeeklyRecap>>;

const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const inputClass = "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all outline-none";

// Helper Helpers
const formatDate = (isoString?: string | null) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getProposalLink = (p: { category: string | null; number: number }) => {
  const cat = p.category?.toLowerCase();
  const folder = cat === "erc" ? "ercs" : cat === "rip" ? "rips" : "eips";
  return `/${folder}/${p.number}`;
};

const getPRLink = (pr: { repoName: string; number: number }) => {
  return `/pr/${pr.repoName}/${pr.number}`;
};

const getDevnetLink = (id: string) => {
  return `/upgrade/devnets/${id}`;
};

const getCallLink = (c: { series: string; number: string }) => {
  return `/upgrade/calls/${c.series.toLowerCase()}/${c.number}`;
};

export default function WeeklyRecapPage() {
  // App States
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeeklyData | null>(null);
  
  // Parameter State
  const [recapDate, setRecapDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Selection States (IDs of items to include in report)
  const [selectedProposals, setSelectedProposals] = useState<Record<number, boolean>>({});
  const [selectedChanges, setSelectedChanges] = useState<Record<string, boolean>>({});
  const [selectedPRs, setSelectedPRs] = useState<Record<number, boolean>>({});
  const [selectedDevnets, setSelectedDevnets] = useState<Record<string, boolean>>({});
  const [selectedCalls, setSelectedCalls] = useState<Record<string, boolean>>({});
  const [selectedUpcoming, setSelectedUpcoming] = useState<Record<string, boolean>>({});
  const [selectedLastCalls, setSelectedLastCalls] = useState<Record<number, boolean>>({});
  
  // Featured Proposal Field
  const [featuredEipNumber, setFeaturedEipNumber] = useState("");
  const [loadingCuration, setLoadingCuration] = useState(false);
  const [featuredDetails, setFeaturedDetails] = useState<{
    number: number;
    title: string;
    summary: string;
    benefits: string[];
    tradeoffs: string[];
  } | null>(null);

  // Manual Inputs / Rotating sections
  const [manualAcdHighlights, setManualAcdHighlights] = useState("");
  const [enterpriseBrief, setEnterpriseBrief] = useState("");
  const [ecosystemAdoption, setEcosystemAdoption] = useState("");
  const [watchNextWeek, setWatchNextWeek] = useState("");
  const [spotlightInfo, setSpotlightInfo] = useState("");

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const recapData = await client.dashboard.getWeeklyRecap({});
      setData(recapData);

      // Pre-fill selection objects to true
      const proposalsSel: Record<number, boolean> = {};
      recapData.newProposals.forEach(p => proposalsSel[p.number] = true);
      setSelectedProposals(proposalsSel);

      const changesSel: Record<string, boolean> = {};
      recapData.statusChanges.forEach(sc => changesSel[`${sc.number}-${sc.to}`] = true);
      setSelectedChanges(changesSel);

      const prsSel: Record<number, boolean> = {};
      recapData.mergedPRs.forEach(pr => prsSel[pr.number] = true);
      setSelectedPRs(prsSel);

      const devnetsSel: Record<string, boolean> = {};
      recapData.devnets.forEach(d => devnetsSel[d.id] = true);
      setSelectedDevnets(devnetsSel);

      const callsSel: Record<string, boolean> = {};
      recapData.recentCalls.forEach(c => callsSel[`${c.series}-${c.number}`] = true);
      setSelectedCalls(callsSel);

      const upcomingSel: Record<string, boolean> = {};
      recapData.upcomingCalls.forEach(c => upcomingSel[`${c.series}-${c.callNumber || c.issueNumber}`] = true);
      setSelectedUpcoming(upcomingSel);

      const lastCallSel: Record<number, boolean> = {};
      recapData.lastCallEIPs.forEach(lc => lastCallSel[lc.number] = true);
      setSelectedLastCalls(lastCallSel);

    } catch (error) {
      toast.error("Failed to load weekly recap data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-fetch Curation details for Featured Proposal
  const handleLoadCuration = async () => {
    const num = parseInt(featuredEipNumber, 10);
    if (isNaN(num)) {
      toast.error("Please enter a valid EIP/ERC number");
      return;
    }
    setLoadingCuration(true);
    try {
      const curations = await client.curations.getEipCurations({ eipNumbers: [num] });
      if (curations.length > 0) {
        const cur = curations[0];
        setFeaturedDetails({
          number: num,
          title: cur.layman_title || `EIP-${num}`,
          summary: cur.layman_summary || "",
          benefits: cur.benefits || [],
          tradeoffs: cur.tradeoffs || [],
        });
        toast.success(`Curation loaded for EIP-${num}!`);
      } else {
        // Fallback info
        setFeaturedDetails({
          number: num,
          title: `EIP-${num}`,
          summary: "No layman summary curated yet.",
          benefits: [],
          tradeoffs: [],
        });
        toast.info(`No customized layman curation found; using default placeholders.`);
      }
    } catch {
      toast.error("Failed to query EIP curation details");
    } finally {
      setLoadingCuration(false);
    }
  };

  // Compile Markdown Content on demand
  const generateMarkdown = () => {
    if (!data) return "";

    const formattedDate = new Date(recapDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    let md = `# Ethereum Standards Weekly Recap - ${formattedDate}\n\n`;
    md += `Ethereum protocol upgrades, governance decisions, and EIP analysis — compiled directly from EIPsInsight.\n\n---\n\n`;

    // 1. STANDARDS IN MOTION
    md += `## 3.1 Standards in Motion\n\n`;
    
    // New EIPs/ERCs
    const selectedNew = data.newProposals.filter(p => selectedProposals[p.number]);
    if (selectedNew.length > 0) {
      md += `### 🆕 New Proposals Introduced\n`;
      selectedNew.forEach(p => {
        const typeStr = p.category ? `${p.category} ` : "";
        md += `- **[${p.status}] [${typeStr}EIP-${p.number}](https://eipsinsight.com/${p.category?.toLowerCase() === "erc" ? "erc" : "eip"}s/${p.number})**: ${p.title} *(Created ${formatDate(p.createdAt)})*\n`;
      });
      md += `\n`;
    }

    // Status Transitions
    const selectedTransition = data.statusChanges.filter(sc => selectedChanges[`${sc.number}-${sc.to}`]);
    if (selectedTransition.length > 0) {
      md += `### 🔄 Lifecycle & Status Changes\n`;
      selectedTransition.forEach(sc => {
        const typeStr = sc.category ? `${sc.category} ` : "";
        md += `- **[${typeStr}EIP-${sc.number}](https://eipsinsight.com/${sc.category?.toLowerCase() === "erc" ? "erc" : "eip"}s/${sc.number})**: Transitioned from \`${sc.from}\` ➔ \`${sc.to}\` *(Changed ${formatDate(sc.changedAt)})*\n`;
      });
      md += `\n`;
    }

    // Merged PRs
    const selectedMerged = data.mergedPRs.filter(pr => selectedPRs[pr.number]);
    if (selectedMerged.length > 0) {
      md += `### 🪵 Recently Merged Pull Requests\n`;
      selectedMerged.forEach(pr => {
        md += `- **[PR #${pr.number}](https://eipsinsight.com/pr/${pr.repoName}/${pr.number})**: ${pr.title} *(Merged ${formatDate(pr.mergedAt)} by @${pr.author})*\n`;
      });
      md += `\n`;
    }

    if (selectedNew.length === 0 && selectedTransition.length === 0 && selectedMerged.length === 0) {
      md += `*No standards activity selected for this week.*\n\n`;
    }

    // 2. GOVERNANCE & UPGRADE WATCH
    md += `## 3.2 Governance & Upgrade Watch\n\n`;
    
    // Call Decisions
    const selectedCallData = data.recentCalls.filter(c => selectedCalls[`${c.series}-${c.number}`]);
    if (selectedCallData.length > 0) {
      md += `### 🗣️ Core Dev Calls Highlights\n`;
      selectedCallData.forEach(c => {
        md += `#### ${c.displayName || `${c.series} #${c.number}`} *(Occurred ${formatDate(c.occurredOn)})*\n`;
        if (c.tldr) {
          md += `* **Summary:** ${c.tldr}\n`;
        }
        if (c.keyDecisions && Array.isArray(c.keyDecisions)) {
          md += `* **Key Decisions:**\n`;
          (c.keyDecisions as string[]).forEach(dec => {
            md += `  - ${dec}\n`;
          });
        }
        md += `\n`;
      });
    }

    if (manualAcdHighlights.trim()) {
      md += `### 💡 Governance Notes\n${manualAcdHighlights}\n\n`;
    }

    // Devnets
    const selectedDevnetData = data.devnets.filter(d => selectedDevnets[d.id]);
    if (selectedDevnetData.length > 0) {
      md += `### 🧪 Devnets & Testnet Progression\n`;
      selectedDevnetData.forEach(d => {
        md += `- **[${d.active ? "Active" : "Closed"}] [${d.series.toUpperCase()} Devnet ${d.number}](https://eipsinsight.com/upgrade/devnets/${d.id})**: ${d.title} *(Scraped ${formatDate(d.scrapedAt)})*\n`;
      });
      md += `\n`;
    }

    // 3. FEATURED PROPOSAL
    if (featuredDetails) {
      md += `## 3.3 Featured Proposal: EIP-${featuredDetails.number}\n\n`;
      md += `### 🔍 ${featuredDetails.title}\n\n`;
      if (featuredDetails.summary) {
        md += `**Problem and Technical Approach:**\n${featuredDetails.summary}\n\n`;
      }
      if (featuredDetails.benefits.length > 0) {
        md += `**Ecosystem Benefits:**\n`;
        featuredDetails.benefits.forEach(b => md += `- ${b}\n`);
        md += `\n`;
      }
      if (featuredDetails.tradeoffs.length > 0) {
        md += `**Design Tradeoffs:**\n`;
        featuredDetails.tradeoffs.forEach(t => md += `- ${t}\n`);
        md += `\n`;
      }
      md += `*Learn more on the detail page: [Read EIP-${featuredDetails.number} Observability Details](https://eipsinsight.com/eips/${featuredDetails.number})*\n\n`;
    }

    // 4. CONTRIBUTOR CORNER
    md += `## 3.4 Contributor Corner\n\n`;
    
    // Last Calls seeking review
    const selectedLast = data.lastCallEIPs.filter(lc => selectedLastCalls[lc.number]);
    if (selectedLast.length > 0) {
      md += `### 📢 EIPs in Last Call (Seeking final community review)\n`;
      selectedLast.forEach(lc => {
        md += `- **[EIP-${lc.number}](https://eipsinsight.com/eips/${lc.number})**: ${lc.title} (Review Deadline: \`${lc.deadline || "Immediate"}\`)\n`;
      });
      md += `\n`;
    }

    md += `* Check editor activities and contributions on the [Editors Leaderboard](https://eipsinsight.com/analytics/editors).\n\n`;

    // 5. WHAT TO WATCH NEXT WEEK
    md += `## 3.5 What to Watch Next Week\n\n`;
    const selectedUpcomingData = data.upcomingCalls.filter(c => selectedUpcoming[`${c.series}-${c.callNumber || c.issueNumber}`]);
    if (selectedUpcomingData.length > 0) {
      md += `### 🗓️ Scheduled Core Meetings & Office Hours\n`;
      selectedUpcomingData.forEach(c => {
        const timeStr = c.occursOn ? ` on \`${c.occursOn}\`` : "";
        md += `- **${c.title}**${timeStr} (Agenda issue: [#${c.issueNumber}](${c.issueUrl}))\n`;
      });
      md += `\n`;
    }

    if (watchNextWeek.trim()) {
      md += `${watchNextWeek}\n\n`;
    }

    // ROTATING SECTIONS
    if (spotlightInfo.trim()) {
      md += `## 4.1 Standards Spotlight\n\n${spotlightInfo}\n\n`;
    }
    if (enterpriseBrief.trim()) {
      md += `## 4.2 Enterprise Brief: Why This Matters to Businesses\n\n${enterpriseBrief}\n\n`;
    }
    if (ecosystemAdoption.trim()) {
      md += `## 4.3 Ecosystem Adoption & Implementations\n\n${ecosystemAdoption}\n\n`;
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    if (!md) {
      toast.error("No data available to compile");
      return;
    }
    navigator.clipboard.writeText(md);
    toast.success("Markdown compiled and copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Gathering weekly metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      {/* ── Subheader ── */}
      <section className="border-b border-border bg-card/60">
        <div className="page-shell py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
                <Shield className="h-3.5 w-3.5" />
                Admin Console
              </div>
              <h1 className="dec-title persona-title mt-3 text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Weekly Recap Generator
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Evaluate standards, ACD calls, and devnets, then compile and copy the recap markdown.
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Link href="/admin">
                <Button variant="outline" className="border-border hover:bg-muted">
                  <ChevronLeft className="mr-1.5 h-4 w-4" /> Back to Dashboard
                </Button>
              </Link>
              <Button onClick={handleCopyMarkdown} className="bg-primary hover:bg-primary/95 text-black font-semibold shadow-md">
                <Copy className="mr-1.5 h-4 w-4" /> Copy Recap Markdown
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="page-shell py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Metadata */}
          <div className="rounded-xl border border-border bg-card/40 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Recap Date</label>
                <input 
                  type="date" 
                  value={recapDate} 
                  onChange={e => setRecapDate(e.target.value)} 
                  className={inputClass} 
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadData} variant="outline" className="w-full border-border hover:bg-muted">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh Database Signals
                </Button>
              </div>
            </div>
          </div>

          {/* 3.1 Standards in Motion */}
          <div className="rounded-xl border border-border bg-card/40 p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Flame className="h-5 w-5 text-orange-500" /> 3.1 Standards in Motion
            </h2>
            
            {/* New proposals */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Proposals Introductions (Last 7 Days)</h3>
              {data?.newProposals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No new proposals introduced in this window.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.newProposals.map(p => (
                    <div key={p.number} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <button 
                        type="button"
                        onClick={() => setSelectedProposals(prev => ({ ...prev, [p.number]: !prev[p.number] }))} 
                        className="text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {selectedProposals[p.number] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="text-sm flex-1 flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mr-2 bg-background/80 text-[10px] py-0">{p.status}</Badge>
                          <span className="font-semibold text-foreground">EIP-{p.number}:</span> {p.title}
                          <span className="text-xs text-muted-foreground ml-2">({formatDate(p.createdAt)})</span>
                        </div>
                        <a href={getProposalLink(p)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Transitions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifecycle & Status Changes</h3>
              {data?.statusChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No status transitions found.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.statusChanges.map(sc => {
                    const key = `${sc.number}-${sc.to}`;
                    return (
                      <div key={key} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                        <button 
                          type="button"
                          onClick={() => setSelectedChanges(prev => ({ ...prev, [key]: !prev[key] }))} 
                          className="text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          {selectedChanges[key] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                        <div className="text-sm flex-1 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">EIP-{sc.number}</span> transitioned from <Badge variant="outline" className="bg-background">{sc.from}</Badge> ➔ <Badge className="bg-primary/25 text-primary">{sc.to}</Badge> ({sc.title})
                            <span className="text-xs text-muted-foreground ml-2">({formatDate(sc.changedAt)})</span>
                          </div>
                          <a href={getProposalLink(sc)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Merged PRs */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recently Merged PRs</h3>
              {data?.mergedPRs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No recently merged pull requests.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.mergedPRs.map(pr => (
                    <div key={pr.number} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <button 
                        type="button"
                        onClick={() => setSelectedPRs(prev => ({ ...prev, [pr.number]: !prev[pr.number] }))} 
                        className="text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {selectedPRs[pr.number] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="text-sm flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground">PR #{pr.number}:</span> {pr.title} <span className="text-xs text-muted-foreground">by @{pr.author}</span>
                          <span className="text-xs text-muted-foreground ml-2">({formatDate(pr.mergedAt)})</span>
                        </div>
                        <a href={getPRLink(pr)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3.2 Governance & Upgrade Watch */}
          <div className="rounded-xl border border-border bg-card/40 p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Layers className="h-5 w-5 text-indigo-500" /> 3.2 Governance & Upgrade Watch
            </h2>

            {/* Recent calls decisions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent ACD Meetings & Decisions</h3>
              {data?.recentCalls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No recent core developer calls recorded.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.recentCalls.map(c => {
                    const key = `${c.series}-${c.number}`;
                    return (
                      <div key={key} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                        <button 
                          type="button"
                          onClick={() => setSelectedCalls(prev => ({ ...prev, [key]: !prev[key] }))} 
                          className="text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          {selectedCalls[key] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                        <div className="text-sm flex-1 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{c.displayName || `${c.series} #${c.number}`}</p>
                            {c.tldr && <p className="text-xs text-muted-foreground mt-0.5">{String(c.tldr)}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1">Happened: {formatDate(c.occurredOn)}</p>
                          </div>
                          <a href={getCallLink({ series: c.series, number: c.number || "" })} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold ml-2">[Check]</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Manual highlights */}
            <div className="space-y-1.5 pt-4 border-t border-border/60">
              <label className={labelClass}>Manual Call Highlights / Decisions</label>
              <textarea 
                value={manualAcdHighlights} 
                onChange={e => setManualAcdHighlights(e.target.value)} 
                placeholder="Include custom bullet points, notes, or specific decisions discussed during AllCoreDevs..." 
                className="w-full h-24 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none resize-y"
              />
            </div>

            {/* Devnets */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Devnets Progression</h3>
              {data?.devnets.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No active devnet updates found.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.devnets.map(d => (
                    <div key={d.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <button 
                        type="button"
                        onClick={() => setSelectedDevnets(prev => ({ ...prev, [d.id]: !prev[d.id] }))} 
                        className="text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {selectedDevnets[d.id] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="text-sm flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground">{d.series.toUpperCase()} Devnet {d.number}:</span> {d.title} <Badge className={d.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}>{d.active ? "Active" : "Closed"}</Badge>
                          <span className="text-xs text-muted-foreground ml-2">({formatDate(d.scrapedAt)})</span>
                        </div>
                        <a href={getDevnetLink(d.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3.3 Featured Proposal */}
          <div className="rounded-xl border border-border bg-card/40 p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <BookOpen className="h-5 w-5 text-emerald-500" /> 3.3 Featured Proposal
            </h2>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  placeholder="Enter EIP or ERC number (e.g. 7702)" 
                  value={featuredEipNumber} 
                  onChange={e => setFeaturedEipNumber(e.target.value)} 
                  className="w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 py-2 text-sm outline-none"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button onClick={handleLoadCuration} disabled={loadingCuration} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                {loadingCuration ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Curation"}
              </Button>
            </div>

            {featuredDetails && (
              <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Featured EIP details loaded</p>
                  <a href={getProposalLink({ category: "EIP", number: featuredDetails.number })} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                </div>
                <h4 className="text-sm font-bold text-white">EIP-{featuredDetails.number}: {featuredDetails.title}</h4>
                {featuredDetails.summary ? (
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">{featuredDetails.summary}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No summary found in database curations.</p>
                )}
              </div>
            )}
          </div>

          {/* 3.4 Contributor Corner & 3.5 Watch Next Week */}
          <div className="rounded-xl border border-border bg-card/40 p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Calendar className="h-5 w-5 text-yellow-500" /> 3.4 Contributor Corner & 3.5 What to Watch
            </h2>
            
            {/* Last Calls */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">EIPs Currently in Last Call</h3>
              {data?.lastCallEIPs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No EIPs in Last Call this week.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.lastCallEIPs.map(lc => (
                    <div key={lc.number} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <button 
                        type="button"
                        onClick={() => setSelectedLastCalls(prev => ({ ...prev, [lc.number]: !prev[lc.number] }))} 
                        className="text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {selectedLastCalls[lc.number] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="text-sm flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground">EIP-{lc.number}:</span> {lc.title} <span className="text-xs text-orange-400">(Deadline: {lc.deadline || "Immediate"})</span>
                        </div>
                        <a href={getProposalLink({ category: "EIP", number: lc.number })} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Check]</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming calls schedule */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scheduled Meetings & Calls</h3>
              {data?.upcomingCalls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No scheduled calls found.</p>
              ) : (
                <div className="grid gap-2">
                  {data?.upcomingCalls.map(c => {
                    const key = `${c.series}-${c.callNumber || c.issueNumber}`;
                    return (
                      <div key={key} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                        <button 
                          type="button"
                          onClick={() => setSelectedUpcoming(prev => ({ ...prev, [key]: !prev[key] }))} 
                          className="text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          {selectedUpcoming[key] ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </button>
                        <div className="text-sm flex-1 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{c.title}</span> {c.occursOn ? `on ${c.occursOn}` : ""}
                          </div>
                          {c.issueUrl && (
                            <a href={c.issueUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold">[Agenda]</a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Manual watch notes */}
            <div className="space-y-1.5 pt-4 border-t border-border/60">
              <label className={labelClass}>Manual Schedule / What to Watch Next Week</label>
              <textarea 
                value={watchNextWeek} 
                onChange={e => setWatchNextWeek(e.target.value)} 
                placeholder="Include custom deadlines, upcoming AMAs, specific PRs to watch..." 
                className="w-full h-24 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none resize-y"
              />
            </div>
          </div>

          {/* Optional Rotating Sections */}
          <div className="rounded-xl border border-border bg-card/40 p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <FileText className="h-5 w-5 text-sky-500" /> 4. Optional Rotating Sections
            </h2>

            <div className="space-y-1.5">
              <label className={labelClass}>4.1 Standards Spotlight (Author/Editor Feature)</label>
              <textarea 
                value={spotlightInfo} 
                onChange={e => setSpotlightInfo(e.target.value)} 
                placeholder="Spotlight an author, editor, active reviewer or ecosystem contributor..." 
                className="w-full h-20 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none resize-y"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <label className={labelClass}>4.2 Enterprise Brief</label>
              <textarea 
                value={enterpriseBrief} 
                onChange={e => setEnterpriseBrief(e.target.value)} 
                placeholder="Explain the business or enterprise impact of this week's upgrades..." 
                className="w-full h-20 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none resize-y"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <label className={labelClass}>4.3 Ecosystem Adoption</label>
              <textarea 
                value={ecosystemAdoption} 
                onChange={e => setEcosystemAdoption(e.target.value)} 
                placeholder="Highlight projects adopting or implementing recently finalized standards..." 
                className="w-full h-20 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:border-primary/50 outline-none resize-y"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">Select and input items, then click compile to copy.</p>
            <Button onClick={handleCopyMarkdown} className="bg-primary hover:bg-primary/95 text-black font-semibold px-6 shadow-md">
              <Copy className="mr-1.5 h-4 w-4" /> Copy Recap Markdown
            </Button>
          </div>

        </div>
      </div>

    </div>
  );
}
