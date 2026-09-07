'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible plain-English intro for the AA dashboard. Header + one-line
 * summary stay visible; the full explanation expands on click.
 */
export function AaExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6"
      >
        <div className="min-w-0">
          <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            What account abstraction is
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Letting ordinary accounts behave like smart contracts.
          </p>
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="grid gap-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
            <p>
              Today an Ethereum wallet is a plain key that pays its own gas and signs one transaction at a time. Account
              abstraction lets a wallet act like programmable code: batching several actions into one, paying gas in a
              token, adding recovery or spending limits, and letting someone else sponsor the fee.
            </p>
            <p>
              Two approaches are live on mainnet now. <span className="text-foreground">EIP-7702</span> lets a normal
              account temporarily run contract code (shipped in Pectra). <span className="text-foreground">ERC-4337</span>{' '}
              does it off-protocol through a shared EntryPoint contract. Below is how much each is actually used, plus the
              wider proposal family and the native-AA work still in progress.
            </p>
          </div>
          <div className="mt-4">
            <Link
              href="/aa/calls"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Video className="h-3.5 w-3.5" /> Native AA breakout calls
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
