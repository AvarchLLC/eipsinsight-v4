import React from 'react';
import { ThemedLogoGif } from '@/components/themed-logo-gif';
import { cn } from '@/lib/utils';

/**
 * "EIPsInsight.com" attribution watermark for charts with the platform logo
 * and navbar serif typography.
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
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 z-0 flex items-center justify-center gap-2 select-none opacity-20 dark:opacity-25',
          className
        )}
      >
        <ThemedLogoGif alt="" width={22} height={22} unoptimized className="opacity-80 grayscale contrast-125" />
        <span className="font-serif text-sm sm:text-base font-semibold tracking-tight text-foreground">
          EIPsInsight<span className="text-primary/80">.com</span>
        </span>
      </div>
    );
  }

  const positionClass =
    position === 'one-third'
      ? 'top-[33%] left-[33%] -translate-x-1/2 -translate-y-1/2 z-10 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 backdrop-blur-sm'
      : 'bottom-2 right-2 z-10 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 backdrop-blur-sm';

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute flex items-center gap-1.5 select-none opacity-60 dark:opacity-75',
        positionClass,
        className
      )}
    >
      <ThemedLogoGif alt="" width={14} height={14} unoptimized />
      <span className="font-serif text-[10px] font-semibold tracking-tight text-foreground">
        EIPsInsight.com
      </span>
    </div>
  );
}
