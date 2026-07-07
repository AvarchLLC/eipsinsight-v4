import type { UpgradeBucket } from '@/lib/upgrade-stages';

/** Shape returned by `upgrades.getUpgradeCompositionCurrent`. */
export interface UpgradeCompositionEip {
  eip_number: number;
  bucket: UpgradeBucket | null;
  title: string;
  status: string | null;
  category: string | null;
  author: string | null;
  created_at: string | null;
  updated_at: string | null;
  curation: {
    layman_title: string | null;
    layman_summary: string | null;
    benefits: string[];
    tradeoffs: string[];
    stakeholder_impacts: Record<string, { description?: string }> | null;
    north_star: Record<string, { description?: string }> | null;
    headliner_of: string | null;
    headliner_note: string | null;
    layer: 'EL' | 'CL' | null;
  } | null;
}

/** Shape returned by `upgrades.getUpgradeCompositionEvents`. */
export interface UpgradeCompositionEvent {
  commit_date: string | null;
  eip_number: number | null;
  event_type: string | null;
  bucket: string | null;
  commit_sha: string | null;
}

/** Shape returned by `upgrades.getUpgradeTimeline`. */
export interface UpgradeTimelinePoint {
  date: string;
  included: string[];
  scheduled: string[];
  declined: string[];
  considered: string[];
  proposed: string[];
}
