import type { ReactElement } from 'react';

/**
 * Shared template for dynamic Open Graph / Twitter cards (next/og ImageResponse).
 * Aligned with the Ledger design system: deep green-charcoal paper, solid
 * high-contrast badge, emerald signal rule, and crisp typography.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const PAPER = '#121715';
const SURFACE = '#18201d';
const FG = '#f2f5f3';
const MUTED = '#a6b3ad';
const ACCENT = '#10b981';
const BORDER = '#2a3631';

export interface OgCardProps {
  /** Short pill label, e.g. "EIP", "ACDT", "PQTS". */
  badge: string;
  /** Pill accent colour (hex). Defaults to the brand emerald. */
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
        background: PAPER,
        padding: 40,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderTop: `5px solid ${badgeTone}`,
          borderRadius: 12,
          padding: 48,
        }}
      >
        {/* Badge + meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                padding: '6px 18px',
                borderRadius: 6,
                background: badgeTone,
                color: '#07120d',
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1.2,
              }}
            >
              {badge}
            </div>
            {meta ? (
              <div style={{ display: 'flex', color: MUTED, fontSize: 24, fontWeight: 500 }}>
                {meta}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', color: badgeTone, fontSize: 20, fontWeight: 700, letterSpacing: 1.5 }}>
            LEDGER RECAP
          </div>
        </div>

        {/* Title + body rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              color: FG,
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -1,
            }}
          >
            {title.slice(0, 88)}
          </div>

          {rows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', color: badgeTone, fontSize: 26, fontWeight: 700 }}>→</div>
                  <div style={{ display: 'flex', color: MUTED, fontSize: 25, lineHeight: 1.38 }}>
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
            paddingTop: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  padding: '6px 16px',
                  borderRadius: 6,
                  background: PAPER,
                  border: `1px solid ${BORDER}`,
                  color: FG,
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: ACCENT,
              }}
            />
            <div style={{ display: 'flex', color: FG, fontSize: 26, fontWeight: 700 }}>
              EIPsInsight.com
            </div>
          </div>
        </div>
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
        background: PAPER,
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
