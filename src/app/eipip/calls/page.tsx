import Link from "next/link";
import { ArrowUpRight, CalendarClock, FileText, Video } from "lucide-react";
import { EIPIP_MEETINGS } from "@/data/eipip-meetings.generated";
import { OFFICE_HOUR_RECAPS, officeHourCallPath } from "@/data/office-hour-recaps";

export const revalidate = 300;

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

type MeetingCard = {
  meeting: number;
  dateISO: string;
  timeUTC: string | null;
  issueUrl: string;
  badge: "Next" | "Previous" | "Recap";
  hasRecap: boolean;
};

export default function EipipCallsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const recapMeetings = new Set(OFFICE_HOUR_RECAPS.filter((r) => r.series === "eipip").map((r) => r.meeting));

  // Only surface the meetings that matter: the next upcoming, the most recent
  // past, and any meeting that has a written recap. No long backfilled list.
  const upcoming = [...EIPIP_MEETINGS].filter((m) => m.dateISO > today).sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0] ?? null;
  const previous = EIPIP_MEETINGS.find((m) => m.dateISO <= today) ?? null;
  const recaps = EIPIP_MEETINGS.filter((m) => recapMeetings.has(m.meeting));

  const seen = new Set<number>();
  const cards: MeetingCard[] = [];
  const push = (m: (typeof EIPIP_MEETINGS)[number] | null, badge: MeetingCard["badge"]) => {
    if (!m || seen.has(m.meeting)) return;
    seen.add(m.meeting);
    cards.push({ meeting: m.meeting, dateISO: m.dateISO, timeUTC: m.timeUTC, issueUrl: m.issueUrl, badge, hasRecap: recapMeetings.has(m.meeting) });
  };
  // Recaps first (most useful), then previous, then next.
  recaps.forEach((m) => push(m, "Recap"));
  push(previous, "Previous");
  push(upcoming, "Next");
  cards.sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const BADGE: Record<MeetingCard["badge"], string> = {
    Next: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Previous: "border-border bg-muted/60 text-muted-foreground",
    Recap: "border-primary/30 bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        The next and most recent EIPIP meetings, plus any with a written recap. Recaps open a summary here; the rest
        link to their GitHub agenda.
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {cards.map((m) => {
          const href = m.hasRecap ? officeHourCallPath({ series: "eipip", meeting: m.meeting } as never) : m.issueUrl;
          const external = !m.hasRecap;
          return (
            <li key={m.meeting}>
              <Link
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">EIPIP #{m.meeting}</span>
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold ${BADGE[m.badge]}`}>
                      {m.badge}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {prettyDate(m.dateISO)}
                    {m.timeUTC ? ` · ${m.timeUTC} UTC` : ""}
                  </span>
                </span>
                {m.hasRecap ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
                    <Video className="h-3.5 w-3.5" /> Recap
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Agenda <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
