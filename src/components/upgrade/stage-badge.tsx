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
