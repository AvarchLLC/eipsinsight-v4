"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Video, CalendarClock, ExternalLink, FileText, CheckSquare, ArrowUpRight } from "lucide-react";
import { client } from "@/lib/orpc";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { OfficeHourRecapCompact } from "@/components/office-hour-recap";
import { OFFICE_HOUR_RECAPS } from "@/data/office-hour-recaps";

type Meeting = Awaited<ReturnType<typeof client.calls.listOfficeHourMeetings>>[number];
type DbCall = Awaited<ReturnType<typeof client.calls.listRecentCalls>>[number];

function prettyDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function seriesLabel(s: string): string {
  return s === "eipip" ? "EIPIP" : s === "eipoh" ? "Office Hours" : s.toUpperCase();
}

function decisionCount(tldr: DbCall["tldr"]): number {
  const d = (tldr as { decisions?: unknown[] } | null)?.decisions;
  return Array.isArray(d) ? d.length : 0;
}

function callTitle(c: DbCall): string {
  const m = (c.tldr as { meeting?: string } | null)?.meeting;
  return m || c.display_name || `${seriesLabel(c.series)} #${c.call_number ?? ""}`;
}

/**
 * Office Hours → Calls tab. EIP Editing Office Hours + EIPIP meetings only.
 * Ingested calls (with decisions + transcript) come from the DB via
 * listRecentCalls; a static recap fills in only for a meeting the DB does not
 * carry yet. Upcoming meetings come from listOfficeHourMeetings (scheduling).
 */
export default function OfficeHoursCallsTab() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [dbCalls, setDbCalls] = useState<DbCall[] | null>(null);

  useEffect(() => {
    client.calls.listOfficeHourMeetings({ limit: 40 }).then(setMeetings).catch(() => setMeetings([]));
    Promise.all([
      client.calls.listRecentCalls({ series: "eipip", limit: 60 }).catch(() => [] as DbCall[]),
      client.calls.listRecentCalls({ series: "eipoh", limit: 60 }).catch(() => [] as DbCall[]),
    ])
      .then(([a, b]) => setDbCalls([...a, ...b]))
      .catch(() => setDbCalls([]));
  }, []);

  // Ingested calls (DB) are the source of truth; sort newest-first.
  const calls = (dbCalls ?? []).slice().sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1));

  // Static recaps only for (series, meeting) the DB does not already carry.
  const inDb = new Set(calls.map((c) => `${c.series}-${c.call_number}`));
  const recaps = OFFICE_HOUR_RECAPS.filter(
    (r) => (r.series === "eipoh" || r.series === "eipip") && !inDb.has(`${r.series}-${r.meeting}`),
  );

  if (meetings === null || dbCalls === null) {
    return <div className="py-16"><InlineBrandLoader size="md" label="Loading calls…" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Ingested call notes (decisions + transcript), newest first. */}
      {calls.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Meeting notes</div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {calls.map((c) => {
              const decisions = decisionCount(c.tldr);
              const href = `/calls/${c.series}/${c.call_number ?? c.call_id}`;
              return (
                <li key={`${c.series}-${c.call_id}`} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{seriesLabel(c.series)}</span>
                        <span className="truncate text-sm font-medium text-foreground">{callTitle(c)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {prettyDate(c.occurred_on)}</span>
                        {decisions > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckSquare className="h-3.5 w-3.5" /> {decisions} decisions</span>}
                        {c.has_transcript && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> transcript</span>}
                      </div>
                    </div>
                    <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20">
                      Notes <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Static recaps for meetings not yet ingested into the DB. */}
      {recaps.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Recaps</div>
          {recaps.map((r) => <OfficeHourRecapCompact key={`${r.series}-${r.meeting}`} recap={r} />)}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Video className="h-4 w-4 text-primary" />
        Upcoming EIP Editing Office Hours &amp; EIPIP meetings
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No upcoming office-hour or EIPIP meetings are listed yet.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {meetings.map((m) => (
            <li key={`${m.issue_number}-${m.date}`} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{m.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> {prettyDate(m.date)}
                  </div>
                </div>
                {m.issue_url && (
                  <Link href={m.issue_url} target="_blank" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
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
