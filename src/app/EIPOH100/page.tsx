"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Users,
  GitPullRequest,
  Trophy,
  Activity,
  Clock,
  ArrowRight,
  Zap,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  GitMerge,
  Eye,
  LayoutDashboard,
  BarChart3,
  Info,
  FileText,
  Network,
  ArrowUpDown,
  BookOpen,
  X,
  PartyPopper,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { client } from "@/lib/orpc";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorEntry = {
  editor: string;
  prsReviewed: number;
  totalEvents: number;
  reviews: number;
  comments: number;
  merges: number;
};

type HourlyActivity = {
  hour: string;
  prsChecked: number;
  totalEvents: number;
};

type HourlyByType = {
  hour: string;
  repoType: string;
  prsChecked: number;
};

type StatusChange = {
  fromStatus: string;
  toStatus: string;
  proposalType: string;
  count: number;
  label: string;
};

type RecentActivity = {
  kind: "status_change" | "pr_event";
  occurredAt: Date;
  eip: string;
  eipType: string;
  title: string;
  fromStatus: string | null;
  toStatus: string | null;
  actor: string;
  repository: string;
  prNumber: string | null;
  eventType: string | null;
  eventUrl: string | null;
  days: number;
};

type ProposalBreakdown = {
  category: string;
  proposalType: string;
  status: string;
  prsChecked: number;
};

type PRListItem = {
  prNumber: number;
  repoName: string;
  repoType: string;
  title: string;
  state: string;
  mergedAt: string | null;
  editors: string[];
  reviews: number;
  comments: number;
  merges: number;
  eipNumbers: number[];
  githubUrl: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_DATE = "2025-06-02";
const BLITZ_START_HOUR_UTC = 15;   // hourly bucket filter (catches 15:30+ data)
const BLITZ_END_HOUR_UTC   = 18;
const EXCLUDED_ACTORS = new Set(["abcoathup", "eip-review-bot"]);

const BLITZ_CONFETTI_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ef4444", "#f97316", "#a3e635",
];

const TYPE_SERIES_COLORS: Record<string, string> = {
  eips: "#6366f1",
  ercs: "#10b981",
  rips: "#f59e0b",
};
const TYPE_LABELS: Record<string, string> = {
  eips: "EIPs",
  ercs: "ERCs",
  rips: "RIPs",
};

