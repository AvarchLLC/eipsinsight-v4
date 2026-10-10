'use client';

import { Minus, Plus, RotateCcw } from 'lucide-react';

/** Compact +/- zoom control, pinned top-right of a graph. */
export function ZoomControls({
  zoom,
  onIn,
  onOut,
  onReset,
}: {
  zoom: number;
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
}) {
  const btn =
    'flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:opacity-40';
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center overflow-hidden rounded-lg border border-border bg-card/90 shadow-sm backdrop-blur-sm">
      <button type="button" onClick={onOut} disabled={zoom <= 0.4} className={btn} title="Zoom out" aria-label="Zoom out">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-10 border-x border-border/60 text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" onClick={onIn} disabled={zoom >= 2} className={btn} title="Zoom in" aria-label="Zoom in">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onReset} className={btn + ' border-l border-border/60'} title="Reset zoom" aria-label="Reset zoom">
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  );
}
