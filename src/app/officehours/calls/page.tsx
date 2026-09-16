"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitPullRequest,
  Video,
  Youtube,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { OFFICE_HOUR_RECAPS } from "@/data/office-hour-recaps";

type Meeting = Awaited<ReturnType<typeof client.calls.listOfficeHourMeetings>>[number];
type DbCall = Awaited<ReturnType<typeof client.calls.listRecentCalls>>[number];

type SeriesKey = "eipoh" | "eipip";

/** One rich recap card, merged from either a DB call or a static recap. */
type CallCard = {
  key: string;
  series: SeriesKey;
  href: string;
  number: string;
  title: string;
  dateISO: string;
  summary: string | null;
  decisions: number;
  hasTranscript: boolean;
  youtube: string | null;
  issueUrl: string | null;
  prs: number | null;
  merged: number | null;
};

function prettyDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function seriesLabel(s: string): string {
  return s === "eipip" ? "EIPIP" : s === "eipoh" ? "Office Hours" : s.toUpperCase();
}

function tldrSummary(tldr: unknown): string | null {
  if (!tldr || typeof tldr !== "object") return null;
  const t = tldr as Record<string, unknown>;
  if (typeof t.summary === "string" && t.summary.trim()) return t.summary.trim();
  const highlights = t.highlights;
  if (Array.isArray(highlights) && typeof highlights[0] === "string") return highlights[0];
  return null;
}

function tldrDecisionCount(tldr: unknown): number {
  const t = tldr as { decisions?: unknown[]; key_decisions?: unknown[] } | null;
  const d = t?.decisions ?? t?.key_decisions;
  return Array.isArray(d) ? d.length : 0;
}

