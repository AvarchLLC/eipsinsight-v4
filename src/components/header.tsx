'use client';

import { cn } from '@/lib/utils';
import { Copy, Check, Activity, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

export function CopyLinkButton({ sectionId, className }: { sectionId: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 backdrop-blur-sm',
        'transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className
      )}
      title="Copy section link"
      aria-label="Copy section link"
      type="button"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
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
  const IconComponent = indicator?.icon ? iconMap[indicator.icon] : null;

  const handleCopyLink = async () => {
    if (!sectionId) return;

    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <section id={sectionId} className={cn('relative w-full', className)}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 via-primary/0 to-transparent" />
      </div>

      <div className="w-full max-w-full px-4 pt-10 pb-5 sm:px-6 sm:pt-12 lg:px-8 xl:px-12">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {(indicator || eyebrow) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2"
              >
                {indicator && IconComponent ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'relative grid h-7 w-7 place-items-center rounded-md border border-border bg-muted/60 backdrop-blur-sm',
                        'transition-colors',
                        indicator.pulse && 'border-primary/40 bg-primary/10 shadow-lg shadow-primary/20'
                      )}
                      aria-hidden
                    >
                      {indicator.pulse && (
                        <motion.div
                          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-md bg-primary/15"
                        />
                      )}
                      <IconComponent
                        className={cn('relative z-10 h-3.5 w-3.5', indicator.pulse ? 'text-primary' : 'text-muted-foreground')}
                      />
                    </div>

                    {indicator.label && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {indicator.label}
                      </span>
                    )}
                  </div>
                ) : eyebrow ? (
                  <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {eyebrow}
                  </span>
                ) : null}
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl"
            >
              {title}
            </motion.h1>

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

          {showCopyLink && sectionId && (
            <motion.button
              onClick={handleCopyLink}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/60 backdrop-blur-sm',
                'transition-colors hover:border-primary/40 hover:bg-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
              )}
              title="Copy section link"
              aria-label="Copy section link"
              type="button"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
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
      <div className="relative my-2">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="mx-auto -mt-px h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
}
