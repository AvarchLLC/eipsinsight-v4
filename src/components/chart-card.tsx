'use client';

import type { ReactNode } from 'react';
import { CopyLinkButton } from '@/components/header';
import { cn } from '@/lib/utils';

/**
 * Standard framed chart container: a titled card with an anchor id and a
 * copy-link button, an optional right-aligned toolbar (view tabs, a legend),
 * and an optional description under the title.
 *
 * Using one component across the dashboards keeps every chart linkable and
 * consistently labelled — the header, copy-link, and spacing live here rather
 * than being re-implemented per chart.
 */
export function ChartCard({
  id,
  title,
  description,
  toolbar,
  className,
  bodyClassName,
  children,
}: {
  /** Anchor id — what the copy-link button points at (/path#id). Must be unique on the page. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls (view tabs, legend, toggles). */
  toolbar?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 rounded-xl border border-border bg-card/60 p-4', className)}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="group flex items-center gap-1.5">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            <CopyLinkButton
              sectionId={id}
              tooltipLabel="Copy chart link"
              className="h-6 w-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            />
          </div>
          {description && (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
