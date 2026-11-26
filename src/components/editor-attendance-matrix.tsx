"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { OfficeHourBenchmarkDrilldown, type DrilldownFilter } from "@/components/office-hour-benchmark-drilldown";

export interface AttendanceColumn {
  meeting: number;
  dateLabel: string;
  fullDate: string;
  editorsPresent: number;
  highlight?: boolean;
  attendance: Record<string, boolean>;
}

export interface AttendanceEditor {
  displayName: string;
  handle: string;
  avatar: string;
}

const CANONICAL_EDITORS: AttendanceEditor[] = [
  {
    displayName: "Sam Wilson",
    handle: "SamWilsn",
    avatar: "https://avatars.githubusercontent.com/SamWilsn?s=96&d=identicon",
  },
  {
    displayName: "Jochem B.",
    handle: "jochem-brouwer",
    avatar: "https://avatars.githubusercontent.com/jochem-brouwer?s=96&d=identicon",
  },
  {
    displayName: "Victor",
    handle: "xinbenlv",
    avatar: "https://avatars.githubusercontent.com/xinbenlv?s=96&d=identicon",
  },
  {
    displayName: "Gajinder Singh",
    handle: "g11tech",
    avatar: "https://avatars.githubusercontent.com/g11tech?s=96&d=identicon",
  },
  {
    displayName: "Matt",
    handle: "lightclient",
    avatar: "https://avatars.githubusercontent.com/lightclient?s=96&d=identicon",
  },
];

// EIPIP meetings attendance data matching the reference screenshot (meetings 123 to 130)
const EIPIP_ATTENDANCE: AttendanceColumn[] = [
  {
    meeting: 123,
    dateLabel: "Jan 21",
    fullDate: "January 21, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: true,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 124,
    dateLabel: "Feb 25",
    fullDate: "February 25, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: true,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 125,
    dateLabel: "Apr 15",
    fullDate: "April 15, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 126,
    dateLabel: "May 27",
    fullDate: "May 27, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 127,
    dateLabel: "Jun 3",
    fullDate: "June 03, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 128,
    dateLabel: "Jul 8",
    fullDate: "July 08, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 129,
    dateLabel: "Aug 12",
    fullDate: "August 12, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 130,
    dateLabel: "Sep 9",
    fullDate: "September 09, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: true,
      lightclient: false,
    },
  },
  {
    meeting: 131,
    dateLabel: "Oct 21",
    fullDate: "October 21, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 132,
    dateLabel: "Nov 18",
    fullDate: "November 18, 2026",
    editorsPresent: 2,
    highlight: true,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
];

