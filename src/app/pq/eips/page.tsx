'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { CopyLinkButton } from '@/components/header';
import {
  PQ_EIPS,
  PQ_LAYERS,
  PQ_ROLES,
  type EipStatus,
  type PqLayer,
  type PqRole,
} from '@/data/pq-registry';

const STATUSES: EipStatus[] = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];

// Upgrade "stage": where a proposal sits in fork inclusion. Curated values
// 'Proposed'/'Scheduled' are normalised to the PFI/SFI vocabulary the live
// upgrade-composition data uses; EIPs not in any fork are "None".
const UPGRADE_STAGES = ['PFI', 'CFI', 'SFI', 'Deployed', 'DFI', 'None'] as const;
type UpgradeStage = (typeof UPGRADE_STAGES)[number];

function normalizeStage(raw: string | null | undefined): UpgradeStage {
  const v = (raw ?? '').trim();
  if (!v || v === '—') return 'None';
  if (v === 'Proposed') return 'PFI';
  if (v === 'Scheduled') return 'SFI';
  return (UPGRADE_STAGES as readonly string[]).includes(v) ? (v as UpgradeStage) : 'None';
}

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

// Upgrade-stage pill colouring (PFI → Deployed is "further along"; DFI declined).
const stageClass: Record<UpgradeStage, string> = {
  PFI: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  CFI: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  SFI: 'border-primary/40 bg-primary/10 text-primary',
  Deployed: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  DFI: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  None: 'border-border bg-muted/50 text-muted-foreground',
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
  const [stage, setStage] = useState<UpgradeStage | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  // Live EIP status / upgrade bucket from the indexed repo, overlaid on curation.
  type Live = { status: string | null; upgrade: string | null; upgradeBucket: string | null; updatedAt: string | null };
  const [live, setLive] = useState<Record<number, Live>>({});

  // Deep-link support: /pq/eips?role=Direct+PQ&layer=…&status=…&stage=… (from the overview boxes).
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('role');
      if (r && (PQ_ROLES as string[]).includes(r)) setRole(r as PqRole);
      const l = p.get('layer');
      if (l && (PQ_LAYERS as string[]).includes(l)) setLayer(l as PqLayer);
      const st = p.get('status');
      if (st && (STATUSES as string[]).includes(st)) setStatus(st as EipStatus);
      const sg = p.get('stage');
      if (sg && (UPGRADE_STAGES as readonly string[]).includes(sg)) setStage(sg as UpgradeStage);
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    client.pq
      .getLiveStatuses()
      .then((m) => {
        if (!cancelled) setLive(m as Record<number, Live>);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const agoLabel = (iso: string | null): string => {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days < 1) return 'today';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const stageOf = (e: (typeof PQ_EIPS)[number]): UpgradeStage =>
    normalizeStage(live[e.number]?.upgradeBucket ?? e.upgradeStatus ?? null);

  // Upgrade stages actually present (live-aware), in canonical order.
  const presentStages = useMemo(() => {
    const set = new Set(PQ_EIPS.map((e) => stageOf(e)));
    return UPGRADE_STAGES.filter((s) => set.has(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const rows = useMemo(
    () =>
      PQ_EIPS.filter(
        (e) =>
          (layer === 'all' || e.layer === layer) &&
          (role === 'all' || e.role === role) &&
          (status === 'all' || e.status === status) &&
          (stage === 'all' || stageOf(e) === stage),
      ).sort((a, b) => a.number - b.number),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer, role, status, stage, live],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <section id="pq-registry" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-foreground">PQ EIP Registry</h2>
              <CopyLinkButton sectionId="pq-registry" className="h-6 w-6" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The canonical dataset of PQ-related EIPs, their layer, PQ role, capability, roadmap milestone, upgrade stage (PFI/CFI/SFI/Deployed/DFI), dependencies, and status.
            </p>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/60 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            aria-expanded={filtersOpen}
            title={filtersOpen ? 'Collapse filters' : 'Expand filters'}
          >
            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {filtersOpen ? 'Collapse' : 'Filters'}
          </button>
        </div>

        {filtersOpen && (
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
            <FilterRow label="Stage">
              <Chip active={stage === 'all'} onClick={() => setStage('all')}>All</Chip>
              {presentStages.map((sg) => (
                <Chip key={sg} active={stage === sg} onClick={() => setStage(sg)}>{sg}</Chip>
              ))}
            </FilterRow>
            <FilterRow label="Status">
              <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
              {STATUSES.map((st) => (
                <Chip key={st} active={status === st} onClick={() => setStatus(st)}>{st}</Chip>
              ))}
            </FilterRow>
          </div>
        )}
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">EIP</th>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Capability</th>
                <th className="px-4 py-2.5 font-semibold">PQ role</th>
                <th className="px-4 py-2.5 font-semibold">Stage</th>
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
                  <td className="px-4 py-3 align-top">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', stageClass[stageOf(e)])}>{stageOf(e)}</span>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-foreground">{e.milestone}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-muted-foreground">
                    {e.dependsOn?.length ? e.dependsOn.map((d) => `EIP-${d}`).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    {(() => {
                      const lv = live[e.number];
                      const liveStatus = lv?.status;
                      const effective = liveStatus || e.status;
                      return (
                        <span
                          className={cn('inline-flex items-center gap-1 font-medium', statusClass[effective] ?? 'text-muted-foreground')}
                          title={lv?.updatedAt ? `Last changed ${agoLabel(lv.updatedAt)}` : undefined}
                        >
                          {effective}
                          {liveStatus && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="live from the EIP repository" />
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {(() => {
                      const lv = live[e.number];
                      if (lv?.upgrade && lv.upgradeBucket) {
                        return (
                          <span className="inline-flex items-center gap-1">
                            {lv.upgrade} · {lv.upgradeBucket}
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="live from upgrade composition" />
                          </span>
                        );
                      }
                      return e.upgrade ? `${e.upgrade}${e.upgradeStatus && e.upgradeStatus !== '—' ? ` · ${e.upgradeStatus}` : ''}` : e.upgradeStatus ?? '—';
                    })()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
