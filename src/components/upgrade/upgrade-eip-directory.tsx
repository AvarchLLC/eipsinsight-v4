'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, ArrowUpDown, Star, Layers, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  STAGE_ORDER,
  stageLabel,
  stageAbbreviation,
  stageBadgeClass,
  type UpgradeBucket,
} from '@/lib/upgrade-stages';

/** EIP lifecycle status colors — from docs/ui-reference.md (Status / Semantic Colors). */
const STATUS_CHIP: Record<string, string> = {
  Draft: 'border-slate-500/20 bg-slate-500/15 text-slate-600 dark:text-slate-300',
  Review: 'border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'Last Call': 'border-orange-500/20 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  Final: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Living: 'border-cyan-500/20 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  Stagnant: 'border-gray-500/20 bg-gray-500/15 text-gray-600 dark:text-gray-400',
  Withdrawn: 'border-red-500/20 bg-red-500/15 text-red-600 dark:text-red-300',
};

/** Chronological fork order (oldest → newest); used to sort the upgrade filter newest-first. */
const UPGRADE_CHRONOLOGY = [
  'frontier', 'homestead', 'dao-fork', 'tangerine-whistle', 'spurious-dragon',
  'byzantium', 'constantinople', 'istanbul', 'muir-glacier', 'berlin', 'london',
  'arrow-glacier', 'gray-glacier', 'paris', 'shanghai', 'cancun', 'prague',
  'pectra', 'fusaka', 'glamsterdam', 'hegota',
];
const upgradeRank = (slug: string) => {
  const i = UPGRADE_CHRONOLOGY.indexOf(slug);
  return i === -1 ? -1 : i; // unknown slugs sort last when descending
};

interface EipRow {
  eip_number: number;
  title: string;
  bucket: UpgradeBucket;
  status: string;
  type: string;
  category: string;
  layer: string | null;
  is_headliner: boolean;
  upgrade_name: string;
  upgrade_slug: string;
}

interface UpgradeEipDirectoryProps {
  initialEips: EipRow[];
  upgrades: Array<{ name: string; slug: string }>;
}

