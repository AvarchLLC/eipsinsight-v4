/**
 * Canonical colours for EIP/ERC/RIP lifecycle status badges.
 *
 * Hues come from the "Status / Semantic Colors" table in `docs/ui-reference.md`.
 * The border/background/text *shape* deliberately mirrors `stageBadgeClass` in
 * `upgrade-stages.ts` — status and stage badges sit side by side (e.g. on
 * /upgrade#latest-changes), so they must read as one badge family rather than two
 * different styles.
 */

export type ProposalStatus =
  | 'draft'
  | 'review'
  | 'last call'
  | 'final'
  | 'living'
  | 'stagnant'
  | 'withdrawn';

const STATUS_BADGE_CLASSES: Record<ProposalStatus, string> = {
  draft: 'border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300',
  review: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'last call': 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  final: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  living: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  stagnant: 'border-gray-500/30 bg-gray-500/15 text-gray-700 dark:text-gray-400',
  withdrawn: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
};

/** Hex equivalents for charts — the "Hex (charts)" column of the same table. */
export const STATUS_CHART_COLORS: Record<ProposalStatus, string> = {
  draft: '#64748b',
  review: '#f59e0b',
  'last call': '#f97316',
  final: '#10b981',
  living: '#22d3ee',
  stagnant: '#6b7280',
  withdrawn: '#ef4444',
};

/**
 * Normalise free-form status strings from the DB ("Last Call", "last-call",
 * "LASTCALL") to a canonical key. Returns null when unrecognised so callers can
 * fall back to neutral chrome rather than silently mis-colouring.
 */
export function normalizeProposalStatus(
  status: string | null | undefined
): ProposalStatus | null {
  if (!status) return null;
  const normalized = status
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized === 'lastcall' || normalized.includes('last call')) return 'last call';
  if (normalized.includes('draft')) return 'draft';
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('final')) return 'final';
  if (normalized.includes('living')) return 'living';
  if (normalized.includes('stagnant')) return 'stagnant';
  if (normalized.includes('withdrawn')) return 'withdrawn';
  return null;
}

/** Outline-only variant: same hue, no fill. */
const STATUS_OUTLINE_CLASSES: Record<ProposalStatus, string> = {
  draft: 'border-slate-500/40 bg-transparent text-slate-600 dark:text-slate-400',
  review: 'border-amber-500/40 bg-transparent text-amber-600 dark:text-amber-400',
  'last call': 'border-orange-500/40 bg-transparent text-orange-600 dark:text-orange-400',
  final: 'border-emerald-500/40 bg-transparent text-emerald-600 dark:text-emerald-400',
  living: 'border-cyan-500/40 bg-transparent text-cyan-600 dark:text-cyan-400',
  stagnant: 'border-gray-500/40 bg-transparent text-gray-600 dark:text-gray-400',
  withdrawn: 'border-red-500/40 bg-transparent text-red-600 dark:text-red-400',
};

/**
 * Badge classes for a status string. Unknown statuses get neutral chrome.
 *
 * Use `variant: 'outline'` when the badge sits next to a filled StageBadge. The
 * status palette and the stage palette both map to slate-500 (Draft / PFI), so two
 * filled pills would be indistinguishable — and Draft+PFI is the most common pair.
 * Outline keeps the documented hue while making the filled stage badge the
 * primary element, which also matches the reading order ("… added to <stage>").
 */
export function statusBadgeClass(
  status: string | null | undefined,
  variant: 'solid' | 'outline' = 'solid'
): string {
  const normalized = normalizeProposalStatus(status);
  if (!normalized) {
    return variant === 'outline'
      ? 'border-border bg-transparent text-muted-foreground'
      : 'border-border bg-muted/40 text-muted-foreground';
  }
  return variant === 'outline'
    ? STATUS_OUTLINE_CLASSES[normalized]
    : STATUS_BADGE_CLASSES[normalized];
}
