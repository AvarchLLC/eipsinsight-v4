'use client';

import { Play } from 'lucide-react';

function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/** Clickable decision timestamp that seeks the on-page call video. */
export function DecisionTimestamp({ timestamp }: { timestamp: string }) {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(new CustomEvent('call:seek', { detail: toSeconds(timestamp) }))
      }
      className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
      title="Jump to this moment in the recording"
    >
      <Play className="h-2.5 w-2.5" />
      {timestamp}
    </button>
  );
}
