'use client';

import { cn } from '@/lib/utils';
import { Copy, Check, Activity, Sparkles, TrendingUp, BarChart3, CalendarClock, Package, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { ShareButtons } from '@/components/share-buttons';

export function CopyLinkButton({
  sectionId,
  className,
  tooltipLabel = 'Copy section link',
}: {
  sectionId: string;
  className?: string;
  tooltipLabel?: string;
}) {
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
      title={tooltipLabel}
      aria-label={tooltipLabel}
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
    icon?: keyof typeof iconMap;
    /** Client components only — a component reference can't be serialised from a server page. */
    customIcon?: LucideIcon;
    label?: string;
    pulse?: boolean;
  };
  title: string;
  description?: string;
  className?: string;
  sectionId?: string;
  showCopyLink?: boolean;
  titleAs?: 'h1' | 'h2';
  /**
   * Horizontal padding for the header's *content*. Defaults to the full-bleed page scale.
   *
   * Pages that render the header inside their own constrained container (e.g.
   * `max-w-6xl px-4 sm:px-6`) must pass the same padding the container uses — otherwise
   * the title and copy button sit further in than the sections below them. Passing
   * `px-0` and placing the header inside the padded wrapper is the simplest way.
   *
   * The decorative gradient stays full-bleed regardless; only the text inset changes.
   */
  padding?: string;
  /** Extra classes for the description — e.g. widen or narrow its measure. */
  descriptionClassName?: string;
  /**
   * Pre-filled text for the share buttons. Omit to fall back to the title.
   * Keep it a self-contained sentence — the platform appends the URL after it.
   */
  shareText?: string;
  /** Restrict which platforms appear; defaults to X, Farcaster, LinkedIn, Telegram. */
  sharePlatforms?: React.ComponentProps<typeof ShareButtons>["platforms"];
}

/**
 * String-keyed icons so SERVER components can set an indicator. Passing a component
 * (via `customIcon`) only works from client pages — it can't cross the server→client
 * boundary. Prefer `icon: '<key>'` and add a key here when a page needs a new one.
 */
const iconMap = {
  activity: Activity,
  sparkles: Sparkles,
  trending: TrendingUp,
  chart: BarChart3,
  calendar: CalendarClock,
  package: Package,
  clipboard: ClipboardList,
};

export function PageHeader({
  eyebrow,
  indicator,
  title,
  description,
  className,
  sectionId,
  showCopyLink = true,
  titleAs = 'h1',
  padding = 'px-4 sm:px-6 lg:px-8 xl:px-12',
  descriptionClassName,
  shareText,
  sharePlatforms,
}: PageHeaderProps) {
  const IconComponent = indicator?.customIcon || (indicator?.icon ? iconMap[indicator.icon] : null);

  const TitleTag = titleAs;

  return (
    <section id={sectionId} className={cn('relative w-full', className)}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 via-primary/0 to-transparent" />
      </div>

      <div className={cn('w-full max-w-full pt-10 pb-5 sm:pt-12', padding)}>
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

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              {/* Actions sit inline after the title rather than pinned to the far
                  right of the header: at wide widths the old layout stranded the
                  copy button half a screen away from the thing it copies. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <TitleTag
                  className={cn(
                    'dec-title text-balance font-semibold tracking-tight leading-[1.1]',
                    titleAs === 'h1'
                      ? 'persona-title text-3xl sm:text-4xl'
                      : 'text-xl text-foreground sm:text-2xl'
                  )}
                >
                  {title}
                </TitleTag>
                {(showCopyLink && sectionId) || shareText ? (
                  <ShareButtons
                    text={shareText ?? title}
                    // The copy button is part of this cluster whenever the header
                    // is anchored; otherwise ShareButtons renders share-only.
                    showCopy={Boolean(showCopyLink && sectionId)}
                    platforms={sharePlatforms}
                  />
                ) : null}
              </div>
            </motion.div>

            {description && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                // text-pretty avoids orphans/short trailing lines; 4xl lets the sentence
                // breathe on wide screens instead of wrapping halfway across the page.
                className={cn(
                  'max-w-4xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base',
                  descriptionClassName
                )}
              >
                {description}
              </motion.p>
            )}
          </div>

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
