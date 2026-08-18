'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Star,
  Layers,
  RefreshCw,
  X,
  Download,
  ChevronDown,
  Calendar,
  Tag,
} from 'lucide-react';
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
  'byzantium', 'constantinople', 'petersburg', 'istanbul', 'muir-glacier', 'berlin', 'london',
  'arrow-glacier', 'gray-glacier', 'paris', 'shanghai', 'cancun', 'pectra', 'prague',
  'fusaka', 'bpo-1', 'bpo-2', 'bpo-3', 'glamsterdam', 'hegota',
];

const upgradeRank = (slug: string) => {
  const i = UPGRADE_CHRONOLOGY.indexOf(slug);
  return i === -1 ? -1 : i;
};

/** Mainnet activation date per upgrade slug */
const UPGRADE_DATES: Record<string, string> = {
  frontier: '2015-07-30',
  homestead: '2016-03-14',
  'dao-fork': '2016-07-20',
  'tangerine-whistle': '2016-10-18',
  'spurious-dragon': '2016-11-22',
  byzantium: '2017-10-16',
  constantinople: '2019-02-28',
  petersburg: '2019-02-28',
  istanbul: '2019-12-07',
  'muir-glacier': '2020-01-02',
  berlin: '2021-04-15',
  london: '2021-08-05',
  'arrow-glacier': '2021-12-09',
  'gray-glacier': '2022-06-30',
  paris: '2022-09-15',
  shanghai: '2023-04-12',
  cancun: '2024-03-13',
  pectra: '2025-05-07',
  fusaka: '2025-12-03',
  'bpo-1': '2025-12-09',
  'bpo-2': '2026-01-07',
};

const upgradeYear = (slug: string) => UPGRADE_DATES[slug]?.slice(0, 4) ?? null;

/** "2024-03-13" → "Mar 13, 2024" */
const formatUpgradeDate = (iso: string | undefined) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const deriveLayer = (layer: string | null): 'EL' | 'CL' | null =>
  layer === 'EL' || layer === 'CL' ? layer : null;

const shortUpgradeName = (name: string) => name.match(/\(([^)]+)\)\s*$/)?.[1] ?? name;

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

