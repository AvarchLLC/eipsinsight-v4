'use client';

import { cn } from '@/lib/utils';
import { Copy, Check, Activity, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

/** Reusable copy-link button for section headers. Pass sectionId to copy URL with hash. */
export function CopyLinkButton({ sectionId, className }: { sectionId: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 transition-all hover:border-cyan-400/50 dark:hover:border-cyan-400/50 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10",
        className
      )}
      title="Copy section link"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-slate-500 dark:text-slate-400" />
      )}
    </button>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  indicator?: {
    icon?: 'activity' | 'sparkles' | 'trending' | 'chart';
    label?: string;
    pulse?: boolean;
  };
  title: string;
  description?: string;
  className?: string;
  sectionId?: string;
  showCopyLink?: boolean;
}

const iconMap = {
  activity: Activity,
  sparkles: Sparkles,
  trending: TrendingUp,
  chart: BarChart3,
};

export function PageHeader({
  eyebrow,
  indicator,
  title,
  description,
  className,
  sectionId,
  showCopyLink = true,
}: PageHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!sectionId) return;
    
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const IconComponent = indicator?.icon ? iconMap[indicator.icon] : null;

  return (
    <section
      id={sectionId}
      className={cn(
        'relative w-full',
        className
      )}
    >
      <div className="w-full max-w-full px-4 pt-10 pb-4 sm:px-6 sm:pt-12 sm:pb-6 lg:px-8 xl:px-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            {/* Indicator / Eyebrow */}
            {(indicator || eyebrow) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                {indicator && IconComponent && (
                  <div className="relative flex items-center gap-1.5">
                    <div className={cn(
                      "relative flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur-sm transition-all",
                      indicator.pulse 
                        ? "border-primary/40 bg-primary/15 shadow-[0_0_12px_rgba(34,211,238,0.15)]" 
                        : "border-border bg-muted"
                    )}>
                      {indicator.pulse && (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-md bg-primary/25"
                        />
                      )}
                      <IconComponent className={cn(
                        "h-3 w-3 relative z-10",
                        indicator.pulse ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    {indicator.label && (
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {indicator.label}
                      </span>
                    )}
                  </div>
                )}
                {eyebrow && !indicator && (
                  <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium tracking-wide text-cyan-700 dark:text-cyan-200/90 backdrop-blur-sm">
              {eyebrow}
            </span>
                )}
              </motion.div>
        )}

            {/* Title with dec-title class */}
            <motion.h1
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="dec-title text-balance bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
            >
            {title}
            </motion.h1>

        {/* Description */}
        {description && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base"
              >
            {description}
              </motion.p>
        )}
      </div>

          {/* Copy Link Icon */}
          {showCopyLink && sectionId && (
            <motion.button
              onClick={handleCopyLink}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/15 hover:shadow-lg hover:shadow-primary/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Copy section link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}

// Reusable Section Separator Component
export function SectionSeparator({ className }: { className?: string }) {
  return (
    <div className={cn('relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12', className)}>
      <div className="relative flex items-center justify-center">
        {/* Decorative line with gradient */}
        <div className="absolute inset-x-0 flex items-center">
          <div className="w-full border-t border-cyan-400/20" />
        </div>
      </div>
    </div>
  );
}
