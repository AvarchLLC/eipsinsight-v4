import type { ReactNode } from "react";

/**
 * How every Ledger section opens (docs/DESIGN.md §4): a full-strength ink rule,
 * a mono eyebrow with an optional index number, a serif title, and an optional
 * description and action.
 */
export function SectionHead({
  index,
  eyebrow,
  title,
  description,
  action,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center">
        <span className="h-px w-10 bg-[var(--brand)]" />
        <span className="h-px flex-1 bg-[var(--ink)]" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="eyebrow mb-1.5">
              {index ? <span className="text-[var(--brand-strong)]">{index}</span> : null}
              {index ? "  " : null}
              {eyebrow}
            </p>
          ) : null}
          <h2 className="t-h2">{title}</h2>
          {description ? <p className="t-lead mt-2">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
