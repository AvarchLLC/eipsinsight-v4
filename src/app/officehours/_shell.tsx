"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarClock, GitPullRequest, LayoutDashboard, Users, UserCheck, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: typeof CalendarClock; exact?: boolean }[] = [
  { href: "/officehours", label: "Overview", icon: CalendarClock, exact: true },
  { href: "/officehours/board", label: "Board", icon: LayoutDashboard },
  { href: "/officehours/prs", label: "PR Analytics", icon: GitPullRequest },
  { href: "/officehours/editors", label: "Editors", icon: Users },
  { href: "/officehours/reviewers", label: "Reviewers", icon: UserCheck },
  { href: "/officehours/calls", label: "Calls", icon: Video },
];

/**
 * Persistent tab shell for the Office Hours hub. The tab bar preserves the
 * current query string (filters live in the URL) so switching tabs keeps the
 * active date range / repos.
 */
export function OfficeHoursShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Only append the query string AFTER mount. Server and first client render both
  // emit bare hrefs (matching), so the tab links never hit a hydration mismatch
  // that would detach their click handlers. The query fills in once hydrated.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const qs = searchParams.toString();
  const search = mounted && qs ? `?${qs}` : "";

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="wrap space-y-4 py-5 sm:py-6">
        <header className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-strong)]">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-normal tracking-tight text-[var(--ink)] sm:text-2xl">
              EIP Editing Office Hours
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              Editorial activity, review board, breakdowns, and calls
            </p>
          </div>
        </header>

        <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={`${t.href}${search}`}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs sm:text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--ink)] text-[var(--ink)] font-semibold"
                    : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}