function tldrMeetingName(tldr: unknown): string | null {
  const m = (tldr as { meeting?: unknown } | null)?.meeting;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

/**
 * Office Hours → Calls tab. EIP Editing Office Hours + EIPIP meetings, arranged
 * as rich recap cards (like /calls/<series>) with a segmented filter to switch
 * between the two series. Ingested calls (decisions + transcript) come from the
 * DB; a static recap fills in only for a meeting the DB does not carry yet.
 */
export default function OfficeHoursCallsTab() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [dbCalls, setDbCalls] = useState<DbCall[] | null>(null);
  const [tab, setTab] = useState<"all" | SeriesKey>("all");

  useEffect(() => {
    client.calls.listOfficeHourMeetings({ limit: 40 }).then(setMeetings).catch(() => setMeetings([]));
    Promise.all([
      client.calls.listRecentCalls({ series: "eipip", limit: 60 }).catch(() => [] as DbCall[]),
      client.calls.listRecentCalls({ series: "eipoh", limit: 60 }).catch(() => [] as DbCall[]),
    ])
      .then(([a, b]) => setDbCalls([...a, ...b]))
      .catch(() => setDbCalls([]));
  }, []);

  const cards = useMemo<CallCard[]>(() => {
    const calls = dbCalls ?? [];
    const dbCards: CallCard[] = calls
      .filter((c) => c.series === "eipip" || c.series === "eipoh")
      .map((c) => {
        const number = String(c.call_number ?? c.call_id);
        return {
          key: `db-${c.series}-${c.call_id}`,
          series: c.series as SeriesKey,
          href: `/calls/${c.series}/${number}`,
          number,
          title: tldrMeetingName(c.tldr) ?? c.display_name ?? `${seriesLabel(c.series)} #${number}`,
          dateISO: c.occurred_on,
          summary: tldrSummary(c.tldr),
          decisions: tldrDecisionCount(c.tldr),
          hasTranscript: Boolean(c.has_transcript),
          youtube: c.video_url ?? null,
          issueUrl: c.issue_number ? `https://github.com/ethereum/pm/issues/${c.issue_number}` : null,
          prs: null,
          merged: null,
        };
      });

    // Static recaps only for (series, meeting) the DB does not already carry.
    const inDb = new Set(dbCards.map((c) => `${c.series}-${c.number}`));
    const recapCards: CallCard[] = OFFICE_HOUR_RECAPS.filter(
      (r) => (r.series === "eipoh" || r.series === "eipip") && !inDb.has(`${r.series}-${r.meeting}`),
    ).map((r) => ({
      key: `recap-${r.series}-${r.meeting}`,
      series: r.series as SeriesKey,
      href: `/calls/${r.series}/${r.meeting}`,
      number: String(r.meeting),
      title: r.title,
      dateISO: r.dateISO,
      summary: r.summary,
      decisions: r.decisions.length,
      hasTranscript: true,
      youtube: r.youtube || null,
      issueUrl: r.issueUrl || null,
      prs: r.prs.length,
      merged: r.prs.filter((p) => p.status === "MERGED").length,
    }));

    return [...dbCards, ...recapCards].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  }, [dbCalls]);

  const counts = useMemo(
    () => ({
      all: cards.length,
      eipoh: cards.filter((c) => c.series === "eipoh").length,
      eipip: cards.filter((c) => c.series === "eipip").length,
    }),
    [cards],
  );

  const visible = tab === "all" ? cards : cards.filter((c) => c.series === tab);

  // Upcoming meetings, filtered to match the active tab. The scheduling feed has
  // no series field, so derive it from the title.
  const meetingSeries = (m: Meeting): SeriesKey =>
    /EIPIP|Improvement Process/i.test(m.title) ? "eipip" : "eipoh";
  const upcoming = (meetings ?? []).filter((m) => tab === "all" || meetingSeries(m) === tab);

  if (meetings === null || dbCalls === null) {
    return (
      <div className="py-16">
        <InlineBrandLoader size="md" label="Loading calls…" />
      </div>
    );
  }

  const TABS: { key: "all" | SeriesKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "eipoh", label: "EIP Office Hours" },
    { key: "eipip", label: "EIPIP" },
  ];

  return (
    <div className="space-y-4">
      {/* Series filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] font-semibold",
                tab === t.key ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No meeting notes published for this view yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <RecapCard key={c.key} card={c} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
        <Video className="h-4 w-4 text-primary" />
        Upcoming {tab === "eipip" ? "EIPIP meetings" : tab === "eipoh" ? "EIP Editing Office Hours" : "office-hour & EIPIP meetings"}
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No upcoming meetings are listed yet.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {upcoming.map((m) => (
            <li key={`${m.issue_number}-${m.date}`} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{m.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> {prettyDate(m.date)}
                  </div>
                </div>
                {m.issue_url && (
                  <Link
                    href={m.issue_url}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Issue <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecapCard({ card }: { card: CallCard }) {
  return (
    <article className="group rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold not-italic",
                card.series === "eipip"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
            >
              {card.series === "eipip" ? "EIPIP" : "EIP OH"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> {prettyDate(card.dateISO)} · Meeting #{card.number}
            </span>
          </div>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            <Link href={card.href} className="transition-colors hover:text-primary">
              {card.title}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {card.series === "eipoh" && (
            <Link
              href={`/officehours?mode=day&day=${card.dateISO}`}
              title={`Editorial activity from ${prettyDate(card.dateISO)}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
            >
              <Activity className="h-3.5 w-3.5" /> Editorial activity
            </Link>
          )}
          {card.youtube && (
            <Link
              href={card.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
            >
              <Youtube className="h-3.5 w-3.5" /> Watch
            </Link>
          )}
          {card.issueUrl && (
            <Link
              href={card.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Issue <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {card.summary && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{card.summary}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {card.prs != null && card.prs > 0 && (
          <span className="inline-flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5" />
            <strong className="font-semibold text-foreground">{card.prs}</strong> PRs reviewed
          </span>
        )}
        {card.merged != null && card.merged > 0 && (
          <span>
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{card.merged}</strong> merged
          </span>
        )}
        {card.decisions > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <strong className="font-semibold text-foreground">{card.decisions}</strong> decisions
          </span>
        )}
        {card.hasTranscript && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> transcript
          </span>
        )}
        <Link
          href={card.href}
          className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Full recap <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
