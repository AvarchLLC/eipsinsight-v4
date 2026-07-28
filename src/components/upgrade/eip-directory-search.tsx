'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';

/** A jump chip that deep-links into the directory with a filter pre-applied. */
type QuickChip = { label: string; href: string };

// Category shortcuts — the directory reads these exact params (headliner=true,
// stage=<bucket>, layer=EL|CL). Upgrade chips are passed in from the server so
// they always reflect the current in-progress forks.
const CATEGORY_CHIPS: QuickChip[] = [
  { label: 'Headliners', href: '/upgrade/eips?headliner=true' },
  { label: 'Included', href: '/upgrade/eips?stage=included' },
  { label: 'Execution', href: '/upgrade/eips?layer=EL' },
  { label: 'Consensus', href: '/upgrade/eips?layer=CL' },
];

/**
 * Compact search + jump entry point for the Upgrade EIP Directory, embedded on
 * /upgrade. Typing and submitting sends the query to /upgrade/eips (which reads
 * `?q=`), and the chips deep-link into the directory with a filter applied —
 * a preview that hands off to the full tool rather than duplicating it.
 */
export function EipDirectorySearch({ upgradeChips = [] }: { upgradeChips?: QuickChip[] }) {
  const router = useRouter();
  const [value, setValue] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `/upgrade/eips?q=${encodeURIComponent(q)}` : '/upgrade/eips');
  };

  const chips = [...upgradeChips, ...CATEGORY_CHIPS];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-2.5 transition-colors focus-within:border-primary/40">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search EIPs by number, title, author, or status…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search the EIP directory"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg persona-gradient px-5 text-sm font-semibold text-black shadow-sm transition-opacity hover:opacity-90"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jump to</span>
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {chip.label}
          </Link>
        ))}
        <Link
          href="/upgrade/eips"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Browse all EIPs
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
