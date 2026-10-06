'use client';

import { usePathname } from 'next/navigation';
import { Github } from 'lucide-react';
import { ROUTE_SOURCES } from '@/data/route-sources.generated';

const REPO = 'https://github.com/AvarchLLC/eipsinsight-v4/blob/main';

/** Match a pathname against a route pattern (":x" = param, "*" = catch-all, "**" = optional catch-all). */
function matches(pattern: string, segs: string[]): boolean {
  const p = pattern.split('/').filter(Boolean);
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '**') return true; // optional catch-all: matches the rest (incl. none)
    if (p[i] === '*') return segs.length > i; // catch-all: needs at least one segment
    if (i >= segs.length) return false;
    if (p[i].startsWith(':')) continue;
    if (p[i] !== segs[i]) return false;
  }
  return p.length === segs.length;
}

function resolveSource(pathname: string): string | null {
  const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  // ROUTE_SOURCES is pre-sorted most-specific first.
  for (const r of ROUTE_SOURCES) {
    if (matches(r.pattern, segs)) return r.source;
  }
  return null;
}

/**
 * Floating "view this page's source on GitHub" button. Resolves the current
 * route to its App Router page.tsx via the generated route manifest and links
 * to that file in the repo. Sits just left of the feedback button.
 */
export function GithubSourceLink() {
  const pathname = usePathname() || '/';
  const source = resolveSource(pathname);
  if (!source) return null; // unknown route (e.g. API) — hide rather than guess

  const href = `${REPO}/${source}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View this page's source on GitHub"
      title="View this page's source on GitHub"
      className="fixed bottom-4 right-28 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Github className="h-[18px] w-[18px]" />
    </a>
  );
}
