"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Video, CalendarClock, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: typeof Boxes; exact?: boolean }[] = [
  { href: "/aa", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/aa/calls", label: "Calls", icon: Video },
  { href: "/aa/eip-7702", label: "EIP-7702", icon: Fingerprint },
  { href: "/aa/eip-8141", label: "EIP-8141", icon: CalendarClock },
];

/** Persistent tab shell for the Account Abstraction hub. */
export function AaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Avoid a hydration mismatch on active state by only trusting pathname after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <header className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Boxes className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="dec-title persona-title text-xl font-semibold tracking-tight sm:text-2xl">Account Abstraction</h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">Live on-chain usage, the proposal family, native-AA work, and related calls</p>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = mounted && (t.exact ? pathname === t.href : pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
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