// EIP Editing Office Hours attendance (meetings 83 to 120, Jan-Nov 2026)
const OFFICE_HOURS_ATTENDANCE: AttendanceColumn[] = [
  { meeting: 83, dateLabel: "Jan 6", fullDate: "January 06, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 84, dateLabel: "Jan 13", fullDate: "January 13, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: true, g11tech: false, lightclient: false } },
  { meeting: 85, dateLabel: "Jan 20", fullDate: "January 20, 2026", editorsPresent: 3, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: true, lightclient: false } },
  { meeting: 86, dateLabel: "Jan 27", fullDate: "January 27, 2026", editorsPresent: 1, attendance: { SamWilsn: false, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 87, dateLabel: "Feb 3", fullDate: "February 03, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: true, lightclient: false } },
  { meeting: 88, dateLabel: "Feb 10", fullDate: "February 10, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 89, dateLabel: "Feb 17", fullDate: "February 17, 2026", editorsPresent: 4, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: true, g11tech: true, lightclient: false } },
  { meeting: 90, dateLabel: "Feb 24", fullDate: "February 24, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 91, dateLabel: "Mar 3", fullDate: "March 03, 2026", editorsPresent: 1, attendance: { SamWilsn: false, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 92, dateLabel: "Mar 10", fullDate: "March 10, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 93, dateLabel: "Mar 17", fullDate: "March 17, 2026", editorsPresent: 3, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: true, lightclient: false } },
  { meeting: 94, dateLabel: "Mar 24", fullDate: "March 24, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 95, dateLabel: "Mar 31", fullDate: "March 31, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 96, dateLabel: "Apr 7", fullDate: "April 07, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 97, dateLabel: "Apr 14", fullDate: "April 14, 2026", editorsPresent: 1, attendance: { SamWilsn: false, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 98, dateLabel: "May 5", fullDate: "May 05, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 99, dateLabel: "May 12", fullDate: "May 12, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 100, dateLabel: "Jun 2", fullDate: "June 02, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 101, dateLabel: "Jun 9", fullDate: "June 09, 2026", editorsPresent: 1, attendance: { SamWilsn: false, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 102, dateLabel: "Jun 16", fullDate: "June 16, 2026", editorsPresent: 1, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: false, g11tech: false, lightclient: false } },
  { meeting: 103, dateLabel: "Jun 23", fullDate: "June 23, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": false, xinbenlv: true, g11tech: false, lightclient: false } },
  { meeting: 104, dateLabel: "Jun 30", fullDate: "June 30, 2026", editorsPresent: 2, attendance: { SamWilsn: true, "jochem-brouwer": true, xinbenlv: false, g11tech: false, lightclient: false } },
  {
    meeting: 105,
    dateLabel: "Jul 7",
    fullDate: "July 07, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 106,
    dateLabel: "Jul 14",
    fullDate: "July 14, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 107,
    dateLabel: "Jul 21",
    fullDate: "July 21, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: true,
      lightclient: false,
    },
  },
  {
    meeting: 108,
    dateLabel: "Jul 28",
    fullDate: "July 28, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 109,
    dateLabel: "Aug 4",
    fullDate: "August 04, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 110,
    dateLabel: "Aug 11",
    fullDate: "August 11, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 111,
    dateLabel: "Aug 25",
    fullDate: "August 25, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: true,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 112,
    dateLabel: "Sep 1",
    fullDate: "September 01, 2026",
    editorsPresent: 3,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: true,
      lightclient: false,
    },
  },
  {
    meeting: 113,
    dateLabel: "Sep 15",
    fullDate: "September 15, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: false,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 114,
    dateLabel: "Sep 29",
    fullDate: "September 29, 2026",
    editorsPresent: 2,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 115,
    dateLabel: "Oct 13",
    fullDate: "October 13, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: false,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 116,
    dateLabel: "Oct 20",
    fullDate: "October 20, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": false,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 117,
    dateLabel: "Oct 27",
    fullDate: "October 27, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": false,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 118,
    dateLabel: "Nov 3",
    fullDate: "November 03, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: false,
      "jochem-brouwer": true,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 119,
    dateLabel: "Nov 10",
    fullDate: "November 10, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": false,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
  {
    meeting: 120,
    dateLabel: "Nov 24",
    fullDate: "November 24, 2026",
    editorsPresent: 1,
    attendance: {
      SamWilsn: true,
      "jochem-brouwer": false,
      xinbenlv: false,
      g11tech: false,
      lightclient: false,
    },
  },
];

