'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// Friendly labels for known path segments; anything else is title-cased.
const LABELS: Record<string, string> = {
  pq: 'Post-Quantum',
  aa: 'Account Abstraction',
  upgrade: 'Upgrades',
  calls: 'Protocol Calls',
  decisions: 'Decisions',
  officehours: 'Office Hours',
  analytics: 'Analytics',
  insights: 'Insights',
  standards: 'Standards',
  explore: 'Explore',
  tools: 'Tools',
  resources: 'Resources',
  eipip: 'EIPIP Meetings',
  people: 'People',
  // hub sub-pages
  overview: 'Overview',
  eips: 'EIP Registry',
  roadmap: 'Roadmap Coverage',
  dependencies: 'Dependencies',
  implementation: 'Implementation',
  migration: 'Migration',
  gaps: 'Gaps & Blockers',
  devnet: 'Devnet Activity',
  ecosystem: 'Ecosystem',
  editors: 'Editors',
  reviewers: 'Reviewers',
  authors: 'Authors',
  contributors: 'Contributors',
  issues: 'Issues',
  prs: 'PRs',
  board: 'Board',
  // calls series slugs
  acde: 'ACD Execution',
  acdc: 'ACD Consensus',
  acdt: 'ACD Testing',
  breakouts: 'Breakout Calls',
  ethproofs: 'EthProof Calls',
};

// Routes that shouldn't show breadcrumbs.
const HIDDEN = new Set(['', 'login', 'verify-request', 'signin']);

function titleCase(seg: string): string {
  return seg
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelFor(seg: string, parent: string | null): string {
  if (LABELS[seg]) return LABELS[seg];
  if (/^\d+$/.test(seg)) {
    if (parent === 'eip' || parent === 'erc' || parent === 'rip') return `${parent.toUpperCase()}-${seg}`;
    return `#${seg}`;
  }
  if (seg === 'eip' || seg === 'erc' || seg === 'rip') return seg.toUpperCase();
  // single-segment proposal slugs like "eip-4337" / "erc-721" / "rip-7212"
  const slug = /^(eip|erc|rip)-(\d+)$/i.exec(seg);
  if (slug) return `${slug[1].toUpperCase()}-${slug[2]}`;
  return titleCase(seg);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0 || HIDDEN.has(segments[0])) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg, i > 0 ? segments[i - 1] : null),
    href: '/' + segments.slice(0, i + 1).join('/'),
    last: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="w-full border-b border-border/50 bg-background/60 px-4 py-2 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground" title="Home">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            {c.last ? (
              <span className="font-semibold text-foreground" aria-current="page">{c.label}</span>
            ) : (
              <Link href={c.href} className="rounded px-1 py-0.5 transition-colors hover:text-foreground">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
