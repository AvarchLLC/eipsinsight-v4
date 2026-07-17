import { cn } from '@/lib/utils';

/**
 * Small "EIPsInsight.com" attribution watermark for charts.
 * Drop inside a `position: relative` chart container.
 */
export function ChartWatermark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-2 right-2 z-10 select-none rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 backdrop-blur-sm',
        className,
      )}
    >
      EIPsInsight.com
    </div>
  );
}
