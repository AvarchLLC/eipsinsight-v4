import React from 'react';

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
        <span className="font-medium text-foreground/90">EIPsInsight.com</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          Next Update: {formatFooterDate(effectiveNextUpdate)}
        </span>
      </div>
    </div>
  );
}

export default ChartFooter;
