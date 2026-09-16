import Link from "next/link";
import { ArrowUpRight, CalendarClock, CheckSquare, FileText, Video } from "lucide-react";
import "@/lib/orpc.server";
import { EIPIP_MEETINGS } from "@/data/eipip-meetings.generated";
import { getCachedRecentCalls } from "@/lib/upgrade-data.server";

export const revalidate = 300;

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function decisionCount(tldr: unknown): number {
  const d = (tldr as { decisions?: unknown[] } | null)?.decisions;
  return Array.isArray(d) ? d.length : 0;
}

export default async function EipipCallsPage() {
  const today = new Date().toISOString().slice(0, 10);

  // Ingested meetings (summary + decisions + recording + transcript) from the DB.
  const calls = (await getCachedRecentCalls(300))
    .filter((c) => c.series === "eipip")
    .map((c) => ({
      meeting: String(c.call_number ?? c.call_id),
      date: c.occurred_on,
      decisions: decisionCount(c.tldr),
      hasTranscript: Boolean(c.has_transcript),
      hasVideo: Boolean(c.video_url),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // The next scheduled meeting that is not yet recorded, from the schedule data.
  const ingested = new Set(calls.map((c) => c.meeting));
  const upcoming =
    [...EIPIP_MEETINGS]
      .filter((m) => m.dateISO > today && !ingested.has(String(m.meeting)))
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0] ?? null;

  return (
    <div className="space-y-5">
      {upcoming && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">EIPIP #{upcoming.meeting}</span>
                <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-px text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                  Next
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {prettyDate(upcoming.dateISO)}
                {upcoming.timeUTC ? ` · ${upcoming.timeUTC} UTC` : ""}
              </div>
            </div>
            <Link
              href={upcoming.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Agenda <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Meeting notes</h2>
          <span className="text-[11px] text-muted-foreground">{calls.length} meetings</span>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Each EIPIP meeting with its recording, AI summary, key decisions, and full transcript.
        </p>

        {calls.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No meeting notes have been published yet.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {calls.map((c) => (
              <li key={c.meeting}>
                <Link
                  href={`/calls/eipip/${c.meeting}`}
                  className="flex h-full items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-foreground">EIPIP Meeting #{c.meeting}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" /> {prettyDate(c.date)}
                      </span>
                      {c.decisions > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckSquare className="h-3.5 w-3.5" /> {c.decisions} decisions
                        </span>
                      )}
                      {c.hasVideo && (
                        <span className="inline-flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" /> recording
                        </span>
                      )}
                      {c.hasTranscript && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> transcript
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    Notes <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
