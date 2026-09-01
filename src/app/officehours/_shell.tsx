"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: typeof CalendarClock; exact?: boolean }[] = [
  { href: "/officehours", label: "Overview", icon: CalendarClock, exact: true },
  { href: "/officehours/board", label: "Board", icon: LayoutDashboard },
  { href: "/officehours/calls", label: "Calls", icon: Video },
];

/**
 * Persistent tab shell for the Office Hours hub. The tab bar preserves the
 * current query string (filters live in the URL) so switching tabs keeps the
 * active date range / repos.
 */
export function OfficeHoursShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = typeof window !== "undefined" ? window.location.search : "";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-6 sm:px-5">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="dec-title persona-title text-2xl font-semibold tracking-tight sm:text-3xl">EIP Editing Office Hours</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Editorial activity, review board, breakdowns, and calls</p>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={`${t.href}${search}`}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
  );
}
