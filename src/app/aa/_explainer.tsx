'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Video, History, Key, ShieldCheck, Zap, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENABLES = [
  { icon: Zap, color: 'text-amber-500', label: 'Batch actions', hint: 'approve + swap in one transaction' },
  { icon: Coins, color: 'text-emerald-500', label: 'Sponsored gas', hint: 'pay in a token, or someone else pays' },
  { icon: ShieldCheck, color: 'text-blue-500', label: 'Account recovery', hint: 'guardians and multisig safety' },
  { icon: Key, color: 'text-purple-500', label: 'Passkey sign-in', hint: 'Face ID and session keys' },
];

/**
 * Collapsible intro for the AA dashboard. A spec-accurate one-line definition and
 * plain-English follow-up stay visible; mechanisms and capabilities expand on click.
 */
export function AaExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card/60 shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-5 text-left sm:p-6 hover:bg-muted/20 transition-colors"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              What account abstraction is
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
              Programmable accounts
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            Account abstraction lets an Ethereum account be controlled by programmable smart-contract logic instead of a
            single private key. A plain account (an <span className="font-medium">externally-owned account</span>, or EOA)
            can only be authorized by one ECDSA signature and must pay its own gas in ETH; account abstraction turns
            validation and payment into rules the account itself defines.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            In practice that means one click can do several actions at once, someone else can cover the gas, and you can
            add safeguards like spending limits or account recovery.
          </p>
        </div>
        <ChevronDown
          className={cn('mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {/* The two mechanisms that deliver AA on Ethereum today — light left-rule, no heavy cards. */}
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="border-l-2 border-primary/50 pl-3">
              <p className="text-sm font-semibold text-foreground">EIP-7702 — upgrade the account you already have</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                A protocol-level transaction type (set-code, type 4) that points a normal EOA at contract code, so it
                gains smart-account powers while keeping the same address and key. Live since the Pectra upgrade (2025).
              </p>
            </div>
            <div className="border-l-2 border-border pl-3">
              <p className="text-sm font-semibold text-foreground">ERC-4337 — a separate smart-contract wallet</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                An application-layer standard: smart-account wallets submit UserOperations through a shared EntryPoint
                contract, with no change to the protocol itself. Live on mainnet since 2023.
              </p>
            </div>
          </div>

          {/* What AA enables — a plain icon row, not four bordered boxes. */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/40 pt-4">
            {ENABLES.map((e) => (
              <div key={e.label} className="flex items-center gap-2 text-xs">
                <e.icon className={cn('h-4 w-4 shrink-0', e.color)} />
                <span className="font-medium text-foreground">{e.label}</span>
                <span className="text-muted-foreground">· {e.hint}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/aa/history"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <History className="h-3.5 w-3.5" /> Full AA history & timeline
            </Link>
            <Link
              href="/aa/calls"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              <Video className="h-3.5 w-3.5" /> Native AA breakout calls
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
