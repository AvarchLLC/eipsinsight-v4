import { rawData } from '@/data/network-upgrades';

/**
 * Single source of truth for the historical network-upgrade headline counts.
 *
 * Everything here is derived from the complete static timeline (`rawData`) so the
 * numbers on /upgrade and /upgrade/analytics can never drift apart again — the
 * old mix of hardcoded card values (27/19/6/62/20), an analytics recount (23),
 * and a live DB count of only the 17 seeded upgrades produced three different
 * "total upgrades" on one site.
 *
 * "Distinct upgrades" = distinct activation dates. Same-date pairs (an EL fork and
 * its CL counterpart, e.g. Shanghai+Capella = Shapella, or Constantinople and its
 * Petersburg hotfix) are one upgrade. That yields 22.
 */

/** An EIP entry that isn't a real numbered proposal (placeholders / removals). */
function isRealEip(entry: string): boolean {
  return entry !== 'NO-EIP' && entry !== 'CONSENSUS' && !entry.endsWith('-removed');
}

function distinctEipNumbers(rows: typeof rawData): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    for (const eip of row.eips) {
      if (isRealEip(eip)) set.add(eip.replace('EIP-', ''));
    }
  }
  return set;
}

const executionRows = rawData.filter((r) => r.layer === 'execution');
const consensusRows = rawData.filter((r) => r.layer === 'consensus');

/** 22 — distinct activation dates; same-date EL/CL pairs count once. */
export const TOTAL_NETWORK_UPGRADES = new Set(rawData.map((r) => r.date)).size;

/** Upgrades that touched each layer, counted by distinct activation date. */
export const EXECUTION_UPGRADES = new Set(executionRows.map((r) => r.date)).size;
export const CONSENSUS_UPGRADES = new Set(consensusRows.map((r) => r.date)).size;

/**
 * EIPs shipped, classified by the layer of the upgrade that shipped them. EL and
 * CL EIP sets are disjoint, so EL + CL === total (no double counting).
 */
export const EXECUTION_EIP_COUNT = distinctEipNumbers(executionRows).size;
export const CONSENSUS_EIP_COUNT = distinctEipNumbers(consensusRows).size;
export const TOTAL_EIPS_DEPLOYED = distinctEipNumbers(rawData).size;