const STATUS_CHANGE_COLORS: Record<string, string> = {
  "Draft → Review": "#6366f1",
  "Review → Last Call": "#f59e0b",
  "Last Call → Final": "#10b981",
  "Draft → Final": "#10b981",
  "Draft → Withdrawn": "#ef4444",
  "Review → Withdrawn": "#ef4444",
  default: "#94a3b8",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function editorAvatar(actor: string) {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(actor)}?s=96&d=identicon`;
}

function formatEditorAction(eventType: string) {
  const map: Record<string, string> = {
    reviewed: "reviewed",
    commented: "commented",
    issue_comment: "commented",
    labeled: "labeled",
    unlabeled: "removed label",
    merged: "merged",
    approved: "approved",
    changes_requested: "requested changes",
  };
  return map[eventType?.toLowerCase()] || (eventType ?? "").replace(/_/g, " ");
}

function formatHourLabel(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

function relativeTime(dt: Date | string) {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function repoTagStyle(eipType: string): { label: string; cls: string } {
  const t = eipType.toUpperCase().replace(/S$/, "");
  if (t === "ERC") return { label: "ERCs", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" };
  if (t === "RIP") return { label: "RIPs", cls: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" };
  return { label: "EIPs", cls: "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-400" };
}

function sprintProgress() {
  const now = new Date();
  const startUTC = new Date(now);
  startUTC.setUTCHours(16, 0, 0, 0);
  const endUTC = new Date(now);
  endUTC.setUTCHours(BLITZ_END_HOUR_UTC, 0, 0, 0);

  if (now < startUTC) {
    const diff = startUTC.getTime() - now.getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return { pct: 0, remaining: `Starts in ${h}h ${m}m`, status: "upcoming" as const };
  }
  if (now >= endUTC) {
    return { pct: 100, remaining: "Sprint complete", status: "complete" as const };
  }
  const pct = ((now.getTime() - startUTC.getTime()) / (endUTC.getTime() - startUTC.getTime())) * 100;
  const remaining = endUTC.getTime() - now.getTime();
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  return { pct, remaining: `${h}h ${m}m left in sprint`, status: "active" as const };
}

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return useMemo(() => ({
    mutedFg: isDark ? "oklch(0.708 0 0)" : "oklch(0.5 0.02 260)",
    border: isDark ? "oklch(1 0 0 / 12%)" : "oklch(0.88 0.02 250)",
    fg: isDark ? "oklch(0.985 0 0)" : "oklch(0.2 0.02 260)",
    card: isDark ? "oklch(0.205 0 0)" : "oklch(1 0 0)",
  }), [isDark]);
}

// ─── Tooltip helper ──────────────────────────────────────────────────────────

function Tip({ text, side = "top" }: { text: string; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 flex-shrink-0 cursor-default text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" />
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p className="max-w-[220px] leading-snug">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Countdown ring ──────────────────────────────────────────────────────────

function CountdownRing({ seconds, total = 60 }: { seconds: number; total?: number }) {
  const r = 8;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - seconds / total);
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90 flex-shrink-0">
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" className="stroke-emerald-500/20" />
      <circle
        cx="10" cy="10" r={r} fill="none" strokeWidth="2.5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-emerald-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  );
}

// ─── Podium card ─────────────────────────────────────────────────────────────

function PodiumCard({ entry, rank, max, delay }: {
  entry: EditorEntry; rank: 1 | 2 | 3; max: number; delay: number;
}) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
  const baseHeights = { 1: "h-[80px]", 2: "h-[56px]", 3: "h-[44px]" } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`flex flex-col items-center gap-2 rounded-xl border bg-card p-3 shadow-sm ${
        rank === 1 ? "border-amber-400/50 shadow-amber-400/10 dark:border-amber-400/40" : "border-border"
      }`}
    >
      <div className="relative">
        <div className={`overflow-hidden rounded-full ring-2 ${rank === 1 ? "h-14 w-14 ring-amber-400/60" : "h-10 w-10 ring-border"}`}>
          <Image src={editorAvatar(entry.editor)} alt={entry.editor} width={rank === 1 ? 56 : 40} height={rank === 1 ? 56 : 40} className="h-full w-full object-cover" />
        </div>
        <span className="absolute -bottom-1 -right-1 text-base leading-none">{medals[rank]}</span>
      </div>
      <div className="text-center">
        <p className={`truncate font-semibold text-foreground ${rank === 1 ? "max-w-[100px] text-sm" : "max-w-[84px] text-xs"}`}>
          {entry.editor}
        </p>
        <p className={`tabular-nums font-bold text-primary ${rank === 1 ? "text-2xl" : "text-lg"}`}>
          {entry.prsReviewed}
          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">PRs</span>
        </p>
        <div className="mt-0.5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <span title="Reviews"><Eye className="inline h-2.5 w-2.5" /> {entry.reviews}</span>
          <span title="Comments"><MessageSquare className="inline h-2.5 w-2.5" /> {entry.comments}</span>
          {entry.merges > 0 && <span title="Merges"><GitMerge className="inline h-2.5 w-2.5" /> {entry.merges}</span>}
        </div>
      </div>
      <div className={`w-full rounded-md border border-border bg-muted ${baseHeights[rank]}`} />
    </motion.div>
  );
}

// ─── Blitz Start Animation ────────────────────────────────────────────────────

const PARTICLES = [
  { x: "-120px", y: "-140px", delay: 0 },
  { x: "130px",  y: "-150px", delay: 0.1 },
  { x: "-160px", y: "60px",   delay: 0.18 },
  { x: "170px",  y: "70px",   delay: 0.08 },
  { x: "20px",   y: "-180px", delay: 0.25 },
  { x: "-50px",  y: "160px",  delay: 0.15 },
  { x: "90px",   y: "150px",  delay: 0.22 },
  { x: "-200px", y: "-30px",  delay: 0.05 },
];

function BlitzStartAnimation({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md"
      onClick={onDismiss}
    >
      {/* Expanding pulse rings */}
      {[0, 0.5, 1].map((delay, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-72 w-72 rounded-full border border-violet-500/50"
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ duration: 2.5, delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute select-none text-xl"
          style={{ x: 0, y: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }}
          transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
        >
          ⚡
        </motion.span>
      ))}

      {/* Card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.08 }}
        className="relative z-10 mx-4 flex flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/95 to-black/95 px-12 py-10 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, -12, 14, -8, 0], scale: [1, 1.35, 1.35, 1.1, 1] }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="mb-5 text-7xl leading-none select-none"
        >
          ⚡
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl"
        >
          BLITZ STARTED
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-2 text-base font-medium text-white/60"
        >
          {label}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.62 }}
          className="mt-1 text-sm text-white/40"
        >
          16:00 – 18:00 UTC · Sprint is live
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          onClick={onDismiss}
          className="mt-8 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 transition-all"
        >
          Let&apos;s Sprint 🚀
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-3 text-[11px] text-white/25"
        >
          Auto-dismisses in 6 seconds · click anywhere to close
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─── Window size hook (for react-confetti) ───────────────────────────────────

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

// ─── Blitz Complete Animation (confetti + summary dialog) ────────────────────

type BlitzSummary = {
  totalPRs: number;
  totalActions: number;
  reviews: number;
  comments: number;
  merges: number;
  activeEditors: number;
  topEditors: Array<{ editor: string; prsReviewed: number }>;
  statusChanges: number;
  topRepo: string;
};

function BlitzCompleteAnimation({ label, summary, onDismiss }: {
  label: string;
  summary: BlitzSummary;
  onDismiss: () => void;
}) {
  const { width, height } = useWindowSize();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      {/* react-confetti */}
      {width > 0 && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={350}
          recycle={false}
          gravity={0.18}
          initialVelocityY={14}
          colors={BLITZ_CONFETTI_COLORS}
          style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none", zIndex: 101 }}
        />
      )}

      {/* Summary dialog */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
        className="relative z-10 mx-4 w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/97 to-black/97 p-7 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <motion.div
            animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1.3, 1.1, 1] }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mb-3 inline-block text-6xl select-none"
          >
            🎉
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 bg-clip-text text-4xl font-black tracking-tight text-transparent"
          >
            BLITZ COMPLETE!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-1 text-sm text-white/50"
          >
            {label} · 16:00 – 18:00 UTC
          </motion.p>
        </div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-5 grid grid-cols-3 gap-3"
        >
          {[
            { label: "PRs Reviewed", value: summary.totalPRs, icon: "📋" },
            { label: "Editor Actions", value: summary.totalActions, icon: "⚡" },
            { label: "Active Editors", value: summary.activeEditors, icon: "👤" },
          ].map(({ label: l, value, icon }) => (
            <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-2xl">{icon}</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-white">{value}</div>
              <div className="text-[10px] text-white/40">{l}</div>
            </div>
          ))}
        </motion.div>

        {/* Action breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mb-5 flex justify-center gap-4 text-xs text-white/50"
        >
          <span>👁 {summary.reviews} reviews</span>
          <span className="text-white/20">·</span>
          <span>💬 {summary.comments} comments</span>
          <span className="text-white/20">·</span>
          <span>⬆ {summary.merges} merges</span>
        </motion.div>

        {/* Top editors podium */}
        {summary.topEditors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-5"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Top Editors</p>
            <div className="space-y-2">
              {summary.topEditors.slice(0, 3).map((e, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={e.editor} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                    <span className="text-base">{medals[i]}</span>
                    <span className="flex-1 text-sm font-medium text-white">{e.editor}</span>
                    <span className="text-xs font-bold tabular-nums text-white/60">{e.prsReviewed} PRs</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Footer stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/35"
        >
          <span>{summary.statusChanges} status change{summary.statusChanges !== 1 ? "s" : ""} today</span>
          {summary.topRepo && <span>Most active: {summary.topRepo.toUpperCase()}</span>}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onDismiss}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-cyan-500 transition-all"
        >
          <PartyPopper className="mr-1.5 inline h-4 w-4" />
          Great sprint, everyone!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EIPOH100Page() {
  const today = new Date().toISOString().slice(0, 10);
  const displayDate = today === EVENT_DATE ? EVENT_DATE : today;
  const blitzLabel = `EIP/ERC Blitz · ${new Date(displayDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const [leaderboard, setLeaderboard] = useState<EditorEntry[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [hourlyByType, setHourlyByType] = useState<HourlyByType[]>([]);
  const [statusChanges, setStatusChanges] = useState<StatusChange[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [sprint, setSprint] = useState(sprintProgress());
  const [expandedFeed, setExpandedFeed] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [showBlitzAnim, setShowBlitzAnim] = useState(false);
  const [showBlitzComplete, setShowBlitzComplete] = useState(false);
  const [proposalBreakdown, setProposalBreakdown] = useState<ProposalBreakdown[]>([]);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [prList, setPRList] = useState<PRListItem[]>([]);
  const [prListLoading, setPRListLoading] = useState(false);
  const [prFilter, setPRFilter] = useState<"all" | "eips" | "ercs" | "rips">("all");
  const prevSprintStatus = React.useRef(sprint.status);

  const chartColors = useChartColors();

  const fetchData = useCallback(async () => {
    try {
      const [editors, hourly, byType, changes, activity, breakdown] = await Promise.all([
        client.analytics.getEventDayEditorLeaderboard({ date: displayDate }),
        client.analytics.getEventDayActivity({ date: displayDate }),
        client.analytics.getEventDayHourlyByType({ date: displayDate }),
        client.analytics.getEventDayStatusChanges({ date: displayDate }),
        client.analytics.getAllRecentActivity({ limit: 10 }),
        client.analytics.getEventDayProposalBreakdown({ date: displayDate, startHour: 15.5, endHour: BLITZ_END_HOUR_UTC }),
      ]);
      setLeaderboard(editors as EditorEntry[]);
      setHourlyActivity(hourly);
      setHourlyByType(byType);
      setStatusChanges(changes);
      setRecentActivity(activity as typeof recentActivity);
      setProposalBreakdown(breakdown);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("EIPOH100 fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [displayDate]);

  const openPRDialog = useCallback(async () => {
    setShowPRDialog(true);
    if (prList.length > 0) return;
    setPRListLoading(true);
    try {
      const data = await client.analytics.getEventDayPRList({ date: displayDate });
      setPRList(data as PRListItem[]);
    } catch (err) {
      console.error("PR list fetch error:", err);
    } finally {
      setPRListLoading(false);
    }
  }, [displayDate, prList.length]);

  useEffect(() => {
    fetchData();
    setCountdown(60);
    let remaining = 60;

    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      const next = sprintProgress();
      setSprint(next);
      if (prevSprintStatus.current === "upcoming" && next.status === "active") {
        setShowBlitzAnim(true);
      }
      if (prevSprintStatus.current === "active" && next.status === "complete") {
        setShowBlitzComplete(true);
      }
      prevSprintStatus.current = next.status;
      if (remaining <= 0) {
        remaining = 60;
        setCountdown(60);
        fetchData();
      }
    }, 1_000);

    return () => clearInterval(tick);
  }, [fetchData]);

  // ─── 15:30 UTC predicate (used by all charts) ───────────────────────────
  const afterBlitzStart = useCallback(
    (isoHour: string) => new Date(isoHour).getUTCHours() >= BLITZ_START_HOUR_UTC,
    []
  );

  // ─── Derived stats ──────────────────────────────────────────────────────
  const blitzHourly = useMemo(
    () => hourlyActivity.filter(h => afterBlitzStart(h.hour)),
    [hourlyActivity, afterBlitzStart]
  );
  const totalPRs = useMemo(() => blitzHourly.reduce((s, h) => s + h.prsChecked, 0), [blitzHourly]);
  const actionBreakdown = useMemo(() => ({
    reviews:  leaderboard.reduce((s, e) => s + e.reviews, 0),
    comments: leaderboard.reduce((s, e) => s + e.comments, 0),
    merges:   leaderboard.reduce((s, e) => s + e.merges, 0),
    total:    leaderboard.reduce((s, e) => s + e.totalEvents, 0),
  }), [leaderboard]);

  // ─── Blitz summary (used by complete animation) ─────────────────────────
  const blitzSummary = useMemo<BlitzSummary>(() => {
    const typeMap = new Map<string, number>();
    hourlyByType.filter(r => afterBlitzStart(r.hour))
      .forEach(r => typeMap.set(r.repoType, (typeMap.get(r.repoType) ?? 0) + r.prsChecked));
    const topRepoEntry = [...typeMap.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      totalPRs,
      totalActions: actionBreakdown.total,
      reviews: actionBreakdown.reviews,
      comments: actionBreakdown.comments,
      merges: actionBreakdown.merges,
      activeEditors: leaderboard.length,
      topEditors: leaderboard.slice(0, 3).map(e => ({ editor: e.editor, prsReviewed: e.prsReviewed })),
      statusChanges: statusChanges.reduce((s, c) => s + c.count, 0),
      topRepo: topRepoEntry?.[0] ?? "",
    };
  }, [totalPRs, actionBreakdown, leaderboard, statusChanges, hourlyByType, afterBlitzStart]);

  // ─── Filtered recent activity (exclude bots / associate editors) ─────────
  const filteredActivity = useMemo(
    () => recentActivity
      .filter(a => !EXCLUDED_ACTORS.has(a.actor))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [recentActivity]
  );

  // ─── ECharts: hourly bar — data from 16:00 UTC only ────────────────────
  const barOption = useMemo(() => {
    const hours = blitzHourly.map(h => formatHourLabel(h.hour));
    const values = blitzHourly.map(h => h.prsChecked);
    const { mutedFg, border, fg, card } = chartColors;
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: card, borderColor: border, textStyle: { color: fg, fontSize: 12 },
        formatter: (p: Array<{ name: string; value: number }>) =>
          `<div style="padding:4px 6px"><b>${p[0]?.name}</b><br/>PRs checked: <strong>${p[0]?.value ?? 0}</strong></div>`,
      },
      grid: { left: 32, right: 12, top: 8, bottom: 28 },
      xAxis: {
        type: "category", data: hours,
        axisLabel: { color: mutedFg, fontSize: 11 },
        axisLine: { lineStyle: { color: border } }, splitLine: { show: false },
      },
      yAxis: {
        type: "value", minInterval: 1,
        axisLabel: { color: mutedFg, fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: "dashed" } },
      },
      series: [{
        type: "bar", data: values, barMaxWidth: 36,
        itemStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "#6366f1" }, { offset: 1, color: "#6366f155" }] },
          borderRadius: [4, 4, 0, 0],
        },
      }],
    };
  }, [blitzHourly, chartColors]);

  // ─── ECharts: line by type — data from 16:00 UTC only ─────────────────
  const lineOption = useMemo(() => {
    const blitzByType = hourlyByType.filter(r => afterBlitzStart(r.hour));
    const allHours = Array.from(new Set(blitzByType.map(r => r.hour))).sort();
    const types = Array.from(new Set(blitzByType.map(r => r.repoType)));
    const hourLabels = allHours.map(formatHourLabel);
    const { mutedFg, border, fg, card } = chartColors;
    const series = types.map(type => {
      const dataMap = new Map(blitzByType.filter(r => r.repoType === type).map(r => [r.hour, r.prsChecked]));
      const color = TYPE_SERIES_COLORS[type] ?? "#94a3b8";
      return {
        name: TYPE_LABELS[type] ?? type.toUpperCase(),
        type: "line", smooth: true, symbol: "circle", symbolSize: 5,
        data: allHours.map(h => dataMap.get(h) ?? 0),
        lineStyle: { width: 2.5, color }, itemStyle: { color },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: `${color}40` }, { offset: 1, color: `${color}05` }] } },
      };
    });
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", backgroundColor: card, borderColor: border, textStyle: { color: fg, fontSize: 12 } },
      legend: { data: types.map(t => TYPE_LABELS[t] ?? t.toUpperCase()), textStyle: { color: mutedFg, fontSize: 11 }, top: 0, right: 0 },
      grid: { left: 32, right: 12, top: 28, bottom: 28 },
      xAxis: { type: "category", data: hourLabels, boundaryGap: false,
        axisLabel: { color: mutedFg, fontSize: 11 }, axisLine: { lineStyle: { color: border } }, splitLine: { show: false } },
      yAxis: { type: "value", minInterval: 1,
        axisLabel: { color: mutedFg, fontSize: 11 }, splitLine: { lineStyle: { color: border, type: "dashed" } } },
      series,
    };
  }, [hourlyByType, afterBlitzStart, chartColors]);

  // ─── Derived: repo-type totals for donut — 15:30 UTC only ───────────────
  const typeComparison = useMemo(() => {
    const totals = new Map<string, number>();
    hourlyByType
      .filter(r => afterBlitzStart(r.hour))
      .forEach(({ repoType, prsChecked }) => totals.set(repoType, (totals.get(repoType) ?? 0) + prsChecked));
    return Array.from(totals.entries()).map(([repoType, value]) => ({ repoType, value })).sort((a, b) => b.value - a.value);
  }, [hourlyByType, afterBlitzStart]);

  const pieOption = useMemo(() => {
    const { mutedFg, fg, card, border } = chartColors;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", backgroundColor: card, borderColor: border, textStyle: { color: fg, fontSize: 12 },
        formatter: (p: { name: string; value: number; percent: number }) =>
          `<div style="padding:4px 8px"><b>${p.name}</b><br/>${p.value} PRs &mdash; ${p.percent}%</div>` },
      legend: { orient: "vertical", right: 8, top: "center", textStyle: { color: mutedFg, fontSize: 11 }, itemWidth: 10, itemHeight: 10, itemGap: 10 },
      series: [{ type: "pie", radius: ["44%", "70%"], center: ["38%", "50%"],
        data: typeComparison.map(item => ({
          name: TYPE_LABELS[item.repoType] ?? item.repoType.toUpperCase(),
          value: item.value,
          itemStyle: { color: TYPE_SERIES_COLORS[item.repoType] ?? "#94a3b8" },
        })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold", color: fg },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.15)" } },
        itemStyle: { borderRadius: 5, borderColor: card, borderWidth: 2 },
      }],
    };
  }, [typeComparison, chartColors]);

  // ─── ECharts: status changes horizontal bar ──────────────────────────────
  const statusChangesOption = useMemo(() => {
    const { mutedFg, border, fg, card } = chartColors;
    const sorted = [...statusChanges].sort((a, b) => a.count - b.count);
    const labels = sorted.map(s => s.label);
    const values = sorted.map(s => s.count);
    const colors = sorted.map(s => STATUS_CHANGE_COLORS[s.label] ?? STATUS_CHANGE_COLORS.default);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: card, borderColor: border, textStyle: { color: fg, fontSize: 12 },
        formatter: (p: Array<{ name: string; value: number }>) =>
          `<div style="padding:4px 6px"><b>${p[0]?.name}</b><br/>Changes: <strong>${p[0]?.value ?? 0}</strong></div>` },
      grid: { left: 110, right: 24, top: 8, bottom: 8, containLabel: false },
      xAxis: { type: "value", minInterval: 1,
        axisLabel: { color: mutedFg, fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: "dashed" } } },
      yAxis: { type: "category", data: labels,
        axisLabel: { color: mutedFg, fontSize: 11, width: 100, overflow: "truncate" },
        axisLine: { lineStyle: { color: border } } },
      series: [{ type: "bar", data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 24 }],
    };
  }, [statusChanges, chartColors]);

  // ─── ECharts: proposal breakdown (category + status) ───────────────────
  const breakdownOption = useMemo(() => {
    const { mutedFg, border, fg, card } = chartColors;

    // Group by status for the left chart
    const byStatus = new Map<string, number>();
    proposalBreakdown.forEach(r => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.prsChecked));
    const statusEntries = [...byStatus.entries()].sort((a, b) => b[1] - a[1]);

    // Group by category for the right chart
    const byCategory = new Map<string, number>();
    proposalBreakdown.forEach(r => {
      const cat = r.category === "ERC" ? "ERC" : r.category || r.proposalType;
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + r.prsChecked);
    });
    const catEntries = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

    const STATUS_COLORS_MAP: Record<string, string> = {
      Draft: "#64748b", Review: "#f59e0b", "Last Call": "#f97316",
      Final: "#10b981", Living: "#22d3ee", Stagnant: "#6b7280",
      Withdrawn: "#ef4444", Unknown: "#94a3b8",
    };

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", backgroundColor: card, borderColor: border, textStyle: { color: fg, fontSize: 12 } },
      grid: [
        { left: "5%", right: "55%", top: 24, bottom: 8 },
        { left: "55%", right: "5%", top: 24, bottom: 8 },
      ],
      xAxis: [
        { gridIndex: 0, type: "value", minInterval: 1, axisLabel: { color: mutedFg, fontSize: 10 }, splitLine: { lineStyle: { color: border, type: "dashed" } } },
        { gridIndex: 1, type: "value", minInterval: 1, axisLabel: { color: mutedFg, fontSize: 10 }, splitLine: { lineStyle: { color: border, type: "dashed" } } },
      ],
      yAxis: [
        { gridIndex: 0, type: "category", data: statusEntries.map(e => e[0]), axisLabel: { color: mutedFg, fontSize: 10 }, axisLine: { lineStyle: { color: border } } },
        { gridIndex: 1, type: "category", data: catEntries.map(e => e[0]), axisLabel: { color: mutedFg, fontSize: 10 }, axisLine: { lineStyle: { color: border } } },
      ],
      series: [
        {
          type: "bar", xAxisIndex: 0, yAxisIndex: 0, barMaxWidth: 20, name: "By Status",
          data: statusEntries.map(([s, v]) => ({ value: v, itemStyle: { color: STATUS_COLORS_MAP[s] ?? "#94a3b8", borderRadius: [0, 4, 4, 0] } })),
        },
        {
          type: "bar", xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 20, name: "By Category",
          data: catEntries.map(([, v], i) => ({
            value: v,
            itemStyle: { color: ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316"][i % 6], borderRadius: [0, 4, 4, 0] },
          })),
        },
      ],
    };
  }, [proposalBreakdown, chartColors]);

  // ─── Render ────────────────────────────────────────────────────────────
  const feedVisible = expandedFeed ? filteredActivity : filteredActivity.slice(0, 6);

  return (
    <TooltipProvider>
    <AnimatePresence>
      {showBlitzAnim && (
        <BlitzStartAnimation label={blitzLabel} onDismiss={() => setShowBlitzAnim(false)} />
      )}
      {showBlitzComplete && (
        <BlitzCompleteAnimation label={blitzLabel} summary={blitzSummary} onDismiss={() => setShowBlitzComplete(false)} />
      )}
    </AnimatePresence>
    <div className="min-h-screen bg-background">
      <div className="page-shell py-8">

        {/* ── Header ── */}
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="dec-title persona-title text-3xl font-semibold tracking-tight sm:text-4xl">
                  {blitzLabel}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">
                  Live editor sprint dashboard · Refreshes every 60s
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <button
                type="button"
                onClick={openPRDialog}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <GitPullRequest className="h-3.5 w-3.5" />View PRs
              </button>
              <button
                type="button"
                onClick={() => { fetchData(); setCountdown(60); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-[11px] font-medium text-emerald-700 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                <CountdownRing seconds={countdown} />
                <span className="tabular-nums">Refresh · {countdown}s</span>
              </button>
            </div>
          </div>

          {/* Sprint progress */}
          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sprint Progress
                </span>
                {sprint.status === "upcoming" && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-px text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    Not started
                  </span>
                )}
                {sprint.status === "complete" && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    Complete
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{sprint.remaining}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${sprint.status === "complete" ? "from-emerald-500 to-cyan-500" : "from-violet-500 to-indigo-500"}`}
                initial={{ width: 0 }} animate={{ width: `${sprint.pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              16:00 UTC → 18:00 UTC · All metrics and charts reflect data within this window only
            </p>
          </div>
        </motion.header>

        {/* ── Stat cards ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              <GitPullRequest className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">PRs Reviewed</span>
              <Tip text="Distinct PRs touched by editors during the 16:00–18:00 UTC blitz window." />
            </div>
            {loading ? <div className="h-8 w-14 animate-pulse rounded-md bg-muted" /> :
              <p className="text-2xl font-bold tabular-nums text-foreground">{totalPRs}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.17 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Editors</span>
              <Tip text="Editors with at least one action during the blitz. Excludes bots and associate editors." />
            </div>
            {loading ? <div className="h-8 w-14 animate-pulse rounded-md bg-muted" /> :
              <p className="text-2xl font-bold tabular-nums text-foreground">{leaderboard.length}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Editor Actions</span>
              <Tip text="Total events (reviews, comments, merges) logged by canonical editors during the blitz." />
            </div>
            {loading ? <div className="h-8 w-14 animate-pulse rounded-md bg-muted" /> : (
              <>
                <p className="text-2xl font-bold tabular-nums text-foreground">{actionBreakdown.total}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { icon: Eye, count: actionBreakdown.reviews, label: "reviews", tip: "PR reviews, approvals, and change requests" },
                    { icon: MessageSquare, count: actionBreakdown.comments, label: "comments", tip: "PR comments and issue comments" },
                    { icon: GitMerge, count: actionBreakdown.merges, label: "merges", tip: "Merged pull requests" },
                  ].map(({ icon: Icon, count, label, tip }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-default items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Icon className="h-3 w-3" />{count} {label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p>{tip}</p></TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* ── Main 3-column grid ── */}
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)]">

          {/* Col 1 — Leaderboard */}
          <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Trophy className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Editor Leaderboard</h2>
              <Tip text="Ranked by total actions. Bars show breakdown of reviews, comments, and merges." />
              <span className="ml-auto rounded-md border border-border bg-muted/60 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blitz only</span>
            </div>
            <div className="flex-1 p-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-4 animate-pulse rounded-full bg-muted" style={{ width: `${70 - i * 10}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground/25" />
                  <p className="text-xs font-medium text-muted-foreground">No activity during blitz window yet.</p>
                </div>
              ) : (() => {
                const maxTotal = Math.max(...leaderboard.map(e => e.totalEvents), 1);
                const medals: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
                return (
                  <div className="space-y-3">
                    {/* Legend */}
                    <div className="flex items-center gap-3 pb-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-indigo-500" />Reviews</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-violet-400" />Comments</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />Merges</span>
                    </div>
                    {leaderboard.map((entry, i) => {
                      const barPct = (entry.totalEvents / maxTotal) * 100;
                      const reviewPct  = entry.totalEvents > 0 ? (entry.reviews  / entry.totalEvents) * 100 : 0;
                      const commentPct = entry.totalEvents > 0 ? (entry.comments / entry.totalEvents) * 100 : 0;
                      const mergePct   = entry.totalEvents > 0 ? (entry.merges   / entry.totalEvents) * 100 : 0;
                      return (
                        <motion.div
                          key={entry.editor}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.06 }}
                          className="flex items-center gap-2.5"
                        >
                          {/* Avatar + medal */}
                          <div className="relative flex-shrink-0">
                            <div className={`overflow-hidden rounded-full ring-2 ${i === 0 ? "h-9 w-9 ring-amber-400/70" : "h-8 w-8 ring-border"}`}>
                              <Image src={editorAvatar(entry.editor)} alt={entry.editor} width={36} height={36} className="h-full w-full object-cover" />
                            </div>
                            {medals[i] && (
                              <span className="absolute -bottom-1 -right-1 text-[11px] leading-none">{medals[i]}</span>
                            )}
                          </div>

                          {/* Name + bar */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className={`truncate font-semibold text-foreground ${i === 0 ? "text-xs" : "text-[11px]"}`}>
                                {entry.editor}
                              </span>
                              <span className="flex-shrink-0 text-[11px] font-bold tabular-nums text-foreground">
                                {entry.totalEvents}
                                <span className="ml-0.5 font-normal text-muted-foreground">acts</span>
                              </span>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-5 w-full overflow-hidden rounded-full bg-muted cursor-default">
                                  <motion.div
                                    className="flex h-full rounded-full overflow-hidden"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barPct}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.06 + 0.1, ease: "easeOut" }}
                                  >
                                    {reviewPct > 0 && (
                                      <div className="h-full bg-indigo-500" style={{ width: `${reviewPct}%` }} />
                                    )}
                                    {commentPct > 0 && (
                                      <div className="h-full bg-violet-400" style={{ width: `${commentPct}%` }} />
                                    )}
                                    {mergePct > 0 && (
                                      <div className="h-full bg-emerald-500" style={{ width: `${mergePct}%` }} />
                                    )}
                                  </motion.div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">{entry.reviews} reviews · {entry.comments} comments · {entry.merges} merges · {entry.prsReviewed} PRs</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Col 2 — Charts */}
          <div className="flex flex-col gap-4">
            {/* Line chart */}
            <section className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">EIPs · ERCs · RIPs</h2>
                <Tip text="Distinct PRs checked per hour for each repo type during the blitz window." />
              </div>
              <div className="p-4">
                {loading ? <div className="h-[180px] animate-pulse rounded-lg bg-muted" /> :
                  blitzHourly.length === 0 ? (
                    <div className="flex h-[180px] items-center justify-center"><p className="text-xs text-muted-foreground">No data in blitz window yet.</p></div>
                  ) : (
                    <ReactECharts option={lineOption} style={{ height: 180, width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                  )}
              </div>
            </section>

            {/* Bar chart */}
            <section className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <GitPullRequest className="h-4 w-4 flex-shrink-0 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Hourly Activity</h2>
                <Tip text="Total PRs checked across all repos per hour since 16:00 UTC." />
              </div>
              <div className="p-4">
                {loading ? <div className="h-[180px] animate-pulse rounded-lg bg-muted" /> :
                  blitzHourly.length === 0 ? (
                    <div className="flex h-[180px] items-center justify-center"><p className="text-xs text-muted-foreground">No activity from 16:00 UTC yet.</p></div>
                  ) : (
                    <ReactECharts option={barOption} style={{ height: 180, width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                  )}
              </div>
            </section>
          </div>

          {/* Col 3 — Recent Activity (scrollable) */}
          <section className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <Tip text="Live feed of editor PR events and status changes. Bots and associate editors excluded." />
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />Live
              </span>
              <Link href="/analytics/prs" className="ml-auto inline-flex h-6 items-center gap-0.5 rounded-md border border-primary/30 bg-primary/10 px-2 text-[10px] font-medium text-primary transition-colors hover:bg-primary/15">
                Analytics<ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: "520px" }}>
              {loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[88px] animate-pulse rounded-lg bg-muted" />)}</div>
              ) : filteredActivity.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-xs text-muted-foreground">No recent activity.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {filteredActivity.map((item, idx) => {
                      const { label: repoLabel, cls: repoCls } = repoTagStyle(item.eipType);
                      const isStatusChange = item.kind === "status_change";
                      const href = isStatusChange
                        ? `/${item.eipType === "RIP" ? "rip" : item.eipType === "ERC" ? "erc" : "eip"}/${item.eip}`
                        : (item.eventUrl ?? `https://github.com/${item.repository}/pull/${item.prNumber}`);
                      const actionLabel = isStatusChange ? `${item.fromStatus ?? "—"} → ${item.toStatus}` : formatEditorAction(item.eventType ?? "");
                      const actionCls = isStatusChange ? "border-border bg-muted/60 text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary";
                      return (
                        <motion.div key={`${item.kind}-${item.eip}-${idx}`}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                          className="rounded-lg border border-border bg-background transition-colors hover:border-primary/40">
                          <div className="flex items-center gap-2 px-2.5 pt-2.5">
                            <div className="h-5 w-5 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                              <Image src={editorAvatar(item.actor)} alt={item.actor} width={20} height={20} className="h-full w-full object-cover" />
                            </div>
                            <span className="truncate text-[11px] font-semibold text-foreground">{item.actor}</span>
                            <span className={`flex-shrink-0 rounded border px-1 py-px text-[9px] font-medium ${actionCls}`}>{actionLabel}</span>
                            <span className="ml-auto flex-shrink-0 text-[9px] tabular-nums text-muted-foreground">{relativeTime(item.occurredAt)}</span>
                          </div>
                          <p className="line-clamp-1 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            {item.title || (isStatusChange ? `${item.eipType}-${item.eip}` : `PR #${item.prNumber}`)}
                          </p>
                          <div className="flex items-center gap-1.5 border-t border-border/50 px-2.5 py-1.5">
                            <span className={`rounded border px-1 py-px text-[9px] font-medium ${repoCls}`}>{repoLabel}</span>
                            <span className="text-[9px] text-muted-foreground">{isStatusChange ? `${item.eipType}-${item.eip}` : `PR #${item.prNumber}`}</span>
                            <a href={href} target={isStatusChange ? undefined : "_blank"} rel={isStatusChange ? undefined : "noopener noreferrer"}
                              className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">
                              View<ArrowRight className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Secondary charts row ── */}
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          {/* Status Changes */}
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Status Changes Today</h2>
              <Tip text="EIP/ERC/RIP proposals that moved between governance statuses (e.g. Draft → Review) during the blitz." />
            </div>
            <div className="p-4">
              {loading ? <div className="h-[160px] animate-pulse rounded-lg bg-muted" /> :
                statusChanges.length === 0 ? (
                  <div className="flex h-[120px] items-center justify-center"><p className="text-xs text-muted-foreground">No status changes recorded today.</p></div>
                ) : (
                  <ReactECharts option={statusChangesOption}
                    style={{ height: Math.max(120, statusChanges.length * 34), width: "100%" }}
                    opts={{ renderer: "svg" }} notMerge />
                )}
            </div>
          </section>

          {/* Repo Distribution */}
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Activity className="h-4 w-4 flex-shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Activity by Repo</h2>
              <Tip text="Share of blitz-window PRs checked, broken down by ethereum/EIPs, ethereum/ERCs, and ethereum/RIPs." />
            </div>
            <div className="p-4">
              {loading ? <div className="h-[180px] animate-pulse rounded-lg bg-muted" /> :
                typeComparison.length === 0 ? (
                  <div className="flex h-[180px] items-center justify-center"><p className="text-xs text-muted-foreground">No data in blitz window yet.</p></div>
                ) : (
                  <>
                    <ReactECharts option={pieOption} style={{ height: 160, width: "100%" }} opts={{ renderer: "svg" }} notMerge />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {typeComparison.map(item => {
                        const { label, cls } = repoTagStyle(item.repoType);
                        const total = typeComparison.reduce((s, i) => s + i.value, 0);
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                          <div key={item.repoType} className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_SERIES_COLORS[item.repoType] ?? "#94a3b8" }} />
                            {label} <span className="font-bold tabular-nums">{item.value}</span>
                            <span className="text-[10px] opacity-60">({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
            </div>
          </section>

          {/* Proposal Breakdown — category + status */}
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Proposals by Status &amp; Category</h2>
              <Tip text="For PRs reviewed during the blitz: left bars show the current status of those proposals, right bars show their category (ERC, Standards Track, Meta, etc.)." />
            </div>
            <div className="p-4">
              {loading ? <div className="h-[160px] animate-pulse rounded-lg bg-muted" /> :
                proposalBreakdown.length === 0 ? (
                  <div className="flex h-[120px] items-center justify-center"><p className="text-xs text-muted-foreground">No linked proposal data yet.</p></div>
                ) : (
                  <ReactECharts option={breakdownOption}
                    style={{ height: Math.max(140, Math.max(
                      new Set(proposalBreakdown.map(r => r.status)).size,
                      new Set(proposalBreakdown.map(r => r.category)).size
                    ) * 28 + 32), width: "100%" }}
                    opts={{ renderer: "svg" }} notMerge />
                )}
            </div>
          </section>
        </div>

        {/* ── Developer Quick Access ── */}
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Developer Quick Access</p>
            <Tip text="Key analytics and tooling links for developers following EIP/ERC governance." side="right" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {([
              { key: "prs",      href: "/analytics/prs",          icon: GitPullRequest, title: "Pull Request Insights",       cta: "Explore PRs",       blurb: "Track PR flow, reviews, and governance movement." },
              { key: "eips",     href: "/analytics/eips",         icon: FileText,       title: "EIP Analytics",               cta: "Explore EIPs",      blurb: "Analyze proposal activity and lifecycle progress." },
              { key: "upgrades", href: "/upgrade",                 icon: Network,        title: "Network Upgrades",            cta: "Explore Upgrades",  blurb: "Follow upgrade timelines and protocol rollout context." },
              { key: "editors",  href: "/analytics/editors",       icon: Trophy,         title: "Editors Insights",            cta: "Explore Editors",   blurb: "View editorial workload and contribution metrics." },
              { key: "board",    href: "/board",                   icon: LayoutDashboard, title: "PR Board",                   cta: "Open Board",        blurb: "Review queue, governance states, and PR assignments." },
              { key: "monthly",  href: "/insights",                icon: ArrowUpDown,    title: "Monthly Insights",            cta: "Explore Monthly",   blurb: "Open month-by-month standards and governance insights." },
            ] as const).map(({ key, href, icon: Icon, title, cta, blurb }) => (
              <Link
                key={key}
                href={href}
                className="group rounded-lg border border-border bg-card px-3 py-3 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
              >
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {cta}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>

    {/* ── PR List Dialog ── */}
    <Dialog open={showPRDialog} onOpenChange={(open) => { setShowPRDialog(open); if (!open) { setPRList([]); setPRFilter("all"); } }}>
      <DialogContent className="max-h-[85vh] w-full max-w-3xl flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              PRs Reviewed
              {!prListLoading && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {prList.filter(p => prFilter === "all" || p.repoType === prFilter).length}
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {(["all", "eips", "ercs", "rips"] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPRFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    prFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {prListLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading PRs…
            </div>
          ) : prList.filter(p => prFilter === "all" || p.repoType === prFilter).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
              <GitPullRequest className="mb-2 h-8 w-8 opacity-30" />
              No PRs found
            </div>
          ) : (
            prList
              .filter(p => prFilter === "all" || p.repoType === prFilter)
              .map(pr => (
                <div key={`${pr.repoName}-${pr.prNumber}`}
                  className="rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={pr.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono font-semibold text-primary hover:underline shrink-0"
                        >
                          #{pr.prNumber}
                        </a>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          pr.repoType === "ercs" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
                          pr.repoType === "rips" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" :
                          "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400"
                        }`}>
                          {pr.repoType === "ercs" ? "ERC" : pr.repoType === "rips" ? "RIP" : "EIP"}
                        </span>
                        {pr.mergedAt ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Merged</span>
                        ) : pr.state === "closed" ? (
                          <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">Closed</span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Open</span>
                        )}
                        {pr.eipNumbers.length > 0 && pr.eipNumbers.slice(0, 3).map(n => (
                          <span key={n} className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            EIP-{n}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground line-clamp-1">{pr.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{pr.repoName}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {pr.reviews > 0 && <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{pr.reviews}</span>}
                        {pr.comments > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{pr.comments}</span>}
                        {pr.merges > 0 && <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><GitMerge className="h-3 w-3" />{pr.merges}</span>}
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {pr.editors.map(e => (
                          <span key={e} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            @{e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="border-t border-border px-6 py-3 text-[11px] text-muted-foreground">
          Showing today&apos;s blitz window · Editor PRs only
        </div>
      </DialogContent>
    </Dialog>

    </TooltipProvider>
  );
}
