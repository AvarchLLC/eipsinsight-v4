import { ImageResponse } from 'next/og';
import { getCachedCall } from '@/lib/upgrade-data.server';
import { callDisplayName, callSeriesShort } from '@/data/call-series';
import type { KeyDecision } from '@/components/upgrade/key-decisions';
import { ogCard, ogFallback, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';
import { OFFICE_HOUR_SERIES, findOfficeHourRecap } from '@/data/office-hour-recaps';

/**
 * Per-call social card. Share intents can't attach an image — the picture in a
 * shared post comes from these OG tags, which every platform fetches itself.
 * Uses the shared ogCard template so every page's preview looks consistent.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIPsInsight protocol call summary';

type Props = { params: Promise<{ series: string; number: string }> };

export default async function Image({ params }: Props) {
  const { series, number } = await params;
  const call = await getCachedCall(series, number);

  if (!call) {
    // Static office-hour / EIPIP recaps aren't in the call DB, so build their
    // card from the hand-curated recap instead of falling back to the site logo.
    if (OFFICE_HOUR_SERIES.has(series)) {
      const recap = findOfficeHourRecap(series, number);
      if (recap) {
        const decisionCount = recap.keyDecisions?.length ?? recap.decisions.length;
        const mergedCount = recap.prs.filter((p) => p.status === 'MERGED').length;
        const clip = (t: string, max: number) => {
          const clean = String(t ?? '').replace(/\s+/g, ' ').trim();
          if (clean.length <= max) return clean;
          const cut = clean.slice(0, max - 1);
          return `${cut.slice(0, cut.lastIndexOf(' ')) || cut}…`;
        };
        const rows = (recap.keyDecisions?.map((d) => d.original_text) ?? recap.decisions)
          .slice(0, 2)
          .map((t) => clip(t, 110));
        const chips = [
          recap.prs.length > 0 ? `${recap.prs.length} PRs reviewed` : null,
          mergedCount > 0 ? `${mergedCount} merged` : null,
          decisionCount > 0 ? `${decisionCount} decisions` : null,
          recap.youtube ? 'Recording' : null,
        ].filter(Boolean) as string[];
        return new ImageResponse(
          ogCard({
            badge: callSeriesShort(recap.series),
            meta: recap.displayDate,
            title: recap.title,
            rows,
            chips,
          }),
          size
        );
      }
    }
    return new ImageResponse(ogFallback(), size);
  }

  const payload = call.key_decisions as
    | KeyDecision[]
    | { key_decisions?: KeyDecision[] }
    | null;
  const decisions: KeyDecision[] = Array.isArray(payload)
    ? payload
    : (payload?.key_decisions ?? []);

  // Two decisions is what fits without the card turning into a wall of text.
  const rows = decisions.slice(0, 2).map((d) => {
    const text = typeof d === 'string' ? d : (d.original_text ?? '');
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 110);
  });

  const chips = [
    decisions.length > 0 ? `${decisions.length} decisions` : null,
    call.has_transcript ? 'Transcript' : null,
    call.tldr ? 'AI summary' : null,
    call.video_url ? 'Recording' : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    ogCard({
      badge: callSeriesShort(call.series),
      meta: call.occurred_on,
      title: callDisplayName(call),
      rows,
      chips,
    }),
    size
  );
}
