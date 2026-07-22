import { ImageResponse } from 'next/og';
import { getCachedCall } from '@/lib/upgrade-data.server';
import { callDisplayName, callSeriesShort } from '@/data/call-series';
import type { KeyDecision } from '@/components/upgrade/key-decisions';

/**
 * Per-call social card.
 *
 * Share intents cannot attach an image — X's intent endpoint takes text/url only.
 * The picture in a shared post comes from the page's OG tags, which every platform
 * fetches for itself. Without this route every call shared the same static logo;
 * now each one renders its own summary, so the post carries real content.
 *
 * Kept to plain divs and system fonts: ImageResponse runs a minimal layout engine
 * (flex only, no CSS grid) and remote font/image fetches would slow every crawl.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export const alt = 'EIPsInsight protocol call summary';

type Props = { params: Promise<{ series: string; number: string }> };

const BG = '#0A0A0A';
const FG = '#FAFAFA';
const MUTED = '#8B8B8B';
const ACCENT = '#34D399';
const BORDER = '#262626';

export default async function Image({ params }: Props) {
  const { series, number } = await params;
  const call = await getCachedCall(series, number);

  if (!call) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: BG,
            color: FG,
            fontSize: 48,
          }}
        >
          EIPsInsight
        </div>
      ),
      size
    );
  }

  const payload = call.key_decisions as
    | KeyDecision[]
    | { key_decisions?: KeyDecision[] }
    | null;
  const decisions: KeyDecision[] = Array.isArray(payload)
    ? payload
    : (payload?.key_decisions ?? []);

  // Two decisions is what fits without the card turning into a wall of text.
  const preview = decisions.slice(0, 2).map((d) => {
    const text = typeof d === 'string' ? d : (d.original_text ?? '');
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 110);
  });

  const facts = [
    decisions.length > 0 ? `${decisions.length} decisions` : null,
    call.has_transcript ? 'Transcript' : null,
    call.tldr ? 'AI summary' : null,
    call.video_url ? 'Recording' : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG,
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Series + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              padding: '8px 20px',
              borderRadius: 999,
              border: `1px solid ${ACCENT}55`,
              background: `${ACCENT}1A`,
              color: ACCENT,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {callSeriesShort(call.series)}
          </div>
          <div style={{ display: 'flex', color: MUTED, fontSize: 28 }}>
            {call.occurred_on}
          </div>
        </div>

        {/* Title + decision preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              color: FG,
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            {callDisplayName(call).slice(0, 90)}
          </div>

          {preview.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {preview.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', color: ACCENT, fontSize: 28 }}>→</div>
                  <div style={{ display: 'flex', color: MUTED, fontSize: 28, lineHeight: 1.4 }}>
                    {d}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Facts + branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            {facts.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  fontSize: 24,
                }}
              >
                {f}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', color: FG, fontSize: 30, fontWeight: 700 }}>
            EIPsInsight
          </div>
        </div>
      </div>
    ),
    size
  );
}
