"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
];

// EIP Editing Office Hours recent attendance (meetings 105 to 112)
const OFFICE_HOURS_ATTENDANCE: AttendanceColumn[] = [
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
];

export function EditorAttendanceMatrix({ className }: { className?: string }) {
  const [series, setSeries] = useState<"eipip" | "eipoh">("eipip");

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
              ? "EIPIP meetings 123 to 130, 2026."
              : "Office Hour meetings 105 to 112, 2026."}
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
            EIPIP (123–130)
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
            Office Hours (105–112)
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
                            <div className="h-4 w-4 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30 transition-transform hover:scale-125" />
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
    </section>
  );
}
