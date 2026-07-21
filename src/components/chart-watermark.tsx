import { cn } from '@/lib/utils';

/**
 * Small "EIPsInsight.com" attribution watermark for charts.
 * Drop inside a `position: relative` chart container.
 */
export function ChartWatermark({
  className,
  position = 'bottom-right',
}: {
  className?: string;
  position?: 'bottom-right' | 'center' | 'one-third';
}) {
  const positionClass =
    position === 'one-third'
      ? 'top-[33%] left-[33%] -translate-x-1/2 -translate-y-1/2'
      : position === 'center'
      ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
      : 'bottom-2 right-2';

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-10 select-none rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 backdrop-blur-sm',
        positionClass,
        className,
      )}
    >
      EIPsInsight.com
    </div>
  );
}
