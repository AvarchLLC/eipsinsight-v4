import type { ReactElement } from 'react';

/**
 * Shared template for dynamic Open Graph / Twitter cards (next/og ImageResponse).
 *
 * Every page that wants a rich link preview renders one of these instead of the
 * static site logo. Keep to plain flexbox and system fonts: ImageResponse runs a
 * minimal layout engine (no CSS grid), and remote fonts/images would slow every
 * crawl. One template = one consistent look across the whole site.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const BG = '#0A0A0A';
const FG = '#FAFAFA';
const MUTED = '#8B8B8B';
const ACCENT = '#34D399';
const BORDER = '#262626';

export interface OgCardProps {
  /** Short pill label, e.g. "EIP", "ACDT", "UPGRADE". */
  badge: string;
  /** Pill accent colour (hex). Defaults to the brand green. */
  badgeTone?: string;
  /** Secondary text beside the badge, e.g. a date or status. */
  meta?: string;
  /** Main heading. */
  title: string;
  /** Body lines, each rendered with a "→" marker (max ~2 render well). */
  rows?: string[];
  /** Footer fact chips, e.g. ["Core", "Draft", "3 authors"]. */
  chips?: string[];
}

/** Build the card JSX for `new ImageResponse(ogCard(...), { ...OG_SIZE })`. */
export function ogCard({
  badge,
  badgeTone = ACCENT,
  meta,
  title,
  rows = [],
  chips = [],
}: OgCardProps): ReactElement {
  return (
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
      {/* Badge + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            padding: '8px 20px',
            borderRadius: 999,
            border: `1px solid ${badgeTone}55`,
            background: `${badgeTone}1A`,
            color: badgeTone,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {badge}
        </div>
        {meta ? <div style={{ display: 'flex', color: MUTED, fontSize: 28 }}>{meta}</div> : null}
      </div>

      {/* Title + body rows */}
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
          {title.slice(0, 90)}
        </div>

        {rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', color: badgeTone, fontSize: 28 }}>→</div>
                <div style={{ display: 'flex', color: MUTED, fontSize: 28, lineHeight: 1.4 }}>
                  {row}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Chips + brand */}
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
          {chips.map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                padding: '8px 18px',
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                color: MUTED,
                fontSize: 24,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', color: FG, fontSize: 30, fontWeight: 700 }}>EIPsInsight</div>
      </div>
    </div>
  );
}

/** Centered brand-only fallback for missing/errored data. */
export function ogFallback(text = 'EIPsInsight'): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BG,
        color: FG,
        fontSize: 64,
        fontWeight: 700,
        fontFamily: 'sans-serif',
      }}
    >
      {text}
    </div>
  );
}
