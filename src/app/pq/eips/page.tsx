'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import {
  PQ_EIPS,
  PQ_LAYERS,
  PQ_ROLES,
  type EipStatus,
  type PqLayer,
  type PqRole,
} from '@/data/pq-registry';

const STATUSES: EipStatus[] = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];

const roleClass: Record<PqRole, string> = {
  'Direct PQ': 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  Enabler: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Prerequisite: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Related: 'border-border bg-muted/50 text-muted-foreground',
};

const statusClass: Record<string, string> = {
  Draft: 'text-muted-foreground',
  Review: 'text-sky-600 dark:text-sky-400',
  'Last Call': 'text-amber-600 dark:text-amber-400',
  Final: 'text-emerald-600 dark:text-emerald-400',
  Stagnant: 'text-red-600 dark:text-red-400',
  Withdrawn: 'text-red-600 dark:text-red-400',
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export default function PqEipRegistryPage() {
  const [layer, setLayer] = useState<PqLayer | 'all'>('all');
  const [role, setRole] = useState<PqRole | 'all'>('all');
  const [status, setStatus] = useState<EipStatus | 'all'>('all');
  // Live EIP status from the indexed repo, overlaid on the curated snapshots.
  const [live, setLive] = useState<Record<number, { status: string | null }>>({});

  useEffect(() => {
    let cancelled = false;
    client.pq
      .getLiveStatuses()
      .then((m) => {
        if (!cancelled) setLive(m as Record<number, { status: string | null }>);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      PQ_EIPS.filter((e) => (layer === 'all' || e.layer === layer) && (role === 'all' || e.role === role) && (status === 'all' || e.status === status)).sort(
        (a, b) => a.number - b.number,
      ),
    [layer, role, status],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
        <h2 className="text-sm font-bold tracking-tight text-foreground">PQ EIP Registry</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The canonical dataset of PQ-related EIPs — their layer, PQ role, capability, roadmap milestone, dependencies, and status.
        </p>
        <div className="mt-3 space-y-2">
          <FilterRow label="Layer">
            <Chip active={layer === 'all'} onClick={() => setLayer('all')}>All</Chip>
            {PQ_LAYERS.map((l) => (
              <Chip key={l} active={layer === l} onClick={() => setLayer(l)}>{l}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Role">
            <Chip active={role === 'all'} onClick={() => setRole('all')}>All</Chip>
            {PQ_ROLES.map((r) => (
              <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>
            ))}
          </FilterRow>
          <FilterRow label="Status">
            <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
            {STATUSES.map((st) => (
              <Chip key={st} active={status === st} onClick={() => setStatus(st)}>{st}</Chip>
            ))}
          </FilterRow>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">EIP</th>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Capability</th>
                <th className="px-4 py-2.5 font-semibold">PQ role</th>
                <th className="px-4 py-2.5 font-semibold">Milestone</th>
                <th className="px-4 py-2.5 font-semibold">Depends on</th>
                <th className="px-4 py-2.5 font-semibold">EIP status</th>
                <th className="px-4 py-2.5 font-semibold">Upgrade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((e) => (
                <tr key={e.number} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 align-top">
                    <Link href={`/eip/${e.number}`} className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline">
                      {e.number} <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">{e.title}</div>
                    {e.note && <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{e.note}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">{e.capability}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', roleClass[e.role])}>{e.role}</span>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-foreground">{e.milestone}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-muted-foreground">
                    {e.dependsOn?.length ? e.dependsOn.map((d) => `EIP-${d}`).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    {(() => {
                      const liveStatus = live[e.number]?.status;
                      const effective = liveStatus || e.status;
                      return (
                        <span className={cn('inline-flex items-center gap-1 font-medium', statusClass[effective] ?? 'text-muted-foreground')}>
                          {effective}
                          {liveStatus && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="live from the EIP repository" />
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {e.upgrade ? `${e.upgrade}${e.upgradeStatus && e.upgradeStatus !== '—' ? ` · ${e.upgradeStatus}` : ''}` : e.upgradeStatus ?? '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No PQ EIPs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        {rows.length} of {PQ_EIPS.length} PQ EIPs shown. A <span className="inline-flex h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-emerald-500 align-middle" /> marks a status read live from the EIP repository; other fields are curated snapshots.
      </p>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-14 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
