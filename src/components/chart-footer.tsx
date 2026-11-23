import React from 'react';
import { ThemedLogoGif } from '@/components/themed-logo-gif';

function formatFooterDate(value: Date | null): string {
  if (!value) return '—';
  const dd = String(value.getDate()).padStart(2, '0');
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const yyyy = value.getFullYear();
  const hh = value.toLocaleString('en-US', { hour: '2-digit', hour12: true }).slice(0, 2);
  const min = value.toLocaleString('en-US', { minute: '2-digit' });
  const ap = value.toLocaleString('en-US', { hour: '2-digit', hour12: true }).slice(-2).toUpperCase();
  return `${dd}-${mm}-${yyyy} ${hh}:${min} ${ap}`;
}

export function ChartFooter({ nextUpdateAt }: { nextUpdateAt?: Date | null }) {
  const effectiveNextUpdate = nextUpdateAt ?? new Date(Date.now() + 6 * 60 * 60 * 1000);

  return (
    <div className="mt-3 border-t border-border/70 pt-2.5">
      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ThemedLogoGif alt="EIPsInsight" width={16} height={16} unoptimized />
          <span className="font-serif text-xs font-semibold tracking-tight text-foreground/90">
            EIPsInsight<span className="text-primary/70">.com</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" />
          Next Update: {formatFooterDate(effectiveNextUpdate)}
        </span>
      </div>
    </div>
  );
}

export default ChartFooter;
