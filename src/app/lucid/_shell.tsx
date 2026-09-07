'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, LayoutDashboard, FileText, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/lucid', label: 'Dashboard & MEV', icon: LayoutDashboard, exact: true },
  { href: '/lucid/calls', label: 'Working Group Calls', icon: Video },
  { href: '/eip/8184', label: 'EIP-8184 Spec', icon: FileText },
];

/** Persistent tab shell for the Lucid Encrypted Mempool hub. */
export function LucidShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500 border border-violet-500/20">
          <Lock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="dec-title text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Lucid Encrypted Mempool
            </h1>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
              EIP-8184
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ethereum encrypted mempool initiative: live sandwich protection metrics, working group decisions, and specifications.
          </p>
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
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-violet-500 text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
