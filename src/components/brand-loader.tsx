'use client';

import { cn } from '@/lib/utils';
import { ThemedLogoGif } from '@/components/themed-logo-gif';

interface BrandLoaderProps {
  title?: string;
  description?: string;
  minHeight?: string;
  className?: string;
}

export function BrandLoader({
  title = 'Loading Insights...',
  description = 'Compiling Ethereum Improvement Proposals, analytics, and metadata coordination...',
  minHeight = 'min-h-[400px]',
  className,
}: BrandLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/35 backdrop-blur-md p-8 relative overflow-hidden', minHeight, className)}>
      {/* Glowing backdrop ambient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[110px] pointer-events-none" />
      
      <div className="relative w-20 h-20">
        {/* Glow ambient background */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-xs animate-pulse" />
        
        {/* Spinning Rings */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-3.5 rounded-full border-2 border-primary/5" />
        <div className="absolute inset-3.5 rounded-full border-2 border-t-transparent border-r-transparent border-b-primary border-l-transparent animate-spin [animation-duration:1.5s]" />
        
        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ThemedLogoGif
            width={32}
            height={32}
            className="animate-pulse"
          />
        </div>
      </div>
      
      <h3 className="mt-6 text-base font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm text-center leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export default BrandLoader;
