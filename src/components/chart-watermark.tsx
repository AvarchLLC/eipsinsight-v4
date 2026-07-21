import { cn } from '@/lib/utils';

/**
 * Small "EIPsInsight.com" attribution watermark for charts.
 * Drop inside a `position: relative` chart container.
 */
export function ChartWatermark({
  className,
  position = 'center',
}: {
  className?: string;
  position?: 'bottom-right' | 'center' | 'one-third';
}) {
  if (position === 'center') {
    return (
      <div aria-hidden className={cn('pointer-events-none absolute inset-0 z-0 flex items-center justify-center select-none', className)}>
        <span className="text-xs sm:text-sm font-bold tracking-[0.14em] uppercase text-foreground/12 dark:text-foreground/16">
          EIPsInsight.com
        </span>
      </div>
    );
  }

  const positionClass =
    position === 'one-third'
      ? 'top-[33%] left-[33%] -translate-x-1/2 -translate-y-1/2 z-10 rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 backdrop-blur-sm'
      : 'bottom-2 right-2 z-10 rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 backdrop-blur-sm';

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute select-none', positionClass, className)}
    >
      EIPsInsight.com
    </div>
  );
}
