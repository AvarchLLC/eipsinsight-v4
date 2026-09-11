'use client';

import React, { useEffect, useRef, useState } from 'react';

export type RacePoint = { label: string; value: number };
export type RaceSeries = {
  key: string;
  label: string;
  sub?: string;
  color: string;
  /** Cumulative values, one per x-bucket (aligned across all series). */
  points: number[];
};

/** Fires once when the element scrolls into view. */
function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Compact number formatter: 7.1M, 735K, 8.4K, 380. */
function compact(n: number): string {
  const v = Math.round(n);
  if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}K`;
  return `${v}`;
}

/** Placeholder shown while a chart's live data is still loading. */
export function LineRaceSkeleton({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3">
        {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex h-[240px] items-center justify-center rounded-lg bg-muted/30">
        <p className="animate-pulse text-xs text-muted-foreground">Loading live mainnet data…</p>
      </div>
    </div>
  );
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2025-07" -> "Jul '25"; passes other strings through. */
function fmtBucket(b: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(b);
  return m ? `${MON[Number(m[2]) - 1]} '${m[1].slice(2)}` : b;
}

// viewBox geometry (title/subtitle live in HTML above the SVG)
const W = 1040;
const H = 452;
const PLOT_L = 60;
const PLOT_R = 806;
const PLOT_T = 18;
const PLOT_B = 404;
const CARD_X = 822;
const CARD_W = 210;
const CARD_H = 44;

/**
 * WatcherGuru-style animated line race. Each series' cumulative line draws out
 * left-to-right over a shared time axis (log Y scale), while a legend card at
 * each line's leading edge counts its running total up. Triggers once on
 * scroll-in and respects prefers-reduced-motion.
 */
