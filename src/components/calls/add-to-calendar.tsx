'use client';

import { CalendarPlus, Download } from 'lucide-react';

function toCalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function resolveStartDate(occursAt?: string | null, occursOn?: string | null): Date | null {
  if (occursAt) {
    const d = new Date(occursAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (occursOn && /^\d{4}-\d{2}-\d{2}/.test(occursOn)) {
    const d = new Date(`${occursOn.slice(0, 10)}T14:00:00Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function AddToCalendarButton({
  title,
  occursAt,
  occursOn,
  detailsUrl,
  zoomUrl,
  youtubeUrl,
  durationMinutes = 60,
}: {
  title: string;
  occursAt?: string | null;
  occursOn?: string | null;
  detailsUrl?: string | null;
  zoomUrl?: string | null;
  youtubeUrl?: string | null;
  durationMinutes?: number;
}) {
  const start = resolveStartDate(occursAt, occursOn);
  if (!start) return null;

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const startStr = toCalStamp(start);
  const endStr = toCalStamp(end);
  const lines: string[] = [];
  if (zoomUrl) lines.push(`Zoom: ${zoomUrl}`);
  if (youtubeUrl) lines.push(`YouTube Live: ${youtubeUrl}`);
  if (detailsUrl) lines.push(`Agenda & details: ${detailsUrl}`);
  lines.push('Tracked on EIPsInsight: https://eipsinsight.com/calls');
  const details = lines.join('\n');
  const location = zoomUrl || youtubeUrl || detailsUrl || 'https://eipsinsight.com/calls';

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startStr}/${endStr}` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent(details)}`;

  const downloadIcs = () => {
    const uid = `${startStr}-${title.replace(/[^a-z0-9]/gi, '').slice(0, 24)}@eipsinsight.com`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EIPsInsight//Protocol Calls//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toCalStamp(new Date())}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${title.replace(/[\r\n]/g, ' ')}`,
      `LOCATION:${location.replace(/[\r\n]/g, ' ')}`,
      `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      detailsUrl ? `URL:${detailsUrl}` : 'URL:https://eipsinsight.com/calls',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inline-flex shrink-0 items-center gap-1.5">
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Add to Google Calendar"
        className="chip h-7 px-2.5 text-[11px] font-medium"
      >
        <CalendarPlus className="h-3 w-3 text-[var(--brand-strong)]" />
        <span>Google Cal</span>
      </a>
      <button
        type="button"
        onClick={downloadIcs}
        title="Download .ics calendar file (Apple Calendar, Outlook, etc.)"
        className="chip h-7 cursor-pointer px-2 text-[11px] font-mono"
      >
        <Download className="h-3 w-3" />
        <span>.ics</span>
      </button>
    </div>
  );
}
