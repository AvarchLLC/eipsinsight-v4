'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitBranch, LayoutDashboard, List, Map, Network, Server, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS: { href: string; label: string; icon: typeof List; exact?: boolean }[] = [
  { href: '/pq', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/pq/eips', label: 'EIP Registry', icon: List },
  { href: '/pq/roadmap', label: 'Roadmap Coverage', icon: Map },
  { href: '/pq/dependencies', label: 'Dependencies', icon: Network },
  { href: '/pq/implementation', label: 'Implementation', icon: Server },
  { href: '/pq/migration', label: 'Migration', icon: GitBranch },
  { href: '/pq/gaps', label: 'Gaps & Blockers', icon: ShieldAlert },
];

/** Persistent tab shell for the Post-Quantum readiness hub. */
export function PqShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6">
      <header className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="dec-title persona-title text-xl font-semibold tracking-tight sm:text-2xl">Post-Quantum Readiness</h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            How the EIPs and specifications behind Ethereum&apos;s PQ migration are progressing
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
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
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
