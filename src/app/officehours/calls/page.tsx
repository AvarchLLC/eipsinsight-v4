"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Video, CalendarClock, ExternalLink } from "lucide-react";
import { client } from "@/lib/orpc";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import { OfficeHourRecapCompact } from "@/components/office-hour-recap";
import { OFFICE_HOUR_RECAPS } from "@/data/office-hour-recaps";

type Meeting = Awaited<ReturnType<typeof client.calls.listOfficeHourMeetings>>[number];

function prettyDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Office Hours → Calls tab. EIP Editing Office Hours + EIPIP meetings only.
 * Meetings come from listOfficeHourMeetings (scheduling data). Transcript / TL;DR
 * artifacts appear once the series is published to ACDbot's manifest and ingested.
 */
export default function OfficeHoursCallsTab() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    client.calls.listOfficeHourMeetings({ limit: 40 }).then(setMeetings).catch(() => setMeetings([]));
  }, []);

  if (meetings === null) return <div className="py-16"><InlineBrandLoader size="md" label="Loading calls…" /></div>;

  return (
    <div className="space-y-4">
      {/* Static recaps of past office hours (verified against the governance backend). */}
      {OFFICE_HOUR_RECAPS.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Recaps</div>
          {OFFICE_HOUR_RECAPS.map((r) => <OfficeHourRecapCompact key={r.meeting} recap={r} />)}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Video className="h-4 w-4 text-primary" />
        Upcoming EIP Editing Office Hours &amp; EIPIP meetings
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          No office-hour or EIPIP meetings are listed yet. Once the series is published to the protocol-call pipeline,
          calls will appear here with their recording, transcript, and TL;DR.
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
