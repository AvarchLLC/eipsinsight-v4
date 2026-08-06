'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Server,
  Package,
  Clock,
  ShieldCheck,
  FileCode,
  Users,
  Building2,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Network,
  ArrowRight,
  TrendingUp,
  Landmark,
  Coins,
  Wallet,
  ClipboardCheck,
  Scale,
  MessageSquarePlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ProposalData {
  repo: string;
  number: number;
  title: string;
  authors: string[];
  created: string | null;
  type: string | null;
  category: string | null;
  status: string;
}

interface UpgradeInclusion {
  upgrade_id: number;
  name: string;
  slug: string;
  bucket: string;
  commit_date: string | null;
  layer?: string | null;
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

interface EnterpriseEIPBriefProps {
  proposal: ProposalData;
  upgrades: UpgradeInclusion[];
  statusEvents: StatusEvent[];
  governanceState: GovernanceState | null;
  proposalRequires: number[];
}

interface EnterpriseImpactCard {
  title: string;
  description: string;
  Icon: LucideIcon;
  color: 'amber' | 'blue' | 'emerald' | 'violet' | 'slate';
}

const CARD_COLORS = {
  amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/8', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
  blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/8', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/8', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
  violet: { border: 'border-violet-500/20', bg: 'bg-violet-500/8', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-500' },
  slate: { border: 'border-slate-500/20', bg: 'bg-slate-500/8', text: 'text-slate-600 dark:text-slate-300', icon: 'text-slate-400' },
} as const;

function computeEnterpriseImpactScore(proposal: ProposalData, upgrades: UpgradeInclusion[]): number {
  let score = 0;
  if (proposal.type === 'Standards Track') score += proposal.category === 'Core' ? 25 : 15;
  else if (proposal.type === 'Meta') score += 15;
  if (proposal.category === 'Core') score += 20;
  if (upgrades.some((u) => u.bucket.toLowerCase() === 'included')) score += 20;
  else if (upgrades.some((u) => u.bucket.toLowerCase() === 'scheduled')) score += 15;
  else if (upgrades.some((u) => u.bucket.toLowerCase() === 'considered')) score += 10;
  if (proposal.status === 'Final') score += 15;
  else if (proposal.status === 'Last Call') score += 10;
  else if (proposal.status === 'Review') score += 5;
  return Math.max(0, Math.min(100, score));
}

function getImpactScoreMeta(score: number) {
  if (score >= 76) return { label: 'Strategic', textColor: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-500/12', borderColor: 'border-violet-500/30' };
  if (score >= 51) return { label: 'Significant', textColor: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-500/12', borderColor: 'border-amber-500/30' };
  if (score >= 21) return { label: 'Moderate', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-500/12', borderColor: 'border-blue-500/30' };
  return { label: 'Low', textColor: 'text-slate-600 dark:text-slate-300', bgColor: 'bg-slate-500/12', borderColor: 'border-slate-500/30' };
}

function getEnterpriseRisk(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const isCore = proposal.category === 'Core';
  const hasActive = upgrades.some((u) => ['included', 'scheduled'].includes(u.bucket.toLowerCase()));
  if (isCore && hasActive) return { level: 'Medium', color: 'text-amber-700 dark:text-amber-300', note: 'Infrastructure updates may be required' };
  if (isCore) return { level: 'Low–Medium', color: 'text-blue-700 dark:text-blue-300', note: 'Core proposal, upgrade not yet confirmed' };
  if (proposal.status === 'Final') return { level: 'Low', color: 'text-emerald-700 dark:text-emerald-300', note: 'Stable standard, low operational risk' };
  return { level: 'Low', color: 'text-emerald-700 dark:text-emerald-300', note: 'Limited infrastructure impact' };
}

function getEnterpriseAction(proposal: ProposalData, upgrades: UpgradeInclusion[]): string {
  const isCore = proposal.category === 'Core';
  const included = upgrades.find((u) => u.bucket.toLowerCase() === 'included');
  const scheduled = upgrades.find((u) => u.bucket.toLowerCase() === 'scheduled');
  if (isCore && included) return `Validate node compatibility for ${included.name}`;
  if (isCore && scheduled) return `Monitor ${scheduled.name} readiness timeline`;
  if (isCore) return 'Monitor for upgrade assignment';
  if (proposal.status === 'Last Call') return 'Review before standard finalizes';
  if (proposal.status === 'Final') return 'Assess application-layer compatibility';
  return 'Monitor for status changes';
}

function getEnterpriseImpactCards(proposal: ProposalData, upgrades: UpgradeInclusion[]): EnterpriseImpactCard[] {
  const isCore = proposal.category === 'Core';
  const hasUpgrade = upgrades.length > 0;
  const isFinal = proposal.status === 'Final';
  const firstUpgrade = upgrades[0];

  if (isCore) {
    return [
      { title: 'Consensus Change', description: 'Modifies core Ethereum protocol rules directly', Icon: Zap, color: 'amber' },
      { title: 'Infrastructure', description: 'Node operators and RPC providers may need software updates', Icon: Server, color: 'blue' },
      hasUpgrade
        ? { title: firstUpgrade.name, description: `Assigned: ${formatInclusionBucket(firstUpgrade.bucket)}`, Icon: Package, color: 'emerald' }
        : { title: 'Upgrade Pending', description: 'Not yet assigned to a network upgrade', Icon: Clock, color: 'slate' },
      { title: 'Multi-Client', description: 'All Ethereum clients must adopt simultaneously', Icon: ShieldCheck, color: 'violet' },
    ];
  }

  return [
    { title: 'Application Standard', description: 'Defines a cross-app interface or behavior standard', Icon: FileCode, color: 'blue' },
    {
      title: isFinal ? 'Finalized' : 'In Progress',
      description: isFinal ? 'Stable and broadly adopted' : 'Still under development and review',
      Icon: ShieldCheck,
      color: isFinal ? 'emerald' : 'amber',
    },
    { title: 'No Node Updates', description: 'Validators and node operators are not affected', Icon: Server, color: 'emerald' },
    { title: 'Developer Facing', description: 'Impacts wallet providers and application developers', Icon: Users, color: 'violet' },
  ];
}

function getSimplifiedTechOverview(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const isCore = proposal.category === 'Core';
  const included = upgrades.find((u) => u.bucket.toLowerCase() === 'included');
  return [
    {
      topic: 'What changes?',
      explanation: isCore
        ? `Modifies Ethereum ${proposal.category?.toLowerCase() ?? 'protocol'} layer execution rules`
        : `Defines a new ${proposal.type?.toLowerCase() ?? 'application'} standard`,
    },
    {
      topic: 'Who is impacted?',
      explanation: isCore
        ? 'Client teams, validators, node operators, RPC providers'
        : 'App developers, wallet providers, DeFi protocols',
    },
    { topic: 'Consensus-critical?', explanation: isCore ? 'Yes - all clients must implement simultaneously' : 'No - protocol rules unchanged' },
    { topic: 'App changes needed?', explanation: isCore ? 'Usually no - transparent to applications' : 'Possibly - if integrating this standard' },
    {
      topic: 'Infrastructure updates?',
      explanation: isCore
        ? included ? `Yes - required before ${included.name} activation` : 'Possibly - monitor client updates'
        : 'No - infrastructure unaffected',
    },
  ];
}

function getStakeholders(proposal: ProposalData) {
  const isCore = proposal.category === 'Core';
  if (isCore) {
    return [
      { stakeholder: 'Client Teams', role: 'Implement protocol changes', icon: FileCode },
      { stakeholder: 'Researchers', role: 'Design and verify proposals', icon: Activity },
      { stakeholder: 'Validators', role: 'Adopt network upgrade', icon: ShieldCheck },
      { stakeholder: 'Rollups / L2s', role: 'Consume scaling improvements', icon: Network },
      { stakeholder: 'Infrastructure Providers', role: 'Support APIs & tooling', icon: Server },
    ];
  }
  return [
    { stakeholder: 'Smart Contract Devs', role: 'Implement the interface', icon: FileCode },
    { stakeholder: 'Wallet Providers', role: 'Support new token/account standard', icon: ShieldCheck },
    { stakeholder: 'DApps / DeFi', role: 'Integrate standard for user interactions', icon: Network },
    { stakeholder: 'Tooling Providers', role: 'Provide SDKs for the standard', icon: Server },
  ];
}

function getRiskHeatmap(proposal: ProposalData) {
  const isCore = proposal.category === 'Core';
  return [
    { area: 'Security', impact: isCore ? 'Medium' : 'High', color: isCore ? 'text-amber-500' : 'text-red-500' },
    { area: 'Infrastructure', impact: isCore ? 'High' : 'Low', color: isCore ? 'text-red-500' : 'text-emerald-500' },
    { area: 'Compliance', impact: 'Low', color: 'text-emerald-500' },
    { area: 'Performance', impact: isCore ? 'High Positive' : 'Neutral', color: isCore ? 'text-violet-500' : 'text-slate-500' },
    { area: 'Operational Complexity', impact: isCore ? 'Medium' : 'Low', color: isCore ? 'text-amber-500' : 'text-emerald-500' },
  ];
}

function getActionItemsByTeam(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const isCore = proposal.category === 'Core';
  const included = upgrades.find((u) => u.bucket.toLowerCase() === 'included');

  return [
    {
      team: 'Infrastructure Teams',
      actions: isCore
        ? [
            included ? `Validate node compatibility for ${included.name}` : 'Monitor for upgrade inclusion',
            'Review RPC endpoint changes',
          ]
        : ['No immediate action required (Application-layer standard)'],
    },
    {
      team: 'Product Teams',
      actions: isCore
        ? ['Evaluate potential cost reductions or new capabilities', 'No smart contract changes typically required']
        : ['Evaluate standard for future roadmap integration', 'Review reference implementations'],
    },
    {
      team: 'Strategy / Leadership',
      actions: [
        'Understand long-term ecosystem direction',
        isCore ? 'Align with Ethereum scaling roadmap' : 'Monitor market adoption of this standard',
      ],
    },
  ];
}

interface LifecycleStage {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  date: string | null;
  detail: string | null;
}

function getGovernanceLifecycle(statusEvents: StatusEvent[], upgrades: UpgradeInclusion[]): LifecycleStage[] {
  const stages = [
    { id: 'draft', label: 'Draft', description: 'Initial proposal submission' },
    { id: 'proposed', label: 'Proposed', description: 'Review & Last Call stages' },
    { id: 'cfi', label: 'CFI', description: 'Considered for Inclusion' },
    { id: 'sfi', label: 'SFI', description: 'Scheduled for Inclusion' },
    { id: 'included', label: 'Included', description: 'Activated in network upgrade' },
  ];

  const draftEvent = statusEvents.find(e => e.to?.toLowerCase() === 'draft');
  const proposedEvent = statusEvents.find(e => ['review', 'last call'].includes(e.to?.toLowerCase()));
  const cfiUpgrade = upgrades.find(u => ['considered', 'cfi'].includes(u.bucket.toLowerCase()));
  const sfiUpgrade = upgrades.find(u => ['scheduled', 'sfi'].includes(u.bucket.toLowerCase()));
  const includedUpgrade = upgrades.find(u => u.bucket.toLowerCase() === 'included');

  return stages.map(stage => {
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    let date: string | null = null;
    let detail: string | null = null;

    if (stage.id === 'draft' && draftEvent) {
      status = 'completed';
      date = draftEvent.changed_at;
    } else if (stage.id === 'proposed' && proposedEvent) {
      status = 'completed';
      date = proposedEvent.changed_at;
    } else if (stage.id === 'cfi' && cfiUpgrade) {
      status = 'completed';
      date = cfiUpgrade.commit_date;
      detail = cfiUpgrade.name;
    } else if (stage.id === 'sfi' && sfiUpgrade) {
      status = 'completed';
      date = sfiUpgrade.commit_date;
      detail = sfiUpgrade.name;
    } else if (stage.id === 'included' && includedUpgrade) {
      status = 'completed';
      date = includedUpgrade.commit_date;
      detail = includedUpgrade.name;
    }

    return { ...stage, status, date, detail };
  });
}

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

// ─── EEA enterprise framework (finance-audience lens) ────────────────────────
// Heuristic mapping of a proposal to the EEA's five-point institutional
// framework: Status · Affected organizations · Business impact · Risk &
// readiness · Participation. Deliberately conservative — flags relevance and
// what to review, not definitive advice.

type Relevance = 'high' | 'medium' | 'low';
const REL_META: Record<Relevance, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400' },
  medium: { label: 'Medium', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
};

function analyzeProposal(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const isCore = proposal.category === 'Core';
  const layer = upgrades.find((u) => u.layer)?.layer ?? null;
  const t = `${proposal.title} ${proposal.category ?? ''} ${proposal.type ?? ''}`.toLowerCase();
  const touchesAccounting = /\b(log|event|transfer|balance|receipt|trace|withdraw)/.test(t);
  const touchesStaking = isCore && (layer === 'consensus' || /(validator|stake|withdraw|deposit|attest|proposer|builder|block)/.test(t));
  const touchesCost = isCore && (layer === 'execution' || /(gas|calldata|blob|fee|data availability|throughput|access list)/.test(t));
  const touchesCensorship = /(inclusion|censorship|focil|list)/.test(t);
  return { isCore, layer, touchesAccounting, touchesStaking, touchesCost, touchesCensorship };
}

const rel = (high: boolean, med: boolean): Relevance => (high ? 'high' : med ? 'medium' : 'low');

function getFinanceStakeholders(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const a = analyzeProposal(proposal, upgrades);
  return [
    { role: 'Banks & payment providers', icon: Landmark, affected: rel(a.touchesCensorship, a.isCore || a.touchesCost), why: 'Settlement finality, transaction-inclusion guarantees, and processing costs.' },
    { role: 'Auditors & accountants', icon: ClipboardCheck, affected: rel(a.touchesAccounting, !a.isCore), why: a.touchesAccounting ? 'Changes how on-chain movements are recorded/indexed — affects reconciliation & audit trails.' : 'May affect how assets and events are evidenced for reporting.' },
    { role: 'Asset managers', icon: Coins, affected: rel(!a.isCore, a.touchesCost), why: 'Product/asset behavior, client offerings, and cost of on-chain operations.' },
    { role: 'Custodians & wallets', icon: Wallet, affected: rel(!a.isCore || a.touchesStaking, a.isCore), why: 'Key management, account/withdrawal semantics, and asset handling.' },
    { role: 'Staking providers', icon: ShieldCheck, affected: rel(a.touchesStaking, a.isCore), why: 'Validator operations, rewards, timing, and withdrawal flows.' },
    { role: 'Infrastructure operators', icon: Server, affected: rel(a.isCore, false), why: 'Node/RPC software updates and operational readiness.' },
    { role: 'L2-using companies', icon: Network, affected: rel(a.touchesCost, a.isCore), why: 'Data-availability and fee impacts flow into L2 transaction costs.' },
    { role: 'Digital-asset advisors', icon: Users, affected: rel(false, true), why: 'Client guidance on roadmap, risk, and readiness.' },
  ] as Array<{ role: string; icon: LucideIcon; affected: Relevance; why: string }>;
}

function getBusinessImpact(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const a = analyzeProposal(proposal, upgrades);
  return [
    { label: 'Assets & client offerings', icon: Coins, note: a.isCore ? 'Indirect — capabilities and limits of on-chain products may shift.' : 'Direct — defines a new asset/account behavior clients may adopt.' },
    { label: 'Costs & transaction processing', icon: TrendingUp, note: a.touchesCost ? 'May change gas / data-availability costs and throughput.' : 'Limited direct cost impact expected.' },
    { label: 'Accounting & reporting', icon: ClipboardCheck, note: a.touchesAccounting ? 'Alters how movements/events are recorded and indexed on-chain.' : 'Minimal reporting change expected.' },
    { label: 'Controls & compliance', icon: Scale, note: a.touchesCensorship ? 'Review inclusion/censorship assumptions and monitoring controls.' : 'Review internal controls and monitoring for the changed behavior.' },
    { label: 'Operational procedures', icon: Server, note: a.isCore ? 'Runbooks for node, validator, or custody flows may need updates.' : 'Integration and testing work for engineering teams.' },
  ] as Array<{ label: string; icon: LucideIcon; note: string }>;
}

function getParticipation(proposal: ProposalData, upgrades: UpgradeInclusion[]) {
  const included = upgrades.find((u) => u.bucket.toLowerCase() === 'included');
  const sfi = upgrades.find((u) => ['scheduled', 'sfi'].includes(u.bucket.toLowerCase()));
  const status = (proposal.status ?? '').toLowerCase();
  if (included || status === 'final' || status === 'living') {
    return { state: 'Settled', open: false, note: 'Shipped or finalized — feedback now is about implementation experience, not inclusion.' };
  }
  if (sfi) {
    return { state: 'Scheduled — narrowing', open: true, note: `Scheduled for ${sfi.name}. Scope is largely set, but testing and readiness feedback is still valuable.` };
  }
  return { state: 'Open for feedback', open: true, note: 'Still proposed or under consideration — a meaningful window to shape the outcome.' };
}

export function EnterpriseEIPBrief({ proposal, upgrades, statusEvents, governanceState, proposalRequires }: EnterpriseEIPBriefProps) {
  const enterpriseScore = computeEnterpriseImpactScore(proposal, upgrades);
  const enterpriseScoreMeta = getImpactScoreMeta(enterpriseScore);
  const enterpriseRisk = getEnterpriseRisk(proposal, upgrades);
  const enterpriseAction = getEnterpriseAction(proposal, upgrades);
  const lifecycle = getGovernanceLifecycle(statusEvents, upgrades);
  
  const latestUpgrade = upgrades.find((u) => u.bucket.toLowerCase() === 'included') ?? upgrades[0] ?? null;
  const isCore = proposal.category === 'Core';

  // Mark the "current" stage in lifecycle
  const currentIdx = lifecycle.reduce((acc, stage, idx) => stage.status === 'completed' ? idx : acc, 0);
  lifecycle[currentIdx].status = 'current';

  // EEA five-point framework (finance-audience lens)
  const financeStakeholders = getFinanceStakeholders(proposal, upgrades);
  const businessImpact = getBusinessImpact(proposal, upgrades);
  const participation = getParticipation(proposal, upgrades);
  const currentBucket = latestUpgrade?.bucket ? formatInclusionBucket(latestUpgrade.bucket) : null;

  return (
    <motion.div
      id="enterprise-brief"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 my-8"
    >
      {/* 1. Executive Summary (Banner + Quick Snapshot) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-violet-500/20 p-2 text-violet-600 dark:text-violet-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-violet-800 dark:text-violet-300">Executive Briefing</h2>
              <p className="text-xs text-violet-600/80 dark:text-violet-400/80">Business & Operational Impact Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-violet-500/20">
            <span className="text-xs text-muted-foreground font-medium">Enterprise Relevance:</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm", enterpriseScoreMeta.bgColor, enterpriseScoreMeta.textColor, enterpriseScoreMeta.borderColor, "border")}>
              {enterpriseScoreMeta.label}
            </span>
          </div>
        </div>

        {/* EEA Enterprise Assessment — the five-point institutional framework */}
        <div className="overflow-hidden rounded-xl border border-violet-500/25 bg-card/60 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/60 bg-violet-500/5 px-5 py-3">
            <Scale className="h-4 w-4 text-violet-500" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">EEA Enterprise Assessment</p>
            <span className="ml-auto text-[10px] text-muted-foreground/70">Status · Affected orgs · Business impact · Risk &amp; readiness · Participation</span>
          </div>
          <div className="divide-y divide-border/50">
            {/* 1. Status */}
            <div className="px-5 py-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><CheckCircle2 className="h-3.5 w-3.5" /> 1 · Status</p>
              <p className="text-sm text-foreground">
                {currentBucket ? (
                  <>Currently <span className="font-semibold">{currentBucket}</span>{latestUpgrade?.name ? <> in <span className="font-semibold">{latestUpgrade.name}</span></> : null} · proposal status <span className="font-semibold">{proposal.status}</span>.</>
                ) : (
                  <>Not yet assigned to a network upgrade · proposal status <span className="font-semibold">{proposal.status}</span>.</>
                )}
              </p>
            </div>

            {/* 2. Affected organizations */}
            <div className="px-5 py-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><Building2 className="h-3.5 w-3.5" /> 2 · Affected organizations</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {financeStakeholders.map((s) => {
                  const meta = REL_META[s.affected];
                  return (
                    <div key={s.role} className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2.5">
                      <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">{s.role}</span>
                          <span className={cn('shrink-0 rounded-full border px-1.5 py-px text-[9px] font-bold uppercase', meta.cls)}>{meta.label}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Business impact */}
            <div className="px-5 py-3.5">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><TrendingUp className="h-3.5 w-3.5" /> 3 · Business impact</p>
              <ul className="space-y-1.5">
                {businessImpact.map((b) => (
                  <li key={b.label} className="flex items-start gap-2 text-xs">
                    <b.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span><span className="font-semibold text-foreground">{b.label}:</span> <span className="text-muted-foreground">{b.note}</span></span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Risk & readiness */}
            <div className="px-5 py-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><AlertTriangle className="h-3.5 w-3.5" /> 4 · Risk &amp; readiness</p>
              <p className="text-sm"><span className={cn('font-semibold', enterpriseRisk.color)}>{enterpriseRisk.level} risk</span> <span className="text-muted-foreground">— {enterpriseRisk.note}.</span></p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">What to review internally:</span> {enterpriseAction} Track testing via the upgrade&apos;s <span className="text-foreground/80">test-complexity</span> and <span className="text-foreground/80">devnet-inclusion</span> pages, and client readiness under <span className="text-foreground/80">client-priority</span>.
              </p>
            </div>

            {/* 5. Participation */}
            <div className="px-5 py-3.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><MessageSquarePlus className="h-3.5 w-3.5" /> 5 · Participation</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', participation.open ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-border bg-muted/50 text-muted-foreground')}>{participation.state}</span>
                <span className="text-xs text-muted-foreground">{participation.note}</span>
              </div>
              {participation.open && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">Institutions can route consolidated, anonymized feedback to the EIP authors and protocol contributors via the EEA.</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Snapshot */}
        <div className="overflow-hidden rounded-xl border border-border bg-card/60 shadow-sm">
            <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" /> Quick Snapshot
              </p>
            </div>
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-border/50">
                {([
                  { label: 'Purpose', value: proposal.title, colorClass: undefined },
                  { label: 'Status', value: proposal.status, colorClass: undefined },
                  { label: 'Network Upgrade', value: latestUpgrade?.name ?? 'Not assigned', colorClass: undefined },
                  {
                    label: 'Layer',
                    value: isCore
                      ? latestUpgrade?.layer === 'consensus'
                        ? 'Consensus Layer (CL)'
                        : latestUpgrade?.layer === 'execution'
                          ? 'Execution Layer (EL)'
                          : 'Core protocol'
                      : 'Application Layer',
                    colorClass: undefined
                  },
                  { label: 'Risk Level', value: `${enterpriseRisk.level} - ${enterpriseRisk.note}`, colorClass: enterpriseRisk.color },
                  { label: 'Action Required', value: enterpriseAction, colorClass: undefined },
                ] as { label: string; value: string; colorClass?: string }[]).map(({ label, value, colorClass }) => (
                  <tr key={label} className="hover:bg-muted/20 transition-colors">
                    <td className="w-40 bg-muted/10 px-5 py-3 align-top text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</td>
                    <td className={cn("px-5 py-3 text-sm font-medium", colorClass ?? 'text-foreground')}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      </div>

      {/* 3. Governance & Upgrade Lifecycle */}
      <div className="rounded-xl border border-border bg-card/60 shadow-sm overflow-hidden">
        <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Network className="h-3.5 w-3.5" /> Governance & Upgrade Lifecycle
            </p>
            {governanceState?.days_since_last_action && (
              <span className="text-[10px] text-muted-foreground font-medium">
                Last activity: {governanceState.days_since_last_action} days ago
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="relative flex justify-between">
            {/* Connecting lines */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted z-0" />
            <div 
              className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 z-0" 
              style={{ width: `${(currentIdx / (lifecycle.length - 1)) * 100}%` }}
            />
            
            {lifecycle.map((stage, i) => (
              <div key={stage.id} className="relative z-10 flex flex-col items-center group">
                <div className={cn(
                  "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background",
                  stage.status === 'completed' && "border-primary bg-primary text-primary-foreground",
                  stage.status === 'current' && "border-primary ring-4 ring-primary/20",
                  stage.status === 'upcoming' && "border-muted text-muted-foreground"
                )}>
                  {stage.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-xs font-bold",
                    stage.status === 'upcoming' ? "text-muted-foreground" : "text-foreground"
                  )}>{stage.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                    {stage.description}
                  </p>
                  {stage.date && (
                    <p className="text-[9px] text-primary font-mono mt-1 font-semibold">
                      {new Date(stage.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                    </p>
                  )}
                  {stage.detail && (
                    <p className="text-[9px] text-violet-500 font-bold mt-0.5 uppercase tracking-tighter">
                      {stage.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related dependencies (real — from the EIP's `requires`) */}
      {proposalRequires.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 shadow-sm overflow-hidden">
          <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="h-3.5 w-3.5" /> Related dependencies
            </p>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {proposalRequires.map(r => (
                <Link
                  key={r}
                  href={`/eips/${r}`}
                  className="inline-flex items-center gap-1 rounded bg-violet-500/10 hover:bg-violet-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-violet-600 dark:text-violet-400 border border-violet-500/20 transition-colors"
                >
                  <Package className="h-2.5 w-2.5" />
                  EIP-{r}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Prerequisites and foundational standards this proposal builds on.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

