'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StageBadge } from '@/components/upgrade/stage-badge';
import { STAGE_ORDER, stageLabel, type UpgradeBucket } from '@/lib/upgrade-stages';

export interface DevnetColumn {
  id: string;
  series: string;
  devnet_number: number | null;
  active: boolean;
  canceled?: boolean;
  /** Short display label, e.g. "Devnet 8". */
  label: string;
}

export interface DevnetEipRow {
  eip_number: number;
  title: string;
  layman_title: string | null;
  bucket: string | null;
  layer: 'EL' | 'CL' | null;
  status: string | null;
  /** devnetId -> inclusion status ("new" | "updated" | "required" | "optional" | "included"). */
  inclusion: Record<string, string>;
}

const STATUS_META: Record<string, { className: string; label: string }> = {
  included: { className: 'text-emerald-500', label: 'Included' },
  new: { className: 'text-blue-500', label: 'New' },
  new_optional: { className: 'text-blue-400', label: 'New (optional)' },
  updated: { className: 'text-amber-500', label: 'Updated' },
  required: { className: 'text-red-500', label: 'Required' },
  optional: { className: 'text-muted-foreground/60', label: 'Optional' },
};

/** Legend order shown at the top (the change-types a ✓ can represent). */
const LEGEND_KEYS = ['included', 'new', 'updated', 'required', 'optional'] as const;

function LayerChip({ layer }: { layer: 'EL' | 'CL' | null }) {
  if (!layer) return <span className="text-xs text-muted-foreground/40">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
        layer === 'EL'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
          : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
      )}
    >
      {layer}
    </span>
  );
}

export function DevnetInclusionMatrix({
  columns,
  rows,
}: {
  columns: DevnetColumn[];
  rows: DevnetEipRow[];
}) {
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [layer, setLayer] = useState<'all' | 'EL' | 'CL'>('all');
  const [stage, setStage] = useState<'all' | UpgradeBucket>('all');

  const hasLiveDevnet = columns.some((c) => c.active);

  // Which stage buckets actually appear (for the filter chips).
  const availableStages = useMemo(() => {
    const present = new Set(rows.map((r) => r.bucket).filter(Boolean) as string[]);
    return STAGE_ORDER.filter((b) => present.has(b));
  }, [rows]);

  const visibleColumns = useMemo(
    () => (activeOnly ? columns.filter((c) => c.active) : columns),
    [columns, activeOnly]
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visibleIds = new Set(visibleColumns.map((c) => c.id));
    return rows.filter((row) => {
      if (layer !== 'all' && row.layer !== layer) return false;
      if (stage !== 'all' && row.bucket !== stage) return false;
      if (q) {
        const hay = `eip-${row.eip_number} ${row.title} ${row.layman_title ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Hide rows that have no inclusion in any of the currently-visible devnets.
      return Object.keys(row.inclusion).some((id) => visibleIds.has(id));
    });
  }, [rows, visibleColumns, search, layer, stage]);

  const chip = (selected: boolean) =>
    cn(
      'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
      selected
        ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
        : 'border-border bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
    );

  return (
    <div className="space-y-5">
      {/* How to read this — plain-English guide + legend, up front */}
      <div className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <p className="text-sm leading-relaxed text-foreground">
          <span className="font-semibold">How to read this:</span> every{' '}
          <span className="font-medium">row is an EIP</span>, every{' '}
          <span className="font-medium">column is a devnet</span> (active & newest devnets prioritized on the left). A{' '}
          <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ means the EIP ships in that devnet</span> - its color
          tells you how it appears there:
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          {LEGEND_KEYS.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <Check className={cn('h-4 w-4', STATUS_META[k].className)} />
              <span className="font-medium text-foreground">{STATUS_META[k].label}</span>
            </span>
          ))}
          <span className="h-3.5 w-px bg-border" aria-hidden />
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="w-4 text-center text-muted-foreground/40">·</span> not in that devnet
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> live devnet
          </span>
        </div>
      </div>

      {/* Filters & Checkbox controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search EIP # or title…"
              className="h-8 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Checkbox Tick Mark to Filter Active Devnets */}
          {hasLiveDevnet && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-card">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary/30"
              />
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Active devnets only
              </span>
            </label>
          )}

          {/* Layer filter */}
          <div className="flex items-center gap-1">
            {(['all', 'EL', 'CL'] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setLayer(opt)} className={chip(layer === opt)}>
                {opt === 'all' ? 'All layers' : opt}
              </button>
            ))}
          </div>

          {/* Stage filter dropdown */}
          {availableStages.length > 0 && (
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as 'all' | UpgradeBucket)}
              aria-label="Filter by inclusion stage"
              className="h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All stages</option>
              {availableStages.map((b) => (
                <option key={b} value={b}>
                  {stageLabel(b)}
                </option>
              ))}
            </select>
          )}
        </div>

        <span className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{visibleRows.length}</span> EIPs across{' '}
          <span className="font-semibold text-foreground">{visibleColumns.length}</span> devnets
        </span>
      </div>

      {visibleColumns.length === 0 || visibleRows.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No EIPs match these filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/60 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 z-20 bg-card border-r border-border/60 px-3 py-3">EIP</th>
                  <th className="px-3 py-3">Stage</th>
                  <th className="px-3 py-3 text-center">Layer</th>
                  {visibleColumns.map((devnet) => (
                    <th key={devnet.id} className="px-3 py-3 text-center min-w-[95px]">
                      <Link
                        href={`/upgrade/devnets/${devnet.id}`}
                        title={devnet.active ? `${devnet.id} - live` : devnet.id}
                        className="group inline-flex flex-col items-center justify-center gap-0.5"
                      >
                        <span className="inline-flex items-center gap-1 font-bold text-foreground transition-colors group-hover:text-primary">
                          {devnet.label}
                        </span>
                        {devnet.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-semibold tracking-normal text-emerald-700 dark:text-emerald-300">
                            <Radio className="h-2 w-2" />
                            live
                          </span>
                        ) : devnet.canceled ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-medium text-amber-700 dark:text-amber-300">
                            canceled
                          </span>
                        ) : (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.2 text-[9px] font-medium text-red-600 dark:text-red-400">
                            inactive
                          </span>
                        )}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {visibleRows.map((row) => (
                  <tr key={row.eip_number} className="transition-colors hover:bg-muted/40">
                    <td className="sticky left-0 z-10 max-w-72 bg-card border-r border-border/60 px-3 py-2.5">
                      <Link
                        href={`/eip/${row.eip_number}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        EIP-{row.eip_number}
                      </Link>
                      {(row.layman_title || row.title) && (
                        <span className="ml-2 hidden max-w-[16rem] truncate align-middle text-xs font-normal text-muted-foreground lg:inline-block">
                          {row.layman_title || row.title}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.bucket ? <StageBadge bucket={row.bucket} abbreviated /> : <span className="text-xs text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <LayerChip layer={row.layer} />
                    </td>
                    {visibleColumns.map((devnet) => {
                      const status = row.inclusion[devnet.id];
                      const meta = status ? STATUS_META[status] ?? STATUS_META.included : null;
                      return (
                        <td key={devnet.id} className="px-3 py-2.5 text-center">
                          {meta ? (
                            <span title={`${meta.label} - ${devnet.label}`}>
                              <Check className={cn('mx-auto h-4 w-4 stroke-[2.5]', meta.className)} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/25" title={`Not in ${devnet.label}`}>
                              ·
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
