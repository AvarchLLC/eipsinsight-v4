'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Link2, Pause, Play, Search, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranscriptCue } from '@/components/upgrade/call-transcript';

/* eslint-disable @typescript-eslint/no-explicit-any */

function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Load the YouTube IFrame API once and resolve when `window.YT.Player` exists. */
let ytReadyPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).YT?.Player) return Promise.resolve();
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise<void>((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    // Fallback poll in case the callback was already consumed.
    const poll = setInterval(() => {
      if ((window as any).YT?.Player) {
        clearInterval(poll);
        resolve();
      }
    }, 200);
  });
  return ytReadyPromise;
}

/**
 * Synced call workspace: a YouTube player (IFrame API) beside a live transcript.
 * Clicking a transcript line — or a decision timestamp elsewhere on the page
 * (via a `call:seek` window event) — seeks the video; the active line highlights
 * and auto-scrolls as it plays. Supports `?t=<seconds>` deep-links.
 */
export function CallPlayer({
  youtubeId,
  cues,
}: {
  youtubeId: string;
  cues: TranscriptCue[];
}) {
  const playerRef = useRef<any>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const cueStarts = useMemo(() => cues.map((c) => toSeconds(c.start)), [cues]);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p?.seekTo) return;
    p.seekTo(seconds, true);
    p.playVideo?.();
    setCurrentTime(seconds);
  }, []);

  // Create the player.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new (window as any).YT.Player(mountRef.current, {
        videoId: youtubeId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            setReady(true);
            const t = Number(new URLSearchParams(window.location.search).get('t'));
            if (Number.isFinite(t) && t > 0) seekTo(t);
          },
          onStateChange: (e: any) => setPlaying(e.data === (window as any).YT.PlayerState.PLAYING),
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [youtubeId, seekTo]);

  // Poll playback position while playing.
  useEffect(() => {
    if (!ready || !playing) return;
    const id = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.();
      if (typeof t === 'number') setCurrentTime(t);
    }, 500);
    return () => clearInterval(id);
  }, [ready, playing]);

  // Seek requests from decision timestamps (dispatched elsewhere on the page).
  useEffect(() => {
    const handler = (e: Event) => {
      const secs = (e as CustomEvent<number>).detail;
      if (Number.isFinite(secs)) {
        seekTo(secs);
        mountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('call:seek', handler as EventListener);
    return () => window.removeEventListener('call:seek', handler as EventListener);
  }, [seekTo]);

  // Active cue = last cue whose start <= currentTime.
  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < cueStarts.length; i += 1) {
      if (cueStarts[i] <= currentTime + 0.25) idx = i;
      else break;
    }
    return idx;
  }, [cueStarts, currentTime]);

  // Auto-scroll the active cue into view (only when not searching + enabled).
  useEffect(() => {
    if (!autoScroll || search || activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-cue="${activeIdx}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx, autoScroll, search]);

  const normalizedQuery = search.trim().toLowerCase();
  const visibleCues = normalizedQuery
    ? cues
        .map((cue, i) => ({ cue, i }))
        .filter(({ cue }) => cue.text.toLowerCase().includes(normalizedQuery))
    : cues.map((cue, i) => ({ cue, i }));

  const copyTimestampLink = (seconds: number, i: number) => {
    const url = `${window.location.origin}${window.location.pathname}?t=${Math.floor(seconds)}`;
    navigator.clipboard?.writeText(url);
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
  };

  const hasTranscript = cues.length > 0;

  return (
    // lg:pb-7 reserves room for the playhead caption, which is lifted out of flow
    // below so the video box alone sets the row height (see the caption comment).
    <div className={cn('grid gap-4', hasTranscript && 'lg:grid-cols-5 lg:pb-7')}>
      {/* Video */}
      <div className={cn(hasTranscript && 'lg:col-span-3')}>
        <div className="lg:sticky lg:top-20">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/50 bg-black shadow-lg">
            <div ref={mountRef} className="absolute inset-0 h-full w-full" />
          </div>
          {ready && (
            // On lg this floats just under the video instead of adding to the column's
            // height — otherwise the transcript (which fills the column) would always
            // sit ~26px taller than the video box it is meant to line up with.
            <div className="mt-2 flex items-center gap-2 px-0.5 text-xs text-muted-foreground lg:absolute lg:inset-x-0 lg:top-full">
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="font-mono">{fmt(currentTime)}</span>
              {hasTranscript && activeIdx >= 0 && (
                <span className="truncate text-foreground/70">· {cues[activeIdx].text.slice(0, 80)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transcript — on lg it is absolutely positioned inside its grid cell so it
          matches the video column's height exactly. The video (aspect-video) is then
          the only auto-height item, so it alone drives the row height and the
          transcript fills it rather than running taller on its own max-height. */}
      {hasTranscript && (
        <div className="lg:relative lg:col-span-2">
          <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/60 lg:absolute lg:inset-0">
            <div className="border-b border-border/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="h-3 w-3 accent-[var(--primary)]"
                  />
                  Follow along
                </label>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${cues.length} lines…`}
                  className="h-8 w-full rounded-md border border-border bg-muted/60 pl-8 pr-7 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div
              ref={listRef}
              // Mobile keeps a viewport cap (the card is static there); on lg the card
              // is height-bound by the grid cell, so the list just flexes to fill it.
              className="max-h-[62vh] min-h-64 overflow-y-auto p-1.5 lg:max-h-none lg:min-h-0 lg:flex-1"
            >
              {visibleCues.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No lines match “{search}”.
                </p>
              ) : (
                visibleCues.map(({ cue, i }) => {
                  const isActive = i === activeIdx;
                  const seconds = cueStarts[i];
                  return (
                    <div
                      key={i}
                      data-cue={i}
                      className={cn(
                        'group flex gap-2 rounded-lg px-2 py-1.5 transition-colors',
                        isActive ? 'bg-primary/10' : 'hover:bg-muted/60'
                      )}
                    >
                      <button
                        onClick={() => seekTo(seconds)}
                        className={cn(
                          'shrink-0 font-mono text-[10px] tabular-nums transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        )}
                        title="Jump to this moment"
                      >
                        {fmt(seconds)}
                      </button>
                      <button
                        onClick={() => seekTo(seconds)}
                        className={cn(
                          'flex-1 text-left text-xs leading-relaxed transition-colors',
                          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        {cue.text}
                      </button>
                      <button
                        onClick={() => copyTimestampLink(seconds, i)}
                        className="shrink-0 self-start text-muted-foreground/50 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                        title="Copy link to this moment"
                      >
                        {copied === i ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Fallback when there's no embeddable video. */
export function CallVideoFallback({ videoUrl }: { videoUrl: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-6 text-center">
      <Video className="mx-auto h-8 w-8 text-primary" />
      <p className="text-sm font-medium text-foreground">Recording available externally</p>
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
      >
        Watch recording
      </a>
    </div>
  );
}
