'use client';

import { cn } from '@/lib/utils';
import { ThemedLogoGif } from '@/components/themed-logo-gif';

interface InlineBrandLoaderProps {
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function InlineBrandLoader({
  label = 'Loading...',
  size = 'sm',
  className,
}: InlineBrandLoaderProps) {
  const dimension = size === 'sm' ? 24 : 32;
  const outerSize = size === 'sm' ? 'w-14 h-14' : 'w-20 h-20';
  const borderSize = size === 'sm' ? 'border-[2px]' : 'border-[3px]';
  const innerBorderSize = size === 'sm' ? 'border-[1px]' : 'border-[2px]';
  const insetOffset = size === 'sm' ? 'inset-2' : 'inset-3';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-8', className)}>
      <div className={cn('relative', outerSize)}>
        {/* Glow ambient background */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xs animate-pulse" />
        
        {/* Spinning Rings */}
        <div className={cn("absolute inset-0 rounded-full border-primary/10", borderSize)} />
        <div className={cn("absolute inset-0 rounded-full border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin", borderSize)} />
        <div className={cn("absolute rounded-full border-primary/5", insetOffset, innerBorderSize)} />
        <div className={cn("absolute rounded-full border-t-transparent border-r-transparent border-b-primary border-l-transparent animate-spin [animation-duration:1.5s]", insetOffset, innerBorderSize)} />
        
        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ThemedLogoGif
            width={dimension}
            height={dimension}
            className="animate-pulse"
          />
        </div>
      </div>
      {label && (
        <span className={cn('text-muted-foreground font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
      )}
    </div>
  );
}
