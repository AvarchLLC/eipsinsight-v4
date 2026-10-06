/**
 * Post-Quantum (PQ) readiness registry — the canonical EIPsInsight dataset that
 * links Ethereum's PQ roadmap (pq.ethereum.org) to the EIPs, dependencies, and
 * open coordination gaps that must land for each roadmap capability to ship.
 *
 * This is coordinator-maintained metadata, not a raw DB dump: it maps each PQ
 * proposal to its layer, role, capability, roadmap milestone, dependencies, and
 * current status, and records the roadmap capabilities that do NOT yet have an
 * identified EIP (the "gaps" the EIP Coordinator works). Status / upgrade fields
 * are curated snapshots; the live EIP status always lives on each /eip/<n> page.
 *
 * Positioning: pq.ethereum.org says WHERE Ethereum needs to go for PQ security;
 * this registry shows HOW the specifications required to get there are progressing.
 */

export type PqLayer = 'Execution' | 'Consensus' | 'Data' | 'Application';
export type PqRole = 'Direct PQ' | 'Enabler' | 'Prerequisite' | 'Related';
export type PqCapability =
  | 'Accounts'
  | 'Signatures'
  | 'Validators'
  | 'Aggregation'
  | 'Randomness'
  | 'Blobs'
  | 'Proofs'
  | 'Key management'
  | 'Attestations';
export type EipStatus = 'Draft' | 'Review' | 'Last Call' | 'Final' | 'Stagnant' | 'Withdrawn';
export type UpgradeStatus = 'Proposed' | 'PFI' | 'CFI' | 'DFI' | 'SFI' | 'Scheduled' | 'Deployed' | '—';

/** Lean-roadmap milestones from pq.ethereum.org; free-form to allow combined markers. */
export type Milestone = string;

export interface PqEip {
  number: number;
  title: string;
  layer: PqLayer;
  role: PqRole;
  capability: PqCapability;
  /** Roadmap milestone(s) this proposal serves, e.g. J-star, or a combined marker. */
  milestone: Milestone;
  /** Hard spec dependencies (requires). */
  dependsOn?: number[];
  /** PQ capabilities this proposal unlocks (enables). */
  enables?: number[];
  status: EipStatus;
  /** Network upgrade it is associated with, if any. */
  upgrade?: string;
  upgradeStatus?: UpgradeStatus;
  note?: string;
}

/**
 * Seed registry. Numbers and roles follow the PQ roadmap and the PQTS / Native-AA
 * breakouts; titles are condensed. Refine as the coordinator verifies each entry.
 */
export const PQ_EIPS: PqEip[] = [
  {
    number: 8141,
    title: 'Frame Transactions (native account abstraction)',
    layer: 'Execution',
    role: 'Enabler',
    capability: 'Accounts',
    milestone: 'J*',
    enables: [8288],
    status: 'Draft',
    upgrade: 'Hegota',
    upgradeStatus: 'SFI',
    note: 'Flexible signature schemes at the account layer are the on-ramp for PQ signatures in transactions.',
  },
  {
    number: 8288,
    title: 'In-mempool signature and proof aggregation',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Aggregation',
    milestone: 'M*',
    dependsOn: [8141],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'STARK-based aggregation of hash-based signatures; the scalability piece for PQ at validator scale.',
  },
  {
    number: 8292,
    title: 'Post-Quantum Attestation Aggregators',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Attestations',
    milestone: 'L*',
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'PQ-secure attestation signatures; tracks the leanVM / leanSig research line.',
  },
  {
    number: 8310,
    title: 'Post-Quantum Keystore for Stateful Keys',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Key management',
    milestone: 'I*/L*',
    status: 'Draft',
    upgradeStatus: '—',
    note: 'Hash-based (XMSS) validator key scheme to replace BLS at the key-management layer.',
  },
  {
    number: 8321,
    title: 'Hash-Chain RANDAO',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Randomness',
    milestone: 'I*/L*',
    dependsOn: [7916],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'Removes the BLS dependency in RANDAO so beacon randomness stays PQ-secure.',
  },
  {
    number: 8365,
    title: 'Disallow new 0x00 validators',
    layer: 'Consensus',
    role: 'Prerequisite',
    capability: 'Validators',
    milestone: 'Pre-L*',
    status: 'Draft',
    upgrade: 'Hegota',
    upgradeStatus: 'CFI',
    note: 'Deposit-guard-only scope: stops new 0x00 (BLS) validators, the first step of legacy-key sunset.',
  },
];

