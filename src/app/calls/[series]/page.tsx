import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, FileText } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getCachedRecentCalls } from '@/lib/upgrade-data.server';
import { callSeriesLabel, callSeriesShort, callSeriesBadgeClass } from '@/data/call-series';
import { OFFICE_HOUR_SERIES, OFFICE_HOUR_RECAPS } from '@/data/office-hour-recaps';

export const revalidate = 300;

type Props = { params: Promise<{ series: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const label = callSeriesLabel(series);
  return buildMetadata({
    title: `${label} calls`,
    description: `Recordings, summaries, decisions, and transcripts for the ${label} protocol call series.`,
    path: `/calls/${series}`,
  });
}

type Row = { number: string; title: string; date: string; href: string; hasTranscript: boolean };

/**
 * Series landing page: lists every call in one series (e.g. /calls/ethproofs,
 * /calls/acde), each linking to /calls/<series>/<number>. Merges DB-backed calls
 * with the static office-hour-style recaps (ethproofs, eipoh, eipip).
 */
export default async function CallSeriesPage({ params }: Props) {
  const { series } = await params;

  const dbRows: Row[] = (await getCachedRecentCalls(300))
    .filter((c) => c.series === series)
    .map((c) => {
      const number = String(c.call_number ?? c.call_id);
      return {
        number,
        title: c.display_name ?? `${callSeriesShort(series)} ${number}`,
        date: c.occurred_on,
        href: `/calls/${series}/${number}`,
        hasTranscript: Boolean(c.has_transcript),
      };
    });

  const staticRows: Row[] = OFFICE_HOUR_SERIES.has(series)
    ? OFFICE_HOUR_RECAPS.filter((r) => r.series === series).map((r) => ({
        number: String(r.meeting),
        title: r.title,
        date: r.dateISO,
        href: `/calls/${series}/${r.meeting}`,
        hasTranscript: true,
      }))
    : [];

  // De-dupe by href (a call could exist in both sources), keep the DB copy first.
  const seen = new Set<string>();
  const rows = [...dbRows, ...staticRows]
    .filter((r) => (seen.has(r.href) ? false : (seen.add(r.href), true)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const label = callSeriesLabel(series);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/calls" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All protocol calls
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            callSeriesBadgeClass(series),
          )}
        >
          {callSeriesShort(series)}
        </span>
        <h1 className="dec-title text-2xl font-semibold tracking-tight text-foreground">{label}</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length === 0
          ? 'No calls found for this series yet.'
          : `${rows.length} call${rows.length === 1 ? '' : 's'} with recordings, summaries, and transcripts.`}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Nothing here yet. Browse{' '}
          <Link href="/calls" className="underline transition-colors hover:text-foreground">
            all protocol calls
          </Link>
          , or check back after the next scheduler sync.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60">
          {rows.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <span className="min-w-0 text-sm font-medium text-foreground">{r.title}</span>
                {r.hasTranscript && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-3 w-3" /> transcript
                  </span>
                )}
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {r.date?.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