export function UpgradeEipDirectory({ initialEips, upgrades }: UpgradeEipDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<UpgradeBucket[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [headlinerFilter, setHeadlinerFilter] = useState<'all' | 'headliner' | 'standard'>('all');
  const [includeMetaEips, setIncludeMetaEips] = useState<boolean>(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);

  // Sort state — default to newest proposals first.
  const [sortField, setSortField] = useState<SortField>('eip_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Load state from URL parameters on mount
  useEffect(() => {
    const upParam = searchParams.get('upgrade');
    const catParam = searchParams.get('category');
    const yearParam = searchParams.get('year');
    const stageParam = searchParams.get('stage');
    const layerParam = searchParams.get('layer');
    const headlinerParam = searchParams.get('headliner');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('q');
    const metaParam = searchParams.get('meta');

    if (upParam) setSelectedUpgrades(upParam.split(','));
    if (catParam) setSelectedCategories(catParam.split(','));
    if (yearParam) setSelectedYears(yearParam.split(','));
    if (stageParam) setSelectedStages(stageParam.split(',') as UpgradeBucket[]);
    if (layerParam) setSelectedLayers(layerParam.split(','));
    if (statusParam) setSelectedStatuses(statusParam.split(','));
    if (headlinerParam === 'true') setHeadlinerFilter('headliner');
    if (headlinerParam === 'false') setHeadlinerFilter('standard');
    if (metaParam === 'true') setIncludeMetaEips(true);
    if (metaParam === 'false') setIncludeMetaEips(false);
    if (searchParam) setSearch(searchParam);
  }, [searchParams]);

  // Sync state to URL parameters
  const updateUrl = (
    up: string[],
    cats: string[],
    years: string[],
    stages: string[],
    layers: string[],
    statuses: string[],
    headliner: typeof headlinerFilter,
    q: string,
    meta: boolean = includeMetaEips
  ) => {
    const params = new URLSearchParams();
    if (up.length > 0) params.set('upgrade', up.join(','));
    if (cats.length > 0) params.set('category', cats.join(','));
    if (years.length > 0) params.set('year', years.join(','));
    if (stages.length > 0) params.set('stage', stages.join(','));
    if (layers.length > 0) params.set('layer', layers.join(','));
    if (statuses.length > 0) params.set('status', statuses.join(','));
    if (headliner === 'headliner') params.set('headliner', 'true');
    if (headliner === 'standard') params.set('headliner', 'false');
    if (!meta) params.set('meta', 'false');
    if (q.trim()) params.set('q', q.trim());

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleUpgradeToggle = (slug: string) => {
    const next = selectedUpgrades.includes(slug)
      ? selectedUpgrades.filter((s) => s !== slug)
      : [...selectedUpgrades, slug];
    setSelectedUpgrades(next);
    updateUrl(next, selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleCategoryToggle = (category: string) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(next);
    updateUrl(selectedUpgrades, next, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleYearToggle = (year: string) => {
    const next = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year];
    setSelectedYears(next);
    updateUrl(selectedUpgrades, selectedCategories, next, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleStageToggle = (stage: UpgradeBucket) => {
    const next = selectedStages.includes(stage)
      ? selectedStages.filter((s) => s !== stage)
      : [...selectedStages, stage];
    setSelectedStages(next);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, next, selectedLayers, selectedStatuses, headlinerFilter, search);
  };

  const handleLayerToggle = (layer: string) => {
    const next = selectedLayers.includes(layer)
      ? selectedLayers.filter((l) => l !== layer)
      : [...selectedLayers, layer];
    setSelectedLayers(next);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, selectedStages, next, selectedStatuses, headlinerFilter, search);
  };

  const handleStatusToggle = (status: string) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(next);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, selectedStages, selectedLayers, next, headlinerFilter, search);
  };

  const handleHeadlinerChange = (filter: typeof headlinerFilter) => {
    setHeadlinerFilter(filter);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, filter, search);
  };

  const handleIncludeMetaToggle = (checked: boolean) => {
    setIncludeMetaEips(checked);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search, checked);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrl(selectedUpgrades, selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, val);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedUpgrades([]);
    setSelectedCategories([]);
    setSelectedYears([]);
    setSelectedStages([]);
    setSelectedLayers([]);
    setSelectedStatuses([]);
    setHeadlinerFilter('all');
    setIncludeMetaEips(true);
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

  const handleDownloadCsv = () => {
    const headers = [
      'Sr. No.',
      'EIP Number',
      'Title',
      'Category',
      'Type',
      'Status',
      'Stage',
      'Layer',
      'Upgrade Name',
      'Upgrade Slug',
      'Is Headliner',
    ];
    const rows = filteredEips.map((e, index) => [
      index + 1,
      e.eip_number,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.category || '',
      e.type || '',
      e.status || '',
      e.bucket || '',
      e.layer || '',
      `"${(e.upgrade_name || '').replace(/"/g, '""')}"`,
      e.upgrade_slug || '',
      e.is_headliner ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eips_search_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Normalise every row once: fill EL/CL layer and stamp the upgrade year.
  const eips = useMemo(
    () =>
      initialEips.map((e) => ({
        ...e,
        layer: deriveLayer(e.layer),
        upgradeDate: UPGRADE_DATES[e.upgrade_slug] ?? null,
      })),
    [initialEips]
  );

  // Extract unique categories (excluding ERCs since ERCs are not hardfork upgrades)
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    eips.forEach((e) => {
      const cat = e.category?.trim() || e.type?.trim();
      if (cat && cat.toLowerCase() !== 'erc') cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [eips]);

  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    eips.forEach((e) => {
      const y = upgradeYear(e.upgrade_slug);
      if (y) years.add(y);
      else years.add('Unscheduled');
    });
    return Array.from(years).sort().reverse();
  }, [eips]);

  // Which upgrades the current search text touches — used to auto-highlight those filter chips.
  const matchedUpgradeSlugs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return new Set<string>();
    const slugs = new Set<string>();
    for (const e of eips) {
      if (
        String(e.eip_number).includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.upgrade_name && e.upgrade_name.toLowerCase().includes(q)) ||
        (e.upgrade_slug && e.upgrade_slug.toLowerCase().includes(q))
      ) {
        slugs.add(e.upgrade_slug);
      }
    }
    return slugs;
  }, [eips, search]);

  // Extract unique statuses
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    eips.forEach((e) => {
      if (e.status) statuses.add(e.status);
    });
    return Array.from(statuses).sort();
  }, [eips]);

  // Filter & Sort computation
  const filteredEips = useMemo(() => {
    let result = [...eips];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          String(e.eip_number).includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          (e.upgrade_name && e.upgrade_name.toLowerCase().includes(q)) ||
          (e.upgrade_slug && e.upgrade_slug.toLowerCase().includes(q))
      );
    }

    // Upgrade filter
    if (selectedUpgrades.length > 0) {
      result = result.filter((e) => selectedUpgrades.includes(e.upgrade_slug));
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter((e) => {
        const cat = (e.category?.trim() || e.type?.trim() || '').toLowerCase();
        return selectedCategories.some((c) => c.toLowerCase() === cat);
      });
    }

    // Year filter
    if (selectedYears.length > 0) {
      result = result.filter((e) => {
        const y = upgradeYear(e.upgrade_slug) ?? 'Unscheduled';
        return selectedYears.includes(y);
      });
    }

    // Stage filter
    if (selectedStages.length > 0) {
      result = result.filter((e) => selectedStages.includes(e.bucket));
    }

    // Layer filter
    if (selectedLayers.length > 0) {
      result = result.filter((e) => {
        if (selectedLayers.includes('unset') && !e.layer) return true;
        return e.layer ? selectedLayers.includes(e.layer) : false;
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

    // Meta EIPs filter
    if (!includeMetaEips && selectedUpgrades.length === 0) {
      result = result.filter(
        (e) =>
          e.category?.toLowerCase() !== 'meta' &&
          e.type?.toLowerCase() !== 'meta'
      );
    }

    // Sort
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
  }, [eips, search, selectedUpgrades, selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, includeMetaEips, sortField, sortOrder]);

  const upgradeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of upgrades) map.set(u.slug, u.name);
    for (const e of eips) {
      if (e.upgrade_slug && !map.has(e.upgrade_slug)) {
        map.set(e.upgrade_slug, e.upgrade_name || e.upgrade_slug);
      }
    }
    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => upgradeRank(b.slug) - upgradeRank(a.slug));
  }, [upgrades, eips]);

  const activeFilterCount =
    selectedUpgrades.length +
    selectedCategories.length +
    selectedYears.length +
    selectedStages.length +
    selectedLayers.length +
    selectedStatuses.length +
    (headlinerFilter !== 'all' ? 1 : 0) +
    (!includeMetaEips ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const coreCount = useMemo(
    () =>
      filteredEips.filter((e) => {
        const cat = (e.category?.trim() || e.type?.trim() || '').toLowerCase();
        return cat === 'core';
      }).length,
    [filteredEips]
  );

  const metaCount = useMemo(
    () =>
      filteredEips.filter((e) => {
        const cat = (e.category?.trim() || e.type?.trim() || '').toLowerCase();
        return cat === 'meta';
      }).length,
    [filteredEips]
  );

  const otherCount = useMemo(
    () =>
      filteredEips.filter((e) => {
        const cat = (e.category?.trim() || e.type?.trim() || '').toLowerCase();
        return cat !== 'core' && cat !== 'meta';
      }).length,
    [filteredEips]
  );

  const headlinerCount = useMemo(
    () => filteredEips.filter((e) => e.is_headliner).length,
    [filteredEips]
  );
  const upgradeName = (slug: string) => upgrades.find((u) => u.slug === slug)?.name ?? slug;

  // Active filter chips
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...selectedUpgrades.map((s) => ({
      key: `up-${s}`,
      label: upgradeName(s),
      onRemove: () => handleUpgradeToggle(s),
    })),
    ...selectedCategories.map((c) => ({
      key: `cat-${c}`,
      label: `Category: ${c}`,
      onRemove: () => handleCategoryToggle(c),
    })),
    ...selectedYears.map((y) => ({
      key: `year-${y}`,
      label: `Year: ${y}`,
      onRemove: () => handleYearToggle(y),
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
    ...(!includeMetaEips
      ? [{
          key: 'meta-eips',
          label: 'Excluding Meta EIPs',
          onRemove: () => handleIncludeMetaToggle(true),
        }]
      : []),
  ];

  const pillClass = (isSelected: boolean) =>
    cn(
      'inline-flex h-7 items-center justify-center gap-1.5 rounded-full border px-3 text-xs transition-all cursor-pointer select-none',
      isSelected
        ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-sm'
        : 'border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-foreground'
    );

  return (
    <div className="w-full space-y-5">
      {/* 1. Header Toolbar: Search + Quick Stats + Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-4 backdrop-blur-md shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by EIP #, title, type, category, or upgrade..."
              className="h-10 w-full rounded-xl border border-border bg-background/80 pl-10 pr-9 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleCategoryToggle('Core')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-all cursor-pointer',
                selectedCategories.includes('Core')
                  ? 'border-blue-500/60 bg-blue-500/25 text-blue-700 dark:text-blue-200 font-bold'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20'
              )}
              title="Filter by Core category"
            >
              <span className="font-bold text-foreground">{coreCount}</span> Core
            </button>

            <button
              type="button"
              onClick={() => handleCategoryToggle('Meta')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-all cursor-pointer',
                selectedCategories.includes('Meta')
                  ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-700 dark:text-emerald-200 font-bold'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
              )}
              title="Filter by Meta category"
            >
              <span className="font-bold text-foreground">{metaCount}</span> Meta
            </button>

            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 font-medium text-purple-700 dark:text-purple-300"
              title="Networking, Interface, ERC & other categories"
            >
              <span className="font-bold text-foreground">{otherCount}</span> Other
            </span>

            {headlinerCount > 0 && (
              <button
                type="button"
                onClick={() => handleHeadlinerChange(headlinerFilter === 'headliner' ? 'all' : 'headliner')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-all cursor-pointer',
                  headlinerFilter === 'headliner'
                    ? 'border-amber-500/60 bg-amber-500/25 text-amber-700 dark:text-amber-200 font-bold'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                )}
                title="Filter by Upgrade Headliners"
              >
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span className="font-bold text-foreground">{headlinerCount}</span> Headliners
              </button>
            )}

            <span className="rounded-full border border-border bg-background/80 px-3 py-1 font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredEips.length}</span> Total
              {filteredEips.length !== initialEips.length && (
                <span className="text-muted-foreground/70"> / {initialEips.length}</span>
              )}
            </span>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 font-semibold text-primary shadow-2xs transition-all hover:bg-primary/20 hover:border-primary/60 cursor-pointer"
              title="Download filtered EIP search results as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Prominent Network Upgrade Quick Filter Bar (FIRST) */}
        <div className="flex flex-col gap-2 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
              Network Upgrade:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedUpgrades([]);
                updateUrl([], selectedCategories, selectedYears, selectedStages, selectedLayers, selectedStatuses, headlinerFilter, search);
              }}
              className={cn(
                'inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-all cursor-pointer select-none',
                selectedUpgrades.length === 0
                  ? 'border-primary/60 bg-primary text-primary-foreground shadow-xs'
                  : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              All Upgrades
            </button>
            {upgradeOptions.map((up) => {
              const isSelected = selectedUpgrades.includes(up.slug);
              const highlighted = matchedUpgradeSlugs.has(up.slug);
              return (
                <button
                  key={`quick-${up.slug}`}
                  type="button"
                  onClick={() => handleUpgradeToggle(up.slug)}
                  className={cn(
                    'inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold transition-all cursor-pointer select-none',
                    isSelected
                      ? 'border-primary/60 bg-primary/20 text-primary shadow-xs font-bold'
                      : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    highlighted && !isSelected && 'ring-2 ring-primary/50'
                  )}
                >
                  <span>{shortUpgradeName(up.name)}</span>
                  {upgradeYear(up.slug) && (
                    <span className="opacity-60 text-[10px]">’{upgradeYear(up.slug)!.slice(2)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Quick Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterPanelOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  filterPanelOpen || activeFilterCount > 0
                    ? 'border-primary/50 bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>More Filters</span>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', filterPanelOpen && 'rotate-180')} />
              </button>

              {/* Quick Layer Filter Pills */}
              <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-background/50 p-0.5">
                <button
                  type="button"
                  onClick={() => handleLayerToggle('EL')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    selectedLayers.includes('EL')
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Execution (EL)
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerToggle('CL')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    selectedLayers.includes('CL')
                      ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Consensus (CL)
                </button>
              </div>

              {/* Meta EIPs Checkbox */}
              <label className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-medium text-foreground cursor-pointer select-none hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={includeMetaEips}
                  onChange={(e) => handleIncludeMetaToggle(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border/80 text-primary focus:ring-primary/40 accent-primary cursor-pointer"
                />
                <span>Include Meta EIPs</span>
              </label>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Reset all
              </button>
            )}
          </div>
        </div>

        {/* 3. Expandable Filter Panel */}
        {filterPanelOpen && (
          <div className="grid gap-4 rounded-xl border border-border/80 bg-background/90 p-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Network Upgrade Selection (FIRST in panel) */}
            <div className="space-y-2 lg:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Network Upgrade ({upgradeOptions.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {upgradeOptions.map((up) => {
                  const highlighted = matchedUpgradeSlugs.has(up.slug);
                  return (
                    <button
                      key={up.slug}
                      type="button"
                      onClick={() => handleUpgradeToggle(up.slug)}
                      title={highlighted ? 'Matches search' : undefined}
                      className={cn(
                        pillClass(selectedUpgrades.includes(up.slug)),
                        highlighted && !selectedUpgrades.includes(up.slug) && 'ring-2 ring-primary/50'
                      )}
                    >
                      <span>{shortUpgradeName(up.name)}</span>
                      {upgradeYear(up.slug) && (
                        <span className="opacity-60 text-[10px]">’{upgradeYear(up.slug)!.slice(2)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3 w-3 text-primary" />
                Category
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    className={pillClass(selectedCategories.includes(cat))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Era / Mainnet Year Filter */}
            <div className="space-y-2">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3 text-primary" />
                Activation Year
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {uniqueYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleYearToggle(yr)}
                    className={pillClass(selectedYears.includes(yr))}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Status & Tier Selection */}
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Status & Stage
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
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
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tier
                </span>
                <div className="flex rounded-lg border border-border bg-card/60 p-0.5">
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
                        'flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-xs transition-colors cursor-pointer',
                        headlinerFilter === opt.key
                          ? 'bg-background font-semibold text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {opt.key === 'headliner' && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Active filters:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer"
            >
              {chip.label}
              <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Main Content: Responsive Table for Desktop (sm+) & Card Grid for Mobile (< sm) */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xs">
        {/* Desktop / Tablet Table View (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                {([
                  { field: null, label: '#', width: 'w-10 text-center' },
                  { field: 'eip_number', label: 'Proposal', width: 'w-32' },
                  { field: null, label: 'Title & Category', width: 'w-auto' },
                  { field: null, label: 'Upgrade', width: 'w-36' },
                  { field: null, label: 'Mainnet Date', width: 'w-36' },
                  { field: 'bucket', label: 'Stage', width: 'w-24' },
                  { field: 'status', label: 'Status', width: 'w-28' },
                  { field: 'layer', label: 'Layer', width: 'w-24' },
                ] as const).map((col) => (
                  <th
                    key={col.label}
                    onClick={col.field ? () => handleSort(col.field as SortField) : undefined}
                    className={cn(
                      'px-3 py-3.5',
                      col.width,
                      col.field && 'cursor-pointer transition-colors hover:text-foreground'
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5", col.label === '#' && "justify-center")}>
                      {col.label}
                      {col.field && (
                        <ArrowUpDown
                          className={cn(
                            'h-3 w-3 transition-opacity',
                            sortField === col.field ? 'opacity-100 text-primary font-bold' : 'opacity-40'
                          )}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredEips.map((eip, index) => {
                const isErc = eip.type?.toLowerCase() === 'erc';
                const isRip = eip.type?.toLowerCase() === 'rip';
                const routeSegment = isErc ? 'erc' : isRip ? 'rip' : 'eip';

                return (
                  <tr
                    key={`${eip.upgrade_slug}-${eip.eip_number}`}
                    className={cn(
                      'group transition-colors hover:bg-muted/50',
                      eip.is_headliner && 'bg-amber-500/[0.03]'
                    )}
                  >
                    {/* Sr. No. */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center align-middle font-mono text-xs font-medium text-muted-foreground/70">
                      {index + 1}
                    </td>
                    {/* Proposal Badge */}
                    <td className="whitespace-nowrap py-3.5 pl-4 pr-2 align-middle">
                      <Link
                        href={`/${routeSegment}/${eip.eip_number}`}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-all',
                          eip.is_headliner
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:border-amber-500/60'
                            : 'border-border/80 bg-background/80 text-foreground group-hover:border-primary/40 group-hover:text-primary'
                        )}
                      >
                        {routeSegment.toUpperCase()}-{eip.eip_number}
                      </Link>
                    </td>

                    {/* Title & Category */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/${routeSegment}/${eip.eip_number}`}
                          className="line-clamp-1 min-w-0 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {eip.title}
                        </Link>
                        {eip.is_headliner && (
                          <Star
                            className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500"
                            aria-label="Headliner Proposal"
                          />
                        )}
                      </div>
                      {(() => {
                        const displayCat = eip.category?.trim() || eip.type?.trim() || 'Other';
                        const showSubtype =
                          eip.type &&
                          eip.type.toLowerCase() !== 'standards track' &&
                          eip.type.toLowerCase() !== displayCat.toLowerCase();

                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                                displayCat.toLowerCase() === 'core'
                                  ? 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                  : displayCat.toLowerCase() === 'meta'
                                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300'
                              )}
                            >
                              {displayCat}
                            </span>
                            {showSubtype && (
                              <span className="text-[11px] font-medium text-muted-foreground/80">
                                · {eip.type}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Upgrade Link */}
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                      <Link
                        href={`/upgrade/${eip.upgrade_slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <span title={eip.upgrade_name}>{shortUpgradeName(eip.upgrade_name)}</span>
                      </Link>
                    </td>

                    {/* Mainnet Activation Date */}
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle text-xs font-medium text-muted-foreground">
                      {formatUpgradeDate(eip.upgradeDate ?? undefined) ?? (
                        <span className="text-muted-foreground/40 italic">In planning / devnet</span>
                      )}
                    </td>

                    {/* Stage */}
                    <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                      <span
                        title={stageLabel(eip.bucket)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-xs font-semibold text-foreground"
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
                            'inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
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
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold',
                            eip.layer === 'EL'
                              ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                          )}
                        >
                          <Layers className="h-3 w-3 shrink-0" />
                          {eip.layer}
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredEips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-semibold">No EIPs matched your search or filters.</p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-xs text-primary font-medium hover:underline cursor-pointer mt-1"
                        >
                          Reset all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List/Card View (< sm) */}
        <div className="sm:hidden divide-y divide-border/40">
          {filteredEips.map((eip) => {
            const isErc = eip.type?.toLowerCase() === 'erc';
            const isRip = eip.type?.toLowerCase() === 'rip';
            const routeSegment = isErc ? 'erc' : isRip ? 'rip' : 'eip';
            const displayCat = eip.category?.trim() || eip.type?.trim() || 'Other';

            return (
              <div
                key={`mobile-${eip.upgrade_slug}-${eip.eip_number}`}
                className={cn('p-4 space-y-2.5', eip.is_headliner && 'bg-amber-500/[0.03]')}
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/${routeSegment}/${eip.eip_number}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition-all',
                      eip.is_headliner
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border bg-background text-primary'
                    )}
                  >
                    {routeSegment.toUpperCase()}-{eip.eip_number}
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {eip.layer && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold',
                          eip.layer === 'EL'
                            ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        )}
                      >
                        {eip.layer}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', stageBadgeClass(eip.bucket))} />
                      {stageAbbreviation(eip.bucket)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/${routeSegment}/${eip.eip_number}`}
                  className="block text-sm font-semibold text-foreground hover:text-primary leading-snug"
                >
                  {eip.title}
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase',
                        displayCat.toLowerCase() === 'core'
                          ? 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : displayCat.toLowerCase() === 'meta'
                            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      )}
                    >
                      {displayCat}
                    </span>

                    <Link
                      href={`/upgrade/${eip.upgrade_slug}`}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      {shortUpgradeName(eip.upgrade_name)}
                    </Link>
                  </div>

                  {eip.status && (
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                        STATUS_CHIP[eip.status] ?? 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      {eip.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredEips.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold">No EIPs matched your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
