'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Copies a deep link to a specific on-page anchor (e.g. a single chart) to the
 * clipboard, so a chart can be shared or cited directly. Icon-only with a brief
 * "copied" checkmark; degrades silently where the clipboard is unavailable.
 */
export function CopyAnchorButton({ anchor, className }: { anchor: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked (insecure context / permissions) — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy link to this chart"
      aria-label="Copy link to this chart"
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
    </button>
  );
}
