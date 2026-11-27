import type { LucideIcon } from 'lucide-react';
import { CopyLinkButton } from '@/components/header';
import { cn } from '@/lib/utils';

/**
 * Standard section block for the /upgrade tree, matching the pattern established on
 * /upgrade/archive: a divider, then an icon + linkable heading + sub-description,
 * then the section body.
 *
 * Using one component (rather than repeating the markup per page) is what keeps the
 * upgrade pages visually consistent — this is exactly where they drifted apart before.
 *
 * IMPORTANT: the parent container must NOT use `space-y-*`. This returns a fragment
 * (divider + section), so a parent `space-y` inserts a gap between the divider and its
 * own heading, doubling the spacing around every rule. Spacing lives here (pt/pb).
 */
export function UpgradeSection({
  id,
  icon: Icon,
  title,
  description,
  action,
  separator = true,
  className,
  children,
}: {
  /** Anchor id — also what the copy-link button copies (/path#id). */
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional right-aligned control (e.g. a "View all" link or a filter). */
  action?: React.ReactNode;
  /** Set false for the first section when it directly follows the page header. */
  separator?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 pt-6 pb-8', className)}>
      {separator && (
        <div className="mb-4 flex items-center" aria-hidden>
          <span className="h-px w-10 bg-[var(--brand)]" />
          <span className="h-px flex-1 bg-[var(--ink)]" />
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-[var(--brand-strong)]" />
            <h2 className="t-h2 text-balance text-xl sm:text-2xl text-[var(--ink)]">
              {title}
            </h2>
            <CopyLinkButton sectionId={id} tooltipLabel="Copy link" />
          </div>
          {description && (
            <p className="t-lead mt-1.5 max-w-4xl text-pretty">
              {description}
            </p>
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
