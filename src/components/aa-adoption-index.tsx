'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, Server, AppWindow, Users, CheckCircle2 } from 'lucide-react';
import { client } from '@/lib/orpc';
import type { AaAdoption } from '@/server/orpc/procedures/aa';

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * The four layers of "is EIP-7702 being absorbed by the ecosystem?"
 * User + Application are data-backed on-chain; Protocol is a live fact;
 * Infrastructure is qualitative (no clean on-chain metric).
 */
export function AaAdoptionIndex() {
  const [data, setData] = useState<AaAdoption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.aa
      .getAdoptionIndex()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const num = (v: number) => (loading ? '…' : fmtInt(v));

  const layers = [
    {
      key: 'protocol',
      icon: Boxes,
      title: 'Protocol adoption',
      subtitle: 'The clients implement it',
      metric: 'Live since Pectra',
      detail: 'Shipped in the Pectra upgrade — implemented by every major execution client.',
      tone: 'text-emerald-600 dark:text-emerald-400',
      accent: 'var(--chart-2)',
      full: true,
    },
    {
      key: 'infra',
      icon: Server,
      title: 'Infrastructure adoption',
      subtitle: 'RPCs, indexers and explorers support it',
      metric: 'Native on-chain',
      detail: 'EIP-7702 is a first-class transaction type (type 4), so explorers and indexers surface it directly.',
      tone: 'text-muted-foreground',
      accent: 'var(--chart-8)',
      full: false,
    },
    {
      key: 'application',
      icon: AppWindow,
      title: 'Application adoption',
      subtitle: 'Wallets, dapps and L2s use it',
      metric: `${num(data?.contracts ?? 0)} contracts`,
      detail: 'Distinct contracts that EIP-7702 transactions have interacted with (a breadth proxy for app usage).',
      tone: 'text-foreground',
      accent: 'var(--chart-4)',
      full: false,
    },
    {
      key: 'user',
      icon: Users,
      title: 'User adoption',
      subtitle: 'Real on-chain usage',
      metric: `${num(data?.accounts ?? 0)} accounts`,
      detail: `${num(data?.txs ?? 0)} transactions from ${num(data?.accounts ?? 0)} distinct accounts since Pectra.`,
      tone: 'text-foreground',
      accent: 'var(--chart-1)',
      full: false,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">EIP-7702 adoption index</h3>
        <span className="text-[11px] text-muted-foreground">is the ecosystem absorbing it?</span>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Adoption runs deeper than usage: it moves through the clients, the infrastructure, the apps, and finally the
        users. User and application layers are measured on-chain; protocol is a shipped fact.
      </p>
      <ol className="space-y-2">
        {layers.map((l) => (
          <li key={l.key} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${l.accent} 15%, transparent)`, color: l.accent }}>
              <l.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{l.title}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${l.tone}`}>
                  {l.full && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {l.metric}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{l.subtitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