export function AnimatedLineRace({
  series,
  buckets,
  title,
  subtitle,
  periodLabel,
  footer,
  format = compact,
  durationMs = 4200,
  endCards = true,
}: {
  series: RaceSeries[];
  /** x-axis bucket labels (e.g. "2025-01"), aligned to every series' points. */
  buckets: string[];
  title?: string;
  subtitle?: string;
  periodLabel?: string;
  footer?: React.ReactNode;
  format?: (n: number) => string;
  durationMs?: number;
  /** Full value cards at each line end (default). When false, a compact dot+label
   *  legend is drawn instead — values come from the hover tooltip. */
  endCards?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [p, setP] = useState(0); // animation progress 0..1

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced()) {
      setP(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const raw = Math.min((t - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setP(eased);
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, durationMs]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{ idx: number; left: number; top: number } | null>(null);

  const n = buckets.length;
  if (n < 2 || !series.length) return null;

  // ── Scales ──
  let maxV = 0;
  let minPos = Infinity;
  for (const s of series) {
    for (const v of s.points) {
      if (v > maxV) maxV = v;
      if (v > 0 && v < minPos) minPos = v;
    }
  }
  if (!Number.isFinite(minPos)) minPos = 1;
  const yLo = Math.pow(10, Math.floor(Math.log10(Math.max(minPos, 1))));
  const yHi = Math.pow(10, Math.ceil(Math.log10(Math.max(maxV, yLo * 10))));
  const logLo = Math.log10(yLo);
  const logHi = Math.log10(yHi);

  const fin = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);
  const xOf = (idx: number) => PLOT_L + (fin(idx) / (n - 1)) * (PLOT_R - PLOT_L);
  const yOf = (v: number) => {
    const lv = Math.log10(Math.max(fin(v, yLo), yLo));
    const f = (lv - logLo) / (logHi - logLo);
    return PLOT_B - fin(f) * (PLOT_B - PLOT_T);
  };

  // Y gridlines at each power of ten.
  const gridPows: number[] = [];
  for (let e = logLo; e <= logHi + 1e-9; e++) gridPows.push(Math.pow(10, e));

  // Reveal cutoff (float index along the shared x-axis).
  const cutoff = p * (n - 1);
  const ci = Math.floor(cutoff);
  const frac = cutoff - ci;

  const valueAt = (pts: number[]) => {
    if (!pts.length) return 0;
    if (ci >= pts.length - 1) return fin(pts[pts.length - 1]);
    return fin(fin(pts[ci]) + (fin(pts[ci + 1]) - fin(pts[ci])) * frac);
  };
  const pathUpTo = (pts: number[]) => {
    const coords: string[] = [];
    const last = Math.min(ci, pts.length - 1);
    for (let k = 0; k <= last; k++) coords.push(`${xOf(k).toFixed(1)},${yOf(pts[k]).toFixed(1)}`);
    if (ci < pts.length - 1) {
      const v = pts[ci] + (pts[ci + 1] - pts[ci]) * frac;
      coords.push(`${xOf(ci + frac).toFixed(1)},${yOf(v).toFixed(1)}`);
    }
    return coords.length ? `M${coords.join('L')}` : '';
  };

  // Endpoint cards: y from current value, collision-resolved top→bottom.
  const endX = xOf(cutoff);
  const cards = series
    .map((s) => ({ s, cur: valueAt(s.points), y: yOf(valueAt(s.points)) }))
    .sort((a, b) => a.y - b.y);
  const gap = CARD_H + 6;
  for (let i = 1; i < cards.length; i++) {
    if (cards[i].y - cards[i - 1].y < gap) cards[i].y = cards[i - 1].y + gap;
  }
  // Clamp the stack within the plot.
  const overflow = cards.length ? cards[cards.length - 1].y + CARD_H / 2 - (H - 8) : 0;
  if (overflow > 0) for (const c of cards) c.y -= overflow;
  for (const c of cards) c.y = Math.max(c.y, PLOT_T + CARD_H / 2);

  // Evenly spaced x-axis ticks (~6, always including first + last).
  const tickCount = Math.min(6, n);
  const xTicks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / (tickCount - 1)) * (n - 1)),
  ).filter((v, i, a) => a.indexOf(v) === i);

  // Map a pointer event to the nearest bucket index.
  const onMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return; // not laid out yet
    const scale = rect.width / W;
    const vbx = (e.clientX - rect.left) / scale;
    if (vbx < PLOT_L - 6 || vbx > PLOT_R + 6) {
      setHover(null);
      return;
    }
    let idx = Math.round(((vbx - PLOT_L) / (PLOT_R - PLOT_L)) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    if (!Number.isFinite(idx)) {
      setHover(null);
      return;
    }
    setHover({ idx, left: e.clientX - rect.left, top: e.clientY - rect.top });
  };

  const hoverX = hover ? xOf(hover.idx) : 0;
  // Tooltip rows for the hovered bucket, biggest first.
  const hoverRows = hover
    ? [...series]
        .map((s) => ({ s, v: fin(s.points[hover.idx]) }))
        .sort((a, b) => b.v - a.v)
    : [];

  return (
    <div ref={ref} className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      {/* HTML header — uses the app's own type + tokens so it matches every other card */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {periodLabel && (
          <p className="shrink-0 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {periodLabel}
          </p>
        )}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={title}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Y gridlines + labels */}
          {gridPows.map((g) => {
            const y = yOf(g);
            return (
              <g key={`g${g}`}>
                <line
                  x1={PLOT_L}
                  y1={y}
                  x2={PLOT_R}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <text x={PLOT_L - 8} y={y + 3.5} fill="var(--muted-foreground)" fontSize={11} textAnchor="end">
                  {compact(g)}
                </text>
              </g>
            );
          })}

        {/* X-axis baseline + ticks */}
        <line x1={PLOT_L} y1={PLOT_B} x2={PLOT_R} y2={PLOT_B} stroke="var(--border)" strokeWidth={1} />
        {xTicks.map((idx) => (
          <text
            key={`xt${idx}`}
            x={xOf(idx)}
            y={PLOT_B + 20}
            fill="var(--muted-foreground)"
            fontSize={11}
            textAnchor={idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle'}
          >
            {fmtBucket(buckets[idx])}
          </text>
        ))}

        {/* Playhead */}
        {p > 0 && p < 1 && (
          <line x1={endX} y1={PLOT_T} x2={endX} y2={PLOT_B} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
        )}

        {/* Lines */}
        {series.map((s) => (
          <path
            key={s.key}
            d={pathUpTo(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Hover guide + per-series markers */}
        {hover && (
          <g pointerEvents="none">
            <line x1={hoverX} y1={PLOT_T} x2={hoverX} y2={PLOT_B} stroke="var(--foreground)" strokeWidth={1} opacity={0.35} />
            {series.map((s) => (
              <circle key={`h${s.key}`} cx={hoverX} cy={yOf(fin(s.points[hover.idx]))} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />
            ))}
          </g>
        )}

        {/* Leading-edge dots + connectors to cards */}
        {cards.map(({ s, cur, y }) => {
          const ly = yOf(cur);
          return (
            <g key={`c${s.key}`}>
              <circle cx={endX} cy={ly} r={3} fill={s.color} />
              <line x1={endX} y1={ly} x2={CARD_X} y2={y} stroke={s.color} strokeWidth={1} opacity={0.35} />
            </g>
          );
        })}

        {/* Legend: full value cards, or a compact dot+label when endCards is off. */}
        {endCards
          ? cards.map(({ s, cur, y }) => (
              <g key={`card${s.key}`} transform={`translate(${CARD_X}, ${y - CARD_H / 2})`}>
                <rect width={CARD_W} height={CARD_H} rx={8} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />
                <rect x={0} y={0} width={3} height={CARD_H} rx={1.5} fill={s.color} />
                <circle cx={18} cy={CARD_H / 2} r={5} fill={s.color} />
                <text x={32} y={19} fill="var(--foreground)" fontSize={12} fontWeight={600}>
                  {s.label}
                </text>
                {s.sub && (
                  <text x={32} y={33} fill="var(--muted-foreground)" fontSize={10}>
                    {s.sub}
                  </text>
                )}
                <text x={CARD_W - 12} y={CARD_H / 2 + 5} fill="var(--foreground)" fontSize={15} fontWeight={700} textAnchor="end">
                  {format(cur)}
                </text>
              </g>
            ))
          : cards.map(({ s, y }) => (
              <g key={`lbl${s.key}`} transform={`translate(${CARD_X}, ${y})`}>
                <circle cx={4} cy={0} r={4} fill={s.color} />
                <text x={15} y={4} fill="var(--foreground)" fontSize={12} fontWeight={600}>
                  {s.label}
                </text>
              </g>
            ))}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-[164px] rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-lg backdrop-blur"
          style={{
            left: hover.left,
            top: hover.top,
            transform: `translate(${hover.left > 320 ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
          }}
        >
            <p className="mb-1.5 font-semibold text-foreground">{fmtBucket(buckets[hover.idx])}</p>
            <div className="space-y-1">
              {hoverRows.map(({ s, v }) => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{format(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {footer && <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">{footer}</div>}
    </div>
  );
}
