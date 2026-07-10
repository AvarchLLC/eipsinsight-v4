/**
 * Canonical inclusion-stage taxonomy for network upgrades.
 *
 * The scheduler writes buckets (`included`, `scheduled`, `considered`,
 * `proposed`, `declined`) to `upgrade_composition_current` /
 * `upgrade_composition_events` by parsing meta-EIP headings. Every UI surface
 * that renders a bucket (upgrade pages, proposal preamble, timeline chart)
 * must go through this module so labels, ordering, and colors stay in sync.
 */

export type UpgradeBucket =
  | 'included'
  | 'scheduled'
  | 'considered'
  | 'proposed'
  | 'declined';

export const STAGE_ORDER: UpgradeBucket[] = [
  'proposed',
  'considered',
  'scheduled',
  'included',
  'declined',
];

const STAGE_LABELS: Record<UpgradeBucket, string> = {
  included: 'Included',
  scheduled: 'Scheduled for Inclusion',
  considered: 'Considered for Inclusion',
  proposed: 'Proposed for Inclusion',
  declined: 'Declined for Inclusion',
};

const STAGE_ABBREVIATIONS: Record<UpgradeBucket, string> = {
  included: 'Included',
  scheduled: 'SFI',
  considered: 'CFI',
  proposed: 'PFI',
  declined: 'DFI',
};

/** One-line plain-language explanation shown under each stage section header. */
const STAGE_DEFINITIONS: Record<UpgradeBucket, string> = {
  included: 'EIPs that are part of the activated upgrade on mainnet.',
  scheduled:
    'EIPs that client teams have agreed to implement for the upgrade devnets. These are very likely to ship in the final upgrade.',
  considered:
    'EIPs that client teams are positive towards. Implementation may begin, but inclusion is not yet guaranteed.',
  proposed:
    'EIPs proposed for this upgrade that are still under initial review by client teams.',
  declined:
    'EIPs that were proposed but declined for this upgrade. They may be reconsidered for future upgrades.',
};

const STAGE_BADGE_CLASSES: Record<UpgradeBucket, string> = {
  included: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  scheduled: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  considered: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  proposed: 'border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300',
  declined: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
};

/** Hex colors for charts (matches the status palette in docs/ui-reference.md). */
export const STAGE_CHART_COLORS: Record<UpgradeBucket, string> = {
  included: '#10b981',
  scheduled: '#22d3ee',
  considered: '#f59e0b',
  proposed: '#64748b',
  declined: '#ef4444',
};

export function stageLabel(bucket: UpgradeBucket): string {
  return STAGE_LABELS[bucket];
}

export function stageAbbreviation(bucket: UpgradeBucket): string {
  return STAGE_ABBREVIATIONS[bucket];
}

export function stageDefinition(bucket: UpgradeBucket): string {
  return STAGE_DEFINITIONS[bucket];
}

export function stageBadgeClass(bucket: UpgradeBucket | null): string {
  if (!bucket) return 'border-border bg-muted text-muted-foreground';
  return STAGE_BADGE_CLASSES[bucket];
}

/**
 * Normalize free-form bucket strings from the DB or older data files
 * ("SFI", "Scheduled for Inclusion", "scheduled") to the canonical bucket.
 */
export function normalizeUpgradeBucket(
  bucket: string | null | undefined
): UpgradeBucket | null {
  if (!bucket) return null;
  const normalized = bucket
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.includes('included')) return 'included';
  if (normalized === 'sfi' || normalized.includes('scheduled')) return 'scheduled';
  if (normalized === 'cfi' || normalized.includes('considered')) return 'considered';
  if (normalized === 'pfi' || normalized.includes('proposed')) return 'proposed';
  if (normalized === 'dfi' || normalized.includes('declined')) return 'declined';
  return null;
}

// ---------------------------------------------------------------------------
// Upgrade lifecycle status (fork-level, not EIP-level)
// ---------------------------------------------------------------------------

export type UpgradeLifecycleStatus = 'Live' | 'Upcoming' | 'Planning' | 'Research';

export const LIFECYCLE_ORDER: UpgradeLifecycleStatus[] = [
  'Upcoming',
  'Planning',
  'Research',
  'Live',
];

const LIFECYCLE_BADGE_CLASSES: Record<UpgradeLifecycleStatus, string> = {
  Live: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Upcoming: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Planning: 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300',
  Research: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
};

const LIFECYCLE_DEFINITIONS: Record<UpgradeLifecycleStatus, string> = {
  Live: 'Activated on Ethereum mainnet.',
  Upcoming: 'Scoped and in active development; next in line for mainnet.',
  Planning: 'Scope is being decided; headliner proposals under discussion.',
  Research: 'Early exploration; no confirmed scope yet.',
};

export function lifecycleBadgeClass(status: UpgradeLifecycleStatus): string {
  return LIFECYCLE_BADGE_CLASSES[status];
}

export function lifecycleDefinition(status: UpgradeLifecycleStatus): string {
  return LIFECYCLE_DEFINITIONS[status];
}
