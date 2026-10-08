'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Clock, GitPullRequest, Info, Link2Off, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { CopyLinkButton } from '@/components/header';
import { PqAlertsSubscribe } from '@/components/pq/alerts-subscribe';

type Alert = {
  level: 'high' | 'warn' | 'info';
  kind: string;
  eip: number | null;
  title: string;
  detail: string;
};

const levelClass: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/[0.05]',
  warn: 'border-amber-500/30 bg-amber-500/[0.04]',
  info: 'border-border bg-card/60',
};

const kindIcon: Record<string, typeof Info> = {
  stale: Clock,
  'status-change': GitPullRequest,
  declined: XCircle,
  'roadmap-no-eip': AlertTriangle,
  'unresolved-dep': Link2Off,
  'no-impl': Info,
};

export function PqAlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.pq
      .getAlerts()
      .then((a) => {
        if (!cancelled) setAlerts(a as Alert[]);
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (alerts === null) {
    return (
      <section className="rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><Bell className="h-3.5 w-3.5 animate-pulse" /> Loading coordinator alerts…</span>
      </section>
    );
  }
  if (alerts.length === 0) return null;

  const counts = {
    high: alerts.filter((a) => a.level === 'high').length,
    warn: alerts.filter((a) => a.level === 'warn').length,
    info: alerts.filter((a) => a.level === 'info').length,
  };

  return (
    <section id="pq-alerts" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Bell className="h-4 w-4 text-primary" /> Live alerts
          <CopyLinkButton sectionId="pq-alerts" className="h-6 w-6" />
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
          <PqAlertsSubscribe />
          {counts.warn > 0 && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">{counts.warn} warnings</span>}
          {counts.info > 0 && <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">{counts.info} info</span>}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Auto-computed from the EIP repository, upgrade composition, and the PQ registry: staleness, status changes, declines, roadmap gaps, and unresolved dependencies.
      </p>
      <div className="mt-3 space-y-2">
        {alerts.map((a, i) => {
          const Icon = kindIcon[a.kind] ?? Info;
          return (
            <div key={i} className={cn('flex items-start gap-2.5 rounded-lg border p-2.5', levelClass[a.level])}>
              <Icon
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  a.level === 'high' ? 'text-red-500' : a.level === 'warn' ? 'text-amber-500' : 'text-muted-foreground',
                )}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{a.title}</span>
                  {a.eip != null && (
                    <Link href={`/eip/${a.eip}`} className="font-mono text-[10px] font-semibold text-primary hover:underline">
                      EIP-{a.eip}
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{a.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