/** Roadmap capability → spec coverage. The "gap" column is coordinator work. */
export interface PqRoadmapRow {
  milestone: Milestone;
  capability: string;
  research: 'Available' | 'Partial' | '—';
  /** EIP number covering it, or a marker ('Spec', '?', 'TBD'). */
  eip: number | 'Spec' | '?' | 'TBD';
  /** Open question, if the spec boundary is unresolved. */
  gap?: string;
}

export const PQ_ROADMAP: PqRoadmapRow[] = [
  { milestone: 'I*', capability: 'PQ key registry', research: 'Available', eip: '?', gap: 'EIP needed?' },
  { milestone: 'I*/L*', capability: 'PQ validator keys (XMSS)', research: 'Available', eip: 8310 },
  { milestone: 'I*/L*', capability: 'PQ RANDAO', research: 'Available', eip: 8321 },
  { milestone: 'J*', capability: 'PQ signature precompiles', research: 'Available', eip: '?', gap: 'EIP boundary?' },
  { milestone: 'L*', capability: 'PQ attestations', research: 'Available', eip: 8292 },
  { milestone: 'L*', capability: 'leanVM', research: 'Available', eip: 'Spec', gap: 'EIP boundary?' },
  { milestone: 'M*', capability: 'PQ signature aggregation', research: 'Available', eip: 8288 },
  { milestone: 'M*', capability: 'PQ blobs', research: 'Partial', eip: '?', gap: 'EIP needed' },
  { milestone: 'Pre-L*', capability: 'Legacy validator migration', research: 'Available', eip: 8365 },
];

/** Explicit coordination problems: a capability that lacks an owner, an EIP, or a next step. */
export interface PqGap {
  title: string;
  milestone: Milestone;
  research: 'Available' | 'Partial' | '—';
  /** 'Not identified' | 'TBD' | an EIP reference. */
  eip: string;
  champion?: string;
  action: string;
}

export const PQ_GAPS: PqGap[] = [
  {
    title: 'PQ key registry',
    milestone: 'I*',
    research: 'Available',
    eip: 'Not identified',
    champion: undefined,
    action: 'Determine whether a protocol-level EIP is required, or whether an existing mechanism covers it.',
  },
  {
    title: 'PQ signature precompiles',
    milestone: 'J*',
    research: 'Available',
    eip: 'Not identified',
    action: 'Define the EIP boundary between account-layer signatures (8141) and a precompile.',
  },
  {
    title: 'leanVM specification boundary',
    milestone: 'L*',
    research: 'Available',
    eip: 'Spec only',
    action: 'Decide what, if anything, needs to be an EIP versus a consensus-spec change.',
  },
  {
    title: 'PQ blobs',
    milestone: 'M*',
    research: 'Partial',
    eip: 'Not identified',
    action: 'Identify a specification owner; confirm whether a dedicated EIP is required.',
  },
  {
    title: 'Legacy validator migration (post deposit-guard)',
    milestone: 'Pre-L* → L*',
    research: 'Available',
    eip: 'EIP-8365 + TBD',
    action: 'Identify specification owners for the balance-sunset and retirement stages after 8365.',
  },
];

/** Pipeline stages for the readiness meter (research → ecosystem migration). */
export const PQ_PIPELINE = [
  'Research',
  'Specification',
  'EIP',
  'ACD',
  'Implementation',
  'Devnet',
  'SFI',
  'Testnet',
  'Mainnet',
  'Ecosystem Migration',
] as const;

// ── Derived summary helpers for the Overview indicators ──────────────────────

export function pqSummary() {
  const total = PQ_EIPS.length;
  const direct = PQ_EIPS.filter((e) => e.role === 'Direct PQ').length;
  const enablers = PQ_EIPS.filter((e) => e.role === 'Enabler').length;
  const prerequisites = PQ_EIPS.filter((e) => e.role === 'Prerequisite').length;
  const inUpgrade = PQ_EIPS.filter((e) => e.upgrade && e.upgradeStatus && e.upgradeStatus !== '—' && e.upgradeStatus !== 'Proposed').length;
  const gaps = PQ_GAPS.length;
  const roadmapNoEip = PQ_ROADMAP.filter((r) => r.eip === '?' || r.eip === 'TBD').length;
  const unresolvedDeps = PQ_EIPS.filter((e) => (e.dependsOn ?? []).some((d) => !PQ_EIPS.find((x) => x.number === d))).length;
  return { total, direct, enablers, prerequisites, inUpgrade, gaps, roadmapNoEip, unresolvedDeps };
}

export const PQ_LAYERS: PqLayer[] = ['Execution', 'Consensus', 'Data', 'Application'];
export const PQ_ROLES: PqRole[] = ['Direct PQ', 'Enabler', 'Prerequisite', 'Related'];
