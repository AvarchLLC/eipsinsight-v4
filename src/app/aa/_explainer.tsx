'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Video, History, Key, ShieldCheck, Zap, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible plain-English intro for the AA dashboard. Header + feature badges
 * stay visible; the full explanation expands on click.
 */
export function AaExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left sm:p-6 hover:bg-muted/20 transition-colors"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              What account abstraction is
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
              Programmable accounts
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            An Ethereum account is normally just a private key: it signs one transaction at a time and has to hold ETH to
            pay its own gas. Account abstraction lets the account run code instead, so it can bundle several actions into
            one, let someone else pay the gas, and add safety features like recovery or spending limits.
          </p>
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-4 border-t border-border/60 pt-4">
          <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
            Think of it as upgrading from a plain door key to a smart lock. It is the same door, but the lock can now
            enforce rules, let a guest in, or be re-keyed if you lose your phone. Account abstraction does that for an
            Ethereum account: the account keeps working the same way, but it can now run its own rules.
          </p>
          <div className="grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1 text-sm font-semibold text-foreground">EIP-7702: upgrade the account you already have</p>
              <p>
                A transaction that points your normal account at contract code, so it gains smart-account powers while
                keeping the same address and key. Live on mainnet since the Pectra upgrade (2025).
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="mb-1 text-sm font-semibold text-foreground">ERC-4337: a separate smart-contract wallet</p>
              <p>
                A full smart-account wallet that runs off protocol through a shared EntryPoint contract, with no change to
                Ethereum itself. Live on mainnet since 2023.
              </p>
            </div>
          </div>

          {/* Core Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Atomic Batching</p>
                <p className="text-[10px] text-muted-foreground">Approve + Swap in 1 tx</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
              <Coins className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Gas Sponsorship</p>
                <p className="text-[10px] text-muted-foreground">Pay in USDC or Sponsored</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
              <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Social Recovery</p>
                <p className="text-[10px] text-muted-foreground">Guardian & Multisig safety</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
              <Key className="h-4 w-4 text-purple-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Passkey Auth</p>
                <p className="text-[10px] text-muted-foreground">Face ID & Session Keys</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link
              href="/aa/history"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <History className="h-3.5 w-3.5" /> Full AA History & Timeline
            </Link>
            <Link
              href="/aa/calls"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              <Video className="h-3.5 w-3.5" /> Native AA Breakout Calls
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

