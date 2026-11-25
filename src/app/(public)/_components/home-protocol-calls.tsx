'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Video,
  FileText,
  ArrowRight,
  ExternalLink,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { client } from '@/lib/orpc';
import { cn } from '@/lib/utils';
import { callSeriesShort, callSeriesToken } from '@/data/call-series';
import { SectionHead } from '@/components/ledger/section-head';
import { LedgerBadge } from '@/components/ledger/badge';

interface UpcomingCall {
  series: string | null;
  title: string;
  issue_number: number | null;
  issue_url: string | null;
  occurs_at: string | null;
  occurs_on: string | null;
  call_number?: number | null;
}

interface RecentCall {
  series: string;
  call_id: string;
  call_number: string | null;
  occurred_on: string;
  issue_number: number | null;
  video_url: string | null;
  has_transcript: boolean;
  display_name: string | null;
  tldr: unknown;
}

function SeriesBadge({ series }: { series: string | null }) {
  const short = series ? callSeriesShort(series) : '—';
  return (
    <LedgerBadge
      token={callSeriesToken(series)}
      className="w-16 shrink-0 justify-center text-[10px]"
    >
      {short}
    </LedgerBadge>
  );
}

function formatCallTime(occursAt: string | null, occursOn: string | null) {
  if (occursAt) {
    const d = new Date(occursAt);
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toISOString().slice(11, 16)} UTC`;
  }
  if (occursOn) {
    return occursOn;
  }
  return 'Date TBD';
}

export function HomeProtocolCalls({
  sectionTitleClass,
  sectionSubtitleClass,
}: {
  sectionTitleClass?: string;
  sectionSubtitleClass?: string;
}) {
  const [upcoming, setUpcoming] = useState<UpcomingCall[]>([]);
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recent'>('upcoming');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [upcomingRes, recentRes] = await Promise.all([
          client.calls.listUpcomingCalls({}),
          client.calls.listRecentCalls({ limit: 8 }),
        ]);
        if (!cancelled) {
          setUpcoming((upcomingRes as UpcomingCall[]) || []);
          setRecent((recentRes as RecentCall[]) || []);
        }
      } catch (err) {
        console.error('Failed to load protocol calls:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-12 pt-6" id="calls">
      <SectionHead
        index="08"
        eyebrow="AllCoreDevs & breakouts"
        title="Protocol Calls"
        description="AllCoreDevs, testing, and breakout meetings where Ethereum decisions happen in real time."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              data-active={activeTab === 'upcoming'}
              className="chip cursor-pointer"
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              data-active={activeTab === 'recent'}
              className="chip cursor-pointer"
            >
              Recent Recordings
            </button>
            <Link
              href="/calls"
              className="btn btn-outline h-[1.9rem] px-3 text-xs font-mono"
            >
              All Calls
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      {/* Content Feed */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-28 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-16 bg-[var(--surface-3)] rounded" />
                <div className="h-4 w-28 bg-[var(--surface-3)] rounded" />
              </div>
              <div className="h-4 w-3/4 bg-[var(--surface-3)] rounded mb-2" />
              <div className="h-3 w-1/2 bg-[var(--surface-3)] rounded" />
            </div>
          ))}
        </div>
      ) : activeTab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--ink-muted)]">
            No upcoming protocol calls scheduled right now. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.slice(0, 6).map((call, idx) => (
              <div
                key={`${call.series}-${call.title}-${idx}`}
                className="tile flex flex-col justify-between p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <SeriesBadge series={call.series} />
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--ink-faint)]">
                      <Clock className="h-3 w-3 text-[var(--brand-strong)]" />
                      {formatCallTime(call.occurs_at, call.occurs_on)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--ink)] line-clamp-2">
                    {call.title}
                  </h4>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
                  {call.issue_url ? (
                    <a
                      href={call.issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Agenda Issue</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-[var(--ink-faint)] text-[11px]">Agenda pending</span>
                  )}
                  {call.series && call.call_number ? (
                    <Link
                      href={`/calls/${call.series}/${call.call_number}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-[var(--brand-strong)] hover:underline"
                    >
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5 tile-arrow" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : recent.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--ink-muted)]">
          No recent calls indexed.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {recent.slice(0, 8).map((call) => {
            const seriesName = call.series || 'acde';
            const callNum = call.call_number || call.call_id;
            const targetHref = `/calls/${seriesName}/${callNum}`;
            const title = call.display_name || `${callSeriesShort(seriesName)} #${callNum}`;

            return (
              <Link
                key={`${call.series}-${call.call_id}`}
                href={targetHref}
                className="tile flex flex-col justify-between p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <SeriesBadge series={call.series} />
                    <span className="text-[11px] font-mono text-[var(--ink-faint)]">
                      {call.occurred_on}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--ink)] line-clamp-2">
                    {title}
                  </h4>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border)] text-[11px] text-[var(--ink-muted)]">
                  <div className="flex items-center gap-2">
                    {call.video_url && (
                      <span className="inline-flex items-center gap-1 text-[var(--c-withdrawn)] font-medium">
                        <Video className="h-3 w-3" />
                        <span>Video</span>
                      </span>
                    )}
                    {call.has_transcript && (
                      <span className="inline-flex items-center gap-1 text-[var(--c-final)] font-medium">
                        <FileText className="h-3 w-3" />
                        <span>Transcript</span>
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center text-[var(--brand-strong)] tile-arrow">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile view all link */}
      <div className="mt-4 text-center sm:hidden">
        <Link
          href="/calls"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-strong)] hover:underline"
        >
          Explore All Protocol Calls
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
