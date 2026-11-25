"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Clock,
  ListChecks,
  Flag,
  Target,
  Sparkles,
  FileText,
  Youtube,
  MessageSquare,
  MessagesSquare,
  Boxes,
  CalendarDays,
  Search,
  X,
  ExternalLink,
  ChevronRight,
  Check,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LedgerBadge } from "@/components/ledger/badge";
import type {
  CallDetail,
  CallMoment,
  CallEipMention,
  AgendaItem,
  TranscriptCue,
  ChatMessage,
  CallAction,
} from "@/server/calls";

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getCurrentTime(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void };
    }
  ) => YTPlayer;
}
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let ytReady: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve();
  if (ytReady) return ytReady;
  ytReady = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const poll = setInterval(() => {
      if ((window as YTWindow).YT?.Player) {
        clearInterval(poll);
        resolve();
      }
    }, 200);
  });
  return ytReady;
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function Seek({
  m,
  onSeek,
  href,
}: {
  m: Pick<CallMoment, "seconds" | "stamp">;
  onSeek: (s: number) => void;
  href: string | null;
}) {
  if (!m.stamp) return null;
  if (m.seconds == null) {
    return (
      <span className="shrink-0 font-mono text-[11px] text-[var(--ink-faint)]">
        {m.stamp}
      </span>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)] hover:border-[var(--brand-strong)]/40 hover:text-[var(--brand-strong)] transition-colors"
        aria-label={`Watch at ${m.stamp}`}
      >
        <Clock className="h-3 w-3" /> {m.stamp}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSeek(m.seconds!)}
      className="inline-flex shrink-0 items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)] hover:border-[var(--brand-strong)]/40 hover:text-[var(--brand-strong)] transition-colors cursor-pointer"
      aria-label={`Jump to ${m.stamp}`}
    >
      <Clock className="h-3 w-3" /> {m.stamp}
    </button>
  );
}

