import { cn } from '@/lib/utils';
import {
  normalizeUpgradeBucket,
  stageAbbreviation,
  stageBadgeClass,
  stageLabel,
  lifecycleBadgeClass,
  type UpgradeLifecycleStatus,
} from '@/lib/upgrade-stages';

/**
 * Inclusion-stage pill for an EIP within a network upgrade.
 * Accepts raw bucket strings from the DB and normalizes them.
 */
export function StageBadge({
  bucket,
  abbreviated = false,
  className,
}: {
  bucket: string | null | undefined;
  abbreviated?: boolean;
  className?: string;
}) {
  const normalized = normalizeUpgradeBucket(bucket);
  const label = normalized
    ? abbreviated
      ? stageAbbreviation(normalized)
      : stageLabel(normalized)
    : 'Unknown';

  return (
    <span
      title={normalized ? stageLabel(normalized) : undefined}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        stageBadgeClass(normalized),
        className
      )}
    >
      {label}
    </span>
  );
}

const PHASE_BADGE_CLASSES: Record<string, string> = {
  scoping: 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300',
  development: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  testnets: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  mainnet: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

/**
 * Current-phase pill for in-progress forks: Scoping / Devnets / Testnets /
 * Launching — more informative than the generic lifecycle status.
 */
export function PhaseBadge({
  phaseId,
  label,
  className,
}: {
  phaseId: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        PHASE_BADGE_CLASSES[phaseId] ?? 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {label}
    </span>
  );
}

/** Fork-level lifecycle pill: Live / Upcoming / Planning / Research. */
export function UpgradeStatusBadge({
  status,
  className,
}: {
  status: UpgradeLifecycleStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        lifecycleBadgeClass(status),
        className
      )}
    >
      {status}
    </span>
  );
}

/**
 * Split badge pairing an upgrade name with the EIP's stage in it,
 * e.g. [Fusaka][SFI]. Used on proposal pages and search results.
 */
export function UpgradeStageSplitBadge({
  upgradeName,
  bucket,
  className,
}: {
  upgradeName: string;
  bucket: string | null | undefined;
  className?: string;
}) {
  const normalized = normalizeUpgradeBucket(bucket);

  return (
    <span
      title={normalized ? `${upgradeName}: ${stageLabel(normalized)}` : upgradeName}
      className={cn(
        'inline-flex items-center overflow-hidden rounded-full border border-border text-[11px] font-medium',
        className
      )}
    >
      <span className="bg-muted/80 px-2 py-0.5 text-foreground/80">{upgradeName}</span>
      <span className={cn('border-l px-2 py-0.5', stageBadgeClass(normalized))}>
        {normalized ? stageAbbreviation(normalized) : 'Unknown'}
      </span>
    </span>
  );
}
