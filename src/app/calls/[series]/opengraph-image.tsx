import { ImageResponse } from 'next/og';
import { getCachedRecentCalls } from '@/lib/upgrade-data.server';
import { callSeriesLabel, callSeriesShort } from '@/data/call-series';
import { OFFICE_HOUR_SERIES, OFFICE_HOUR_RECAPS } from '@/data/office-hour-recaps';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/**
 * Series landing social card (/calls/<series>). Share intents can't attach an
 * image — the picture in a shared post comes from these OG tags, which every
 * platform fetches itself. Uses the shared ogCard template so the whole site's
 * previews look consistent.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIPsInsight protocol call series';

type Props = { params: Promise<{ series: string }> };

export default async function Image({ params }: Props) {
  const { series } = await params;
  const label = callSeriesLabel(series);

  const dbDates = (await getCachedRecentCalls(300))
    .filter((c) => c.series === series)
    .map((c) => ({ date: c.occurred_on, transcript: Boolean(c.has_transcript) }));

  const staticDates = OFFICE_HOUR_SERIES.has(series)
    ? OFFICE_HOUR_RECAPS.filter((r) => r.series === series).map((r) => ({ date: r.dateISO, transcript: true }))
    : [];

  const all = [...dbDates, ...staticDates].filter((d) => d.date);
  const count = all.length;
  const withTranscript = all.filter((d) => d.transcript).length;
  const sorted = all.map((d) => String(d.date).slice(0, 10)).sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const meta = count > 0 && first && last ? (first === last ? first : `${first} → ${last}`) : undefined;

  const chips = [
    count > 0 ? `${count} call${count === 1 ? '' : 's'}` : null,
    withTranscript > 0 ? `${withTranscript} transcript${withTranscript === 1 ? '' : 's'}` : null,
    'Recordings',
    'Summaries',
  ].filter(Boolean) as string[];

  return new ImageResponse(
    ogCard({
      badge: callSeriesShort(series),
      meta,
      title: `${label} calls`,
      rows: ['Recordings, summaries, decisions, and transcripts', 'One page per call, sorted by meeting date'],
      chips,
    }),
    size,
  );
}
