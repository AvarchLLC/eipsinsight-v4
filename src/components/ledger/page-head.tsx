import type { ReactNode } from "react";

/**
 * Ledger masthead for index and profile pages (docs/DESIGN.md §4).
 * A bg-surface band with a bottom hairline: eyebrow or breadcrumb, the h1,
 * a lead, and optional page-level facts.
 */
export function PageHead({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="masthead">
      <div className="wrap py-7 sm:py-9">
        {eyebrow ? (
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="inline-block h-[7px] w-[7px] rounded-[1px] bg-[var(--brand)]" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="t-h1">{title}</h1>
        {lead ? <p className="t-lead mt-3">{lead}</p> : null}
        {children ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--border)] pt-4 text-[var(--ink-faint)]">
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}