export function EditorAttendanceMatrix({ className }: { className?: string }) {
  const [series, setSeries] = useState<"eipip" | "eipoh">("eipip");
  const [drilldown, setDrilldown] = useState<DrilldownFilter | null>(null);

  const columns = series === "eipip" ? EIPIP_ATTENDANCE : OFFICE_HOURS_ATTENDANCE;

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-4 sm:p-5", className)}>
      {/* Header with Title, Subtitle and Series Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {series === "eipip"
                ? "EIPIP: Meeting Attendance Matrix"
                : "EIP Editing Office Hours: Meeting Attendance Matrix"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Filled dot = attended · Dim dot = absent ·{" "}
            {series === "eipip"
              ? "EIPIP meetings 123 to 132, 2026 (Jan–Nov)."
              : "Office Hour meetings 83 to 120, 2026 (Jan-Nov)."}
          </p>
        </div>

        {/* Series Pill Toggle */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
          <button
            onClick={() => setSeries("eipip")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              series === "eipip"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EIPIP (123–132)
          </button>
          <button
            onClick={() => setSeries("eipoh")}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              series === "eipoh"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Office Hours (83-120)
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[620px]">
          <table className="w-full border-collapse text-left">
            <thead>
              {/* Row 1: Editors Present */}
              <tr className="border-b border-border/40 text-xs text-muted-foreground">
                <th className="w-44 py-2 pr-4 font-normal text-muted-foreground">
                  Editors present
                </th>
                {columns.map((col) => (
                  <th
                    key={`present-${col.meeting}`}
                    className={cn(
                      "px-3 py-2 text-center font-mono font-semibold text-foreground tabular-nums",
                      col.highlight && "bg-muted/40 dark:bg-muted/20"
                    )}
                  >
                    {col.editorsPresent}
                  </th>
                ))}
              </tr>

              {/* Row 2: Meeting Number */}
              <tr className="border-b border-border/60 text-xs">
                <th className="py-2.5 pr-4 font-medium text-foreground/80">
                  Meeting
                </th>
                {columns.map((col) => (
                  <th
                    key={`meeting-${col.meeting}`}
                    className={cn(
                      "px-3 py-2.5 text-center font-mono font-semibold text-foreground tabular-nums",
                      col.highlight && "bg-muted/40 dark:bg-muted/20"
                    )}
                  >
                    <Link
                      href={
                        series === "eipip"
                          ? `/calls/eipip/${col.meeting}`
                          : `/calls/eipoh/${col.meeting}`
                      }
                      className="hover:text-primary transition-colors hover:underline"
                      title={`View ${series === "eipip" ? "EIPIP" : "Office Hour"} #${col.meeting}`}
                    >
                      {col.meeting}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30">
              {/* Rows for each Canonical Editor */}
              {CANONICAL_EDITORS.map((editor) => (
                <tr key={editor.handle} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Image
                        src={editor.avatar}
                        alt={editor.displayName}
                        width={22}
                        height={22}
                        unoptimized
                        className="h-5.5 w-5.5 rounded-full object-cover ring-1 ring-border"
                      />
                      <Link
                        href={`/user/${editor.handle}`}
                        className="text-xs font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {editor.displayName}
                      </Link>
                    </div>
                  </td>

                  {columns.map((col) => {
                    const attended = Boolean(col.attendance[editor.handle]);
                    return (
                      <td
                        key={`${editor.handle}-${col.meeting}`}
                        className={cn(
                          "px-3 py-3 text-center align-middle",
                          col.highlight && "bg-muted/40 dark:bg-muted/20"
                        )}
                        title={`${editor.displayName}: ${attended ? "Attended" : "Absent"} (Meeting #${col.meeting}, ${col.fullDate})`}
                      >
                        <div className="flex items-center justify-center">
                          {attended ? (
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date(`${col.fullDate} UTC`);
                                const iso = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "2026-01-01";
                                setDrilldown({
                                  title: `${editor.displayName} - ${series === "eipip" ? "EIPIP" : "Office Hour"} #${col.meeting} (${col.dateLabel})`,
                                  actor: editor.handle,
                                  from: iso,
                                  to: iso,
                                  metric: "all",
                                });
                              }}
                              title={`Click to view ${editor.displayName}'s PR activity on ${col.fullDate}`}
                              className="h-4 w-4 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30 transition-transform hover:scale-125 cursor-pointer"
                            />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Bottom Row: Dates */}
              <tr className="border-t border-border/60 text-[11px] text-muted-foreground">
                <td className="py-2.5 pr-4 font-normal">Date</td>
                {columns.map((col) => (
                  <td
                    key={`date-${col.meeting}`}
                    className={cn(
                      "px-3 py-2.5 text-center font-mono tabular-nums whitespace-nowrap",
                      col.highlight && "bg-muted/40 dark:bg-muted/20"
                    )}
                  >
                    {col.dateLabel}
                  </td>
                ))}
              </tr>

              {/* Highlight summary row for EIPIP (Sam and Jochem only) */}
              {series === "eipip" && (
                <tr className="text-[11px] text-muted-foreground">
                  <td className="py-2 pr-4 font-normal"></td>
                  {columns.map((col) => {
                    if (col.meeting === 125) {
                      return (
                        <td
                          key="highlight-legend"
                          colSpan={5}
                          className="py-1.5 text-center font-mono text-[11px] font-medium text-foreground/80 bg-muted/40 dark:bg-muted/20 rounded-b-lg border-b border-x border-border/40"
                        >
                          Sam and Jochem only
                        </td>
                      );
                    }
                    if (col.meeting > 125 && col.meeting <= 129) {
                      return null;
                    }
                    return <td key={`empty-${col.meeting}`} className="px-3 py-1.5" />;
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {drilldown && (
        <OfficeHourBenchmarkDrilldown filter={drilldown} onClose={() => setDrilldown(null)} />
      )}
    </section>
  );
}
