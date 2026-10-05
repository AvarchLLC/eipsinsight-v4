'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Route-based tabs for the EIP-8141 section: the curated proposal tracker lives
 * at /aa/eip-8141 and the live frames-devnet charts at /aa/eip-8141/devnet, so
 * each view is linkable and shareable.
 */
export function Eip8141ViewTabs() {
  const pathname = usePathname();
  const onDevnet = Boolean(pathname?.startsWith('/aa/eip-8141/devnet'));
  const opts = [
    { href: '/aa/eip-8141', label: 'Proposal & status', icon: FileText, active: !onDevnet, live: false },
    { href: '/aa/eip-8141/devnet', label: 'Devnet activity', icon: Radio, active: onDevnet, live: true },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
      {opts.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.active ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            o.active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
          {o.label}
          {o.live && <span className="ml-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
        </Link>
      ))}
    </div>
  );
}