type SortField = 'eip_number' | 'status' | 'bucket' | 'layer' | 'is_headliner';
type SortOrder = 'asc' | 'desc';

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function UpgradeEipDirectory({ initialEips, upgrades }: UpgradeEipDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<UpgradeBucket[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [headlinerFilter, setHeadlinerFilter] = useState<'all' | 'headliner' | 'standard'>('all');
  
  // Sort state — default to newest proposals first.
  const [sortField, setSortField] = useState<SortField>('eip_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Load state from URL parameters on mount
  useEffect(() => {
    const upParam = searchParams.get('upgrade');
    const stageParam = searchParams.get('stage');
    const layerParam = searchParams.get('layer');
    const headlinerParam = searchParams.get('headliner');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('q');

    if (upParam) setSelectedUpgrades(upParam.split(','));
    if (stageParam) setSelectedStages(stageParam.split(',') as UpgradeBucket[]);
    if (layerParam) setSelectedLayers(layerParam.split(','));
    if (statusParam) setSelectedStatuses(statusParam.split(','));
    if (headlinerParam === 'true') setHeadlinerFilter('headliner');
    if (headlinerParam === 'false') setHeadlinerFilter('standard');
    if (searchParam) setSearch(searchParam);
  }, [searchParams]);

  // Sync state to URL parameters
  const updateUrl = (
    up: string[],
    stages: string[],
    layers: string[],
    statuses: string[],
    headliner: typeof headlinerFilter,
    q: string
  ) => {
    const params = new URLSearchParams();
    if (up.length > 0) params.set('upgrade', up.join(','));
    if (stages.length > 0) params.set('stage', stages.join(','));
    if (layers.length > 0) params.set('layer', layers.join(','));
    if (statuses.length > 0) params.set('status', statuses.join(','));
    if (headliner === 'headliner') params.set('headliner', 'true');
    if (headliner === 'standard') params.set('headliner', 'false');
    if (q.trim()) params.set('q', q.trim());

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleUpgradeToggle = (slug: string) => {
    const next = selectedUpgrades.includes(slug)
      ? selectedUpgrades.filter((s) => s !== slug)
      : [...selectedUpgrades, slug];
    setSelectedUpgrades(next);
    updateUrl(next, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleStageToggle = (stage: UpgradeBucket) => {
    const next = selectedStages.includes(stage)
      ? selectedStages.filter((s) => s !== stage)
      : [...selectedStages, stage];
    setSelectedStages(next);
    updateUrl(selectedUpgrades, next, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleLayerToggle = (layer: string) => {
    const next = selectedLayers.includes(layer)
      ? selectedLayers.filter((l) => l !== layer)
      : [...selectedLayers, layer];
    setSelectedLayers(next);
    updateUrl(selectedUpgrades, selectedStages, next, selectedStatuses, headlinerFilter, search);
  };

  const handleStatusToggle = (status: string) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(next);
    updateUrl(selectedUpgrades, selectedStages, selectedLayers, next, headlinerFilter, search);
  };

  const handleHeadlinerChange = (filter: typeof headlinerFilter) => {
    setHeadlinerFilter(filter);
    updateUrl(selectedUpgrades, selectedStages, selectedLayers, selectedStatuses, filter, search);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrl(selectedUpgrades, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, val);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedUpgrades([]);
    setSelectedStages([]);
    setSelectedLayers([]);
    setSelectedStatuses([]);
    setHeadlinerFilter('all');
    router.replace(window.location.pathname, { scroll: false });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Extract unique statuses and layers for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    initialEips.forEach((e) => {
      if (e.status) statuses.add(e.status);
    });
    return Array.from(statuses).sort();
  }, [initialEips]);

  // Filter & Sort computation
  const filteredEips = useMemo(() => {
    let result = [...initialEips];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          String(e.eip_number).includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q)
      );
    }

    // Upgrade filter
    if (selectedUpgrades.length > 0) {
      result = result.filter((e) => selectedUpgrades.includes(e.upgrade_slug));
    }

    // Stage filter
    if (selectedStages.length > 0) {
      result = result.filter((e) => selectedStages.includes(e.bucket));
    }

    // Layer filter
    if (selectedLayers.length > 0) {
      result = result.filter((e) => {
        const lyr = e.layer || 'unset';
        return selectedLayers.includes(lyr);
      });
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter((e) => selectedStatuses.includes(e.status));
    }

    // Headliner filter
    if (headlinerFilter === 'headliner') {
      result = result.filter((e) => e.is_headliner);
    } else if (headlinerFilter === 'standard') {
      result = result.filter((e) => !e.is_headliner);
    }

    // Sort — coerce each field to a comparable primitive (booleans → 1/0,
    // null/undefined → '').
    const toComparable = (value: string | number | boolean | null | undefined): string | number =>
      typeof value === 'boolean' ? (value ? 1 : 0) : (value ?? '');

    result.sort((a, b) => {
      const aVal = toComparable(a[sortField]);
      const bVal = toComparable(b[sortField]);

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialEips, search, selectedUpgrades, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, sortField, sortOrder]);

  // Upgrade filter options: only upgrades that actually have EIPs here,
  // ordered newest-first (chronological, descending).
  const upgradeOptions = useMemo(() => {
    const present = new Set(initialEips.map((e) => e.upgrade_slug));
    return upgrades
      .filter((u) => present.has(u.slug))
      .sort((a, b) => upgradeRank(b.slug) - upgradeRank(a.slug));
  }, [upgrades, initialEips]);

  const activeFilterCount =
    selectedUpgrades.length +
    selectedStages.length +
    selectedLayers.length +
    selectedStatuses.length +
    (headlinerFilter !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const headlinerCount = useMemo(
    () => filteredEips.filter((e) => e.is_headliner).length,
    [filteredEips]
  );
  const upgradeName = (slug: string) => upgrades.find((u) => u.slug === slug)?.name ?? slug;

  // Chips summarising every active filter, each individually removable.
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...selectedUpgrades.map((s) => ({
      key: `up-${s}`,
      label: upgradeName(s),
      onRemove: () => handleUpgradeToggle(s),
    })),
    ...selectedStages.map((s) => ({
      key: `stage-${s}`,
      label: stageLabel(s),
      onRemove: () => handleStageToggle(s),
    })),
    ...selectedLayers.map((s) => ({
      key: `layer-${s}`,
      label: s === 'unset' ? 'Cross / Unset' : s,
      onRemove: () => handleLayerToggle(s),
    })),
    ...selectedStatuses.map((s) => ({
      key: `status-${s}`,
      label: s,
      onRemove: () => handleStatusToggle(s),
    })),
    ...(headlinerFilter !== 'all'
      ? [{
          key: 'headliner',
          label: headlinerFilter === 'headliner' ? 'Headliners only' : 'Standard only',
          onRemove: () => handleHeadlinerChange('all'),
        }]
      : []),
  ];

  const pillClass = (isSelected: boolean) =>
    cn(
      'inline-flex h-7 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs transition-all',
      isSelected
        ? 'border-primary/50 bg-primary/10 text-primary font-medium shadow-[0_0_0_1px] shadow-primary/10'
        : 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60'
    );

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* 1. Sidebar Filters */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-20 space-y-4 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filters
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          <FilterSection title="Network upgrade">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {upgradeOptions.map((up) => (
                <button
                  key={up.slug}
                  type="button"
                  onClick={() => handleUpgradeToggle(up.slug)}
                  className={pillClass(selectedUpgrades.includes(up.slug))}
                >
                  {up.name}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Upgrade stage">
            <div className="grid grid-cols-2 gap-1.5">
              {STAGE_ORDER.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => handleStageToggle(stage)}
                  className={cn(pillClass(selectedStages.includes(stage)), 'justify-start')}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', stageBadgeClass(stage))} />
                  <span className="truncate">{stageLabel(stage)}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Layer">
            <div className="flex flex-wrap gap-1.5">
              {['EL', 'CL', 'unset'].map((lyr) => (
                <button
                  key={lyr}
                  type="button"
                  onClick={() => handleLayerToggle(lyr)}
                  className={pillClass(selectedLayers.includes(lyr))}
                >
                  {lyr === 'EL' ? 'Execution' : lyr === 'CL' ? 'Consensus' : 'Cross / Unset'}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Status">
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {uniqueStatuses.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusToggle(st)}
                  className={pillClass(selectedStatuses.includes(st))}
                >
                  {st}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Headliner tier">
            <div className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {([
                { key: 'all', label: 'All' },
                { key: 'headliner', label: 'Headliners' },
                { key: 'standard', label: 'Standard' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleHeadlinerChange(opt.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs transition-colors',
                    headlinerFilter === opt.key
                      ? 'bg-card font-medium text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.key === 'headliner' && <Star className="h-3 w-3 fill-primary/20 text-primary" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>
      </aside>

      {/* 2. Main EIP Directory */}
      <div className="space-y-4 lg:col-span-3">
        {/* Search + stats */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by EIP #, title, or type…"
              className="h-10 w-full rounded-xl border border-border bg-card/60 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            <span className="rounded-full border border-border bg-card/60 px-2.5 py-1 font-medium text-muted-foreground">
              <span className="text-foreground">{filteredEips.length}</span>
              {filteredEips.length !== initialEips.length && (
                <span className="text-muted-foreground/70"> / {initialEips.length}</span>
              )}{' '}
              EIPs
            </span>
            {headlinerCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-medium text-primary">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {headlinerCount} headliner{headlinerCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                {chip.label}
                <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* EIP table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground select-none">
                  {([
                    { field: 'eip_number', label: 'Proposal', width: '' },
                    { field: null, label: 'Title', width: 'w-full' },
                    { field: null, label: 'Upgrade', width: '' },
                    { field: 'bucket', label: 'Stage', width: '' },
                    { field: 'status', label: 'Status', width: '' },
                    { field: 'layer', label: 'Layer', width: '' },
                  ] as const).map((col) => (
                    <th
                      key={col.label}
                      onClick={col.field ? () => handleSort(col.field as SortField) : undefined}
                      className={cn(
                        'px-4 py-3',
                        col.width,
                        col.field && 'cursor-pointer transition-colors hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.field && (
                          <ArrowUpDown
                            className={cn(
                              'h-3 w-3 transition-opacity',
                              sortField === col.field ? 'opacity-100 text-primary' : 'opacity-40'
                            )}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEips.map((eip) => {
                  const isErc = eip.type?.toLowerCase() === 'erc';
                  const isRip = eip.type?.toLowerCase() === 'rip';
                  const routeSegment = isErc ? 'erc' : isRip ? 'rip' : 'eip';

                  return (
                    <tr
                      key={`${eip.upgrade_slug}-${eip.eip_number}`}
                      className={cn(
                        'group transition-colors hover:bg-muted/40',
                        eip.is_headliner && 'bg-primary/[0.04]'
                      )}
                    >
                      {/* Proposal */}
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-2 align-middle">
                        <Link
                          href={`/${routeSegment}/${eip.eip_number}`}
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-1 font-mono text-xs font-semibold transition-colors',
                            eip.is_headliner
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border/60 bg-muted/40 text-foreground/80 group-hover:border-primary/30 group-hover:text-primary'
                          )}
                        >
                          {routeSegment.toUpperCase()}-{eip.eip_number}
                        </Link>
                      </td>

                      {/* Title */}
                      <td className="w-full px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/${routeSegment}/${eip.eip_number}`}
                            className="line-clamp-1 min-w-0 text-xs font-medium text-foreground transition-colors hover:text-primary sm:text-sm"
                          >
                            {eip.title}
                          </Link>
                          {eip.is_headliner && (
                            <Star
                              className="h-3 w-3 shrink-0 fill-primary text-primary"
                              aria-label="Headliner"
                            />
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{eip.category}</div>
                      </td>

                      {/* Upgrade */}
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        <Link
                          href={`/upgrade/${eip.upgrade_slug}`}
                          className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          {eip.upgrade_name}
                        </Link>
                      </td>

                      {/* Stage */}
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        <span
                          title={stageLabel(eip.bucket)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2 py-0.5 text-xs font-semibold text-foreground"
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', stageBadgeClass(eip.bucket))} />
                          {stageAbbreviation(eip.bucket)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        {eip.status ? (
                          <span
                            className={cn(
                              'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                              STATUS_CHIP[eip.status] ?? 'border-border bg-muted text-muted-foreground'
                            )}
                          >
                            {eip.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Layer */}
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        {eip.layer ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold',
                              eip.layer === 'EL'
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                                : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                            )}
                          >
                            <Layers className="h-3 w-3 shrink-0" />
                            {eip.layer}
                          </span>
                        ) : (
                          <span className="text-[10px] italic text-muted-foreground/50">—</span>
                        )}
                      </td>

                      {/* headliner tier column removed — headliners are marked by the ★ next to the title */}
                    </tr>
                  );
                })}

                {filteredEips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-muted-foreground">
                        <Search className="h-6 w-6 opacity-40" />
                        <p className="text-sm">No EIPs matched these filters.</p>
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs text-primary hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