export function CallWorkspace({
  call,
  transcript,
  chat,
}: {
  call: CallDetail;
  transcript: TranscriptCue[] | null;
  chat: ChatMessage[] | null;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [now, setNow] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const embed = call.youtubeId;

  // Hero side panel tab: Live Transcript vs Key Outcomes (inspired by v5 CallPlayer)
  const [heroSideTab, setHeroSideTab] = useState<"transcript" | "decisions">(
    transcript && transcript.length > 0 ? "transcript" : "decisions"
  );
  const [heroSearch, setHeroSearch] = useState("");
  const [heroFollowAlong, setHeroFollowAlong] = useState(true);
  const heroListRef = useRef<HTMLUListElement>(null);

  // Initialize YouTube player
  useEffect(() => {
    if (!embed || !mount.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    loadYouTubeApi().then(() => {
      if (cancelled || !mount.current) return;
      const YT = (window as YTWindow).YT!;
      player.current = new YT.Player(mount.current, {
        videoId: embed,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            const p = new URLSearchParams(window.location.search);
            const t = Number(p.get("t"));
            if (Number.isFinite(t) && t > 0) {
              player.current?.seekTo(t, true);
              setNow(t);
            }
            timer = setInterval(() => {
              const cur = player.current?.getCurrentTime();
              if (cur != null) {
                setNow(cur);
                setIsPlaying(true);
              }
            }, 500);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      try {
        player.current?.destroy();
      } catch {}
    };
  }, [embed]);

  const seek = useCallback((seconds: number) => {
    if (player.current) {
      player.current.seekTo(seconds, true);
      player.current.playVideo();
      setNow(seconds);
      const el = document.getElementById("call-player");
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < -50 || rect.bottom < 0) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  }, []);

  const isActive = useCallback(
    (seconds: number | null) => {
      if (seconds == null || !embed) return false;
      return Math.abs(now - seconds) < 4;
    },
    [now, embed]
  );

  const linkAt = (seconds: number | null) => {
    if (!call.videoUrl) return null;
    if (seconds == null) return call.videoUrl;
    const sep = call.videoUrl.includes("?") ? "&" : "?";
    return `${call.videoUrl}${sep}t=${seconds}s`;
  };
  const hrefFor = (seconds: number | null) => (embed ? null : linkAt(seconds));

  // Determine available tabs
  const tabs = useMemo(() => {
    const list: Array<{
      id: "overview" | "eips" | "decisions" | "agenda" | "transcript" | "chat";
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      count?: number;
    }> = [];

    list.push({
      id: "overview",
      label: "Highlights & Notes",
      icon: Sparkles,
      count: call.highlights.reduce((n, h) => n + h.items.length, 0),
    });

    if (call.eipMentions.length > 0) {
      list.push({
        id: "eips",
        label: "Proposals & EIPs",
        icon: Boxes,
        count: call.eipMentions.length,
      });
    }

    if (call.decisions.length > 0 || call.actionItems.length > 0 || call.targets.length > 0) {
      list.push({
        id: "decisions",
        label: "Decisions & Actions",
        icon: ListChecks,
        count: call.decisions.length + call.actionItems.length,
      });
    }

    if (transcript && transcript.length > 0) {
      list.push({
        id: "transcript",
        label: "Full Transcript",
        icon: FileText,
        count: transcript.length,
      });
    }

    if (chat && chat.length > 0) {
      list.push({
        id: "chat",
        label: "Meeting Chat",
        icon: MessagesSquare,
        count: chat.length,
      });
    }

    if (call.agenda.length > 0) {
      list.push({
        id: "agenda",
        label: "Agenda",
        icon: CalendarDays,
        count: call.agenda.length,
      });
    }

    return list;
  }, [call, transcript, chat]);

  const [activeTab, setActiveTab] = useState<string>("overview");

  // Tab 1 (Overview) State: Topic filter
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const filteredHighlights = useMemo(() => {
    if (selectedTopic === "all") return call.highlights;
    return call.highlights.filter((h) => h.topic === selectedTopic);
  }, [call.highlights, selectedTopic]);

  // Tab 2 (EIPs) State: Search and Filter
  const [eipSearch, setEipSearch] = useState("");
  const [eipFilter, setEipFilter] = useState<"all" | "discussed" | "agenda">("all");
  const filteredEips = useMemo(() => {
    const q = eipSearch.trim().toLowerCase();
    return call.eipMentions.filter((e) => {
      if (eipFilter === "discussed" && !e.discussed) return false;
      if (eipFilter === "agenda" && !e.onAgenda) return false;
      if (!q) return true;
      return (
        `${e.kind}-${e.number}`.toLowerCase().includes(q) ||
        (e.title && e.title.toLowerCase().includes(q)) ||
        e.moments.some((m) => m.text.toLowerCase().includes(q))
      );
    });
  }, [call.eipMentions, eipSearch, eipFilter]);

  // Tab 5 (Transcript) State: Search & Follow along
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [followAlong, setFollowAlong] = useState(true);
  const transcriptListRef = useRef<HTMLUListElement>(null);

  const filteredTranscript = useMemo(() => {
    if (!transcript) return [];
    const q = transcriptSearch.trim().toLowerCase();
    if (!q) return transcript;
    return transcript.filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        (c.speaker && c.speaker.toLowerCase().includes(q))
    );
  }, [transcript, transcriptSearch]);

  // Filtered transcript for Hero side companion panel
  const heroFilteredTranscript = useMemo(() => {
    if (!transcript) return [];
    const q = heroSearch.trim().toLowerCase();
    if (!q) return transcript;
    return transcript.filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        (c.speaker && c.speaker.toLowerCase().includes(q))
    );
  }, [transcript, heroSearch]);

  // Auto-scroll transcript in Hero side panel when video is playing
  useEffect(() => {
    if (!heroFollowAlong || heroSearch || !embed || !transcript || !heroListRef.current)
      return;
    let bestIdx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].seconds <= now + 0.5) bestIdx = i;
      else break;
    }
    if (bestIdx >= 0) {
      const el = heroListRef.current.children[bestIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [now, heroFollowAlong, heroSearch, embed, transcript]);

  // Auto-scroll full transcript tab when video is playing
  useEffect(() => {
    if (!followAlong || transcriptSearch || !embed || !transcript || !transcriptListRef.current)
      return;
    let bestIdx = -1;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].seconds <= now + 0.5) bestIdx = i;
      else break;
    }
    if (bestIdx >= 0) {
      const el = transcriptListRef.current.children[bestIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [now, followAlong, transcriptSearch, embed, transcript]);

  // Tab 6 (Chat) State: Search
  const [chatSearch, setChatSearch] = useState("");
  const filteredChat = useMemo(() => {
    if (!chat) return [];
    const q = chatSearch.trim().toLowerCase();
    if (!q) return chat;
    return chat.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        (m.author && m.author.toLowerCase().includes(q))
    );
  }, [chat, chatSearch]);

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. HERO ROW: Video Player (Left) + Companion Plate (Right)  */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="call-player" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column (7 cols): YouTube Video Player */}
          <div className="lg:col-span-7 space-y-3">
            {embed ? (
              <div className="aspect-video overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-black shadow-xs [&>iframe]:size-full">
                <div ref={mount} className="size-full" />
              </div>
            ) : (
              call.videoUrl && (
                <a
                  href={call.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-video items-center justify-center gap-2.5 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--brand-strong)]/40 transition-colors shadow-xs"
                >
                  <Youtube className="h-6 w-6 text-red-500" /> Watch recording on YouTube
                </a>
              )
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {call.videoUrl && (
                  <a
                    href={call.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-sans font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] hover:border-[var(--ink-muted)] transition-colors"
                  >
                    <Youtube className="h-4 w-4 text-red-500" /> YouTube
                  </a>
                )}
                {call.issueNumber != null && (
                  <a
                    href={`https://github.com/ethereum/pm/issues/${call.issueNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-sans font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] hover:border-[var(--ink-muted)] transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-[var(--brand-strong)]" /> Agenda issue #{call.issueNumber}
                  </a>
                )}
              </div>

              {embed && (
                <span className="font-mono text-[11px] text-[var(--ink-muted)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--brand-strong)] animate-pulse" />
                  <span className="text-[var(--brand-strong)] font-semibold">{fmt(now)}</span> · Click any timestamp to seek
                </span>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Interactive Companion Panel (Live Transcript or Key Outcomes) */}
          <div className="lg:col-span-5 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            {/* Header Switcher: Live Transcript vs Key Outcomes */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-1.5">
                {transcript && transcript.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHeroSideTab("transcript")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      heroSideTab === "transcript"
                        ? "bg-[var(--brand-soft)]/40 border border-[var(--brand-strong)]/40 text-[var(--brand-strong)] font-semibold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Live Transcript</span>
                    <span className="font-mono text-[10px] opacity-75">({transcript.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHeroSideTab("decisions")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    heroSideTab === "decisions"
                      ? "bg-[var(--brand-soft)]/40 border border-[var(--brand-strong)]/40 text-[var(--brand-strong)] font-semibold"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>Key Outcomes</span>
                  {call.decisions.length > 0 && (
                    <span className="font-mono text-[10px] opacity-75">({call.decisions.length})</span>
                  )}
                </button>
              </div>

              {heroSideTab === "transcript" && (
                <label className="hidden sm:flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-[var(--ink-faint)] select-none">
                  <input
                    type="checkbox"
                    checked={heroFollowAlong}
                    onChange={(e) => setHeroFollowAlong(e.target.checked)}
                    className="h-3 w-3 rounded accent-[var(--brand)]"
                  />
                  Follow
                </label>
              )}
            </div>

            {/* View A: Live Transcript in Hero Side Panel (v5 style) */}
            {heroSideTab === "transcript" && transcript && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
                  <input
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search spoken words…"
                    className="h-7.5 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-7 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--brand-strong)] transition-colors"
                  />
                  {heroSearch && (
                    <button
                      type="button"
                      onClick={() => setHeroSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <ul
                  ref={heroListRef}
                  className="max-h-[17.5rem] overflow-y-auto divide-y divide-[var(--border)] rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)]/40 scrollbar-thin"
                >
                  {heroFilteredTranscript.map((c, i) => {
                    const active = Math.abs(now - c.seconds) < 3;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => seek(c.seconds)}
                          className={cn(
                            "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)] cursor-pointer text-xs",
                            active && "bg-[var(--brand-soft)]/35 text-[var(--ink)] font-medium border-l-2 border-[var(--brand-strong)]"
                          )}
                        >
                          <span className="w-11 shrink-0 pt-0.5 font-mono text-[10px] text-[var(--brand-strong)]">
                            {c.stamp.replace(/\.\d+$/, "")}
                          </span>
                          <span className="min-w-0 flex-1 leading-relaxed text-[var(--ink)]">
                            {c.speaker && (
                              <span className="font-semibold text-[var(--ink)] mr-1">
                                {c.speaker}:
                              </span>
                            )}
                            <span className={active ? "text-[var(--ink)]" : "text-[var(--ink-muted)]"}>
                              {c.text}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* View B: Key Outcomes & Decisions in Hero Side Panel */}
            {heroSideTab === "decisions" && (
              <div className="space-y-3">
                {call.summary && (
                  <div className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)]/60 p-3 text-xs leading-relaxed text-[var(--ink)]">
                    <p className="line-clamp-3 font-normal">{call.summary}</p>
                  </div>
                )}

                {call.decisions.length > 0 ? (
                  <div className="space-y-2 max-h-[16rem] overflow-y-auto pr-0.5 scrollbar-thin">
                    {call.decisions.map((d, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-2.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 transition-colors",
                          isActive(d.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/25"
                        )}
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--ink)]">
                          {d.text}
                        </p>
                        <Seek m={d} onSeek={seek} href={hrefFor(d.seconds)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ink-muted)] py-6 text-center">
                    No formal decisions logged for this call.
                  </p>
                )}

                {call.targets.length > 0 && (
                  <div className="border-t border-[var(--border)] pt-2.5">
                    <p className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-faint)]">
                      Targets &amp; Milestones
                    </p>
                    <div className="space-y-1">
                      {call.targets.map((t, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md p-1.5 text-xs text-[var(--ink-muted)] transition-colors",
                            isActive(t.seconds) && "bg-[var(--brand-soft)]/20 text-[var(--ink)] font-medium"
                          )}
                        >
                          <span className="truncate">• {t.text}</span>
                          <Seek m={t} onSeek={seek} href={hrefFor(t.seconds)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. TAB NAVIGATION BAR (Natural Flow, Non-Sticky)             */}
      {/* ─────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Call sections"
        className="border-y border-[var(--border)] py-2 bg-[var(--surface-2)]/40"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[var(--l-radius-control)] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  active
                    ? "bg-[var(--brand-soft)]/35 text-[var(--brand-strong)] border border-[var(--brand-strong)]/40 font-semibold shadow-xs"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] border border-transparent"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count != null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                      active
                        ? "bg-[var(--brand-strong)]/20 text-[var(--brand-strong)] font-semibold"
                        : "bg-[var(--surface-2)] text-[var(--ink-muted)]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. TAB CONTENT PANELS                                       */}
      {/* ─────────────────────────────────────────────────────────── */}

      {/* TAB 1: OVERVIEW & TOPICS HIGHLIGHTS */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          {call.summary && (
            <section className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-[var(--brand-strong)]" />
                <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
                  Call Executive Summary
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--ink)] font-normal">
                {call.summary}
              </p>
            </section>
          )}

          {call.highlights.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-[var(--brand-strong)]" />
                  <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
                    Detailed Notes by Topic
                  </h3>
                </div>

                {/* Topic quick filter pills */}
                {call.highlights.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedTopic("all")}
                      className={cn(
                        "rounded-full px-2.5 py-1 transition-colors cursor-pointer text-xs font-sans",
                        selectedTopic === "all"
                          ? "border border-[var(--brand-strong)]/40 bg-[var(--brand-soft)]/30 text-[var(--brand-strong)] font-medium"
                          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                      )}
                    >
                      All ({call.highlights.reduce((n, h) => n + h.items.length, 0)})
                    </button>
                    {call.highlights.map((h) => (
                      <button
                        key={h.topic}
                        type="button"
                        onClick={() => setSelectedTopic(h.topic)}
                        className={cn(
                          "rounded-full px-2.5 py-1 whitespace-nowrap transition-colors cursor-pointer text-xs font-sans",
                          selectedTopic === h.topic
                            ? "border border-[var(--brand-strong)]/40 bg-[var(--brand-soft)]/30 text-[var(--brand-strong)] font-medium"
                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        )}
                      >
                        {h.topic} ({h.items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {filteredHighlights.map((topic) => (
                  <div
                    key={topic.topic}
                    className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3.5">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--brand-strong)]">
                          {topic.topic}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                          {topic.items.length} {topic.items.length === 1 ? "note" : "notes"}
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {topic.items.map((h, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex items-start gap-2.5 rounded-[var(--l-radius-control)] border border-[var(--border)]/60 bg-[var(--surface-2)]/60 p-2.5 transition-colors",
                              isActive(h.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/25"
                            )}
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--ink)]">
                              {h.text}
                            </p>
                            <Seek m={h} onSeek={seek} href={hrefFor(h.seconds)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: PROPOSALS & EIPS */}
      {activeTab === "eips" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
                Proposals Discussed on this Call
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Every standard referenced in agenda or conversation, along with verbatim quotes and timestamps.
              </p>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
                <input
                  value={eipSearch}
                  onChange={(e) => setEipSearch(e.target.value)}
                  placeholder="Search EIP# or keyword…"
                  className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand-strong)] transition-colors placeholder:text-[var(--ink-faint)]"
                />
                {eipSearch && (
                  <button
                    onClick={() => setEipSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="inline-flex items-center rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEipFilter("all")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                    eipFilter === "all" ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  All ({call.eipMentions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEipFilter("discussed")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                    eipFilter === "discussed" ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  Discussed
                </button>
                <button
                  type="button"
                  onClick={() => setEipFilter("agenda")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                    eipFilter === "agenda" ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  )}
                >
                  On agenda
                </button>
              </div>
            </div>
          </div>

          {filteredEips.length === 0 ? (
            <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
              No proposals match your search filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredEips.map((e) => (
                <div
                  key={`${e.kind}-${e.number}`}
                  className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between hover:border-[var(--brand-strong)]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                      <Link
                        href={`/${e.kind}/${e.number}`}
                        className="font-mono text-sm font-semibold text-[var(--ink)] hover:text-[var(--brand-strong)] transition-colors"
                      >
                        {e.kind.toUpperCase()}-{e.number}
                      </Link>
                      <div className="flex items-center gap-1.5">
                        <LedgerBadge
                          token={e.discussed ? "final" : "draft"}
                          label={e.discussed ? "Discussed" : "Mentioned"}
                        />
                        {e.onAgenda && (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                            On agenda
                          </span>
                        )}
                      </div>
                    </div>

                    {e.title && (
                      <p className="mt-2.5 text-xs font-medium text-[var(--ink)]">
                        {e.title}
                      </p>
                    )}

                    {e.moments.length > 0 && (
                      <ul className="mt-3.5 space-y-2">
                        {e.moments.map((m, i) => (
                          <li
                            key={i}
                            className={cn(
                              "rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 transition-colors text-xs",
                              isActive(m.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/25"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--brand-strong)] font-semibold">
                                {m.label}
                              </span>
                              <Seek m={m} onSeek={seek} href={hrefFor(m.seconds)} />
                            </div>
                            <p className="leading-relaxed text-[var(--ink-muted)] text-xs">
                              {m.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DECISIONS & ACTIONS */}
      {activeTab === "decisions" && (
        <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in-50 duration-200">
          {/* Formal Decisions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-[var(--brand-strong)]" />
                <h3 className="t-h2 font-serif text-xl text-[var(--ink)]">
                  Consensus Decisions
                </h3>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-strong)]">
                {call.decisions.length}
              </span>
            </div>

            {call.decisions.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] py-8 text-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
                No decisions recorded for this call.
              </p>
            ) : (
              <div className="space-y-3">
                {call.decisions.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors shadow-xs",
                      isActive(d.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/20"
                    )}
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-[var(--ink)]">
                        {d.text}
                      </p>
                    </div>
                    <Seek m={d} onSeek={seek} href={hrefFor(d.seconds)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items & Targets */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-[var(--brand-strong)]" />
                  <h3 className="t-h2 font-serif text-xl text-[var(--ink)]">
                    Action Items
                  </h3>
                </div>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-muted)]">
                  {call.actionItems.length}
                </span>
              </div>

              {call.actionItems.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)] py-8 text-center rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
                  No action items assigned.
                </p>
              ) : (
                <div className="space-y-3">
                  {call.actionItems.map((a, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors shadow-xs",
                        isActive(a.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {a.owner ? (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--brand-strong)] font-semibold">
                            @{a.owner}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-[var(--ink-faint)]">Unassigned</span>
                        )}
                        <Seek m={a} onSeek={seek} href={hrefFor(a.seconds)} />
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--ink)]">
                        {a.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {call.targets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
                  <Target className="h-4 w-4 text-[var(--brand-strong)]" />
                  <h4 className="font-serif text-lg font-normal tracking-tight text-[var(--ink)]">
                    Targets &amp; Milestones
                  </h4>
                </div>
                <div className="space-y-2">
                  {call.targets.map((t, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs transition-colors",
                        isActive(t.seconds) && "border-[var(--brand-strong)]/60 bg-[var(--brand-soft)]/20"
                      )}
                    >
                      <span className="text-[var(--ink)]">{t.text}</span>
                      <Seek m={t} onSeek={seek} href={hrefFor(t.seconds)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AGENDA */}
      {activeTab === "agenda" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
              Published Agenda Items
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Issues and proposals scheduled for discussion from the agenda issue.
            </p>
          </div>

          {call.agenda.length === 0 ? (
            <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
              No agenda items parsed for this call.
            </div>
          ) : (
            <div className="space-y-3">
              {call.agenda.map((a) => (
                <div
                  key={`${a.kind}-${a.number}`}
                  className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] flex items-start gap-4 p-4 shadow-xs hover:border-[var(--brand-strong)]/40 transition-colors"
                >
                  <Link
                    href={`/${a.kind}/${a.number}`}
                    className="shrink-0 font-mono text-xs font-semibold text-[var(--brand-strong)] hover:underline transition-colors px-2 py-1 rounded-[var(--l-radius-control)] bg-[var(--surface-2)] border border-[var(--border)]"
                  >
                    {a.kind.toUpperCase()}-{a.number}
                  </Link>
                  <div className="min-w-0 flex-1">
                    {a.title && (
                      <p className="text-xs font-medium text-[var(--ink)]">{a.title}</p>
                    )}
                    {a.mentionedBy && (
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--ink-faint)]">
                        raised by @{a.mentionedBy}
                      </p>
                    )}
                    {a.snippet && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                        {a.snippet}
                      </p>
                    )}
                  </div>
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                    >
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FULL TRANSCRIPT */}
      {activeTab === "transcript" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
                Interactive Transcript
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                {transcript?.length ?? 0} timestamped lines with click-to-seek video playback.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--ink-muted)] select-none">
                <input
                  type="checkbox"
                  checked={followAlong}
                  onChange={(e) => setFollowAlong(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--brand)] rounded"
                />
                Follow along with video
              </label>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
                <input
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder="Search transcript lines…"
                  className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-7 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand-strong)] transition-colors placeholder:text-[var(--ink-faint)]"
                />
                {transcriptSearch && (
                  <button
                    onClick={() => setTranscriptSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
            <ul
              ref={transcriptListRef}
              className="max-h-[38rem] divide-y divide-[var(--border)] overflow-y-auto scrollbar-thin"
            >
              {filteredTranscript.map((c, i) => {
                const active = Math.abs(now - c.seconds) < 3;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => seek(c.seconds)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)] cursor-pointer",
                        active && "bg-[var(--brand-soft)]/30 border-l-2 border-[var(--brand-strong)]"
                      )}
                    >
                      <span className="w-14 shrink-0 pt-0.5 font-mono text-[10px] text-[var(--brand-strong)] font-semibold">
                        {c.stamp.replace(/\.\d+$/, "")}
                      </span>
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--ink)]">
                        {c.speaker && (
                          <span className="font-semibold text-[var(--ink)] mr-1">
                            {c.speaker}:
                          </span>
                        )}
                        <span className={active ? "text-[var(--ink)] font-medium" : "text-[var(--ink-muted)]"}>
                          {c.text}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 6: CHAT LOG */}
      {activeTab === "chat" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="t-h2 font-serif text-xl sm:text-2xl text-[var(--ink)]">
                Meeting Chat Log
              </h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Real-time messages sent by call attendees.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search chat messages…"
                className="h-8 w-full rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-7 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand-strong)] transition-colors placeholder:text-[var(--ink-faint)]"
              />
              {chatSearch && (
                <button
                  onClick={() => setChatSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
            <ul className="max-h-[32rem] space-y-2.5 overflow-y-auto pr-1 scrollbar-thin">
              {filteredChat.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs"
                >
                  {m.time && (
                    <span className="shrink-0 font-mono text-[10px] text-[var(--brand-strong)] font-semibold">
                      {m.time}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {m.author && (
                      <span className="font-semibold text-[var(--ink)] mr-1">
                        {m.author}:
                      </span>
                    )}
                    <span className="text-[var(--ink-muted)]">{m.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
