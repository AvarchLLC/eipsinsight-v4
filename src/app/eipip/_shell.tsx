"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: typeof CalendarClock; exact?: boolean }[] = [
  { href: "/eipip", label: "Overview", icon: CalendarClock, exact: true },
  { href: "/eipip/calls", label: "Meetings", icon: Video },
];

/** Persistent tab shell for the EIPIP (EIP Improvement Process WG) hub. */
export function EipipShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-7xl space-y-3 px-3 py-4 sm:px-5">
      <header className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h1 className="dec-title persona-title text-lg font-semibold tracking-tight sm:text-xl">EIPIP Meetings</h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">EIP Improvement Process working group: editorial activity, pull requests, and recaps</p>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
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
