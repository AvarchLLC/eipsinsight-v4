/**
 * Post-Quantum (PQ) readiness registry, the canonical EIPsInsight dataset that
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

// ── Implementation & devnet matrix ───────────────────────────────────────────
// Per-client implementation state for each PQ EIP. EL EIPs are tracked against
// execution clients, CL EIPs against consensus clients. Missing cells default to
// 'not-started'. Seeded from the Native-AA / frames-devnet work; the PQ consensus
// EIPs are early-stage, so most cells are intentionally empty until verified.

export const PQ_EL_CLIENTS = ['Geth', 'Nethermind', 'Besu', 'Erigon', 'Reth', 'ethrex'] as const;
export const PQ_CL_CLIENTS = ['Lighthouse', 'Prysm', 'Teku', 'Nimbus', 'Grandine', 'Lodestar'] as const;

export type ImplState = 'not-started' | 'planned' | 'pr-open' | 'implemented' | 'interoperable' | 'tested';

export interface PqImpl {
  state: ImplState;
  url?: string;
}

/** PQ_IMPLEMENTATIONS[eipNumber][client | 'Devnet'] = { state, url? }. */
export const PQ_IMPLEMENTATIONS: Record<number, Record<string, PqImpl>> = {
  8141: {
    Geth: { state: 'tested' },
    Nethermind: { state: 'tested' },
    ethrex: { state: 'tested' },
    Besu: { state: 'planned' },
    Devnet: { state: 'tested' },
  },
  // 8288 / 8292 / 8310 / 8321 / 8365: consensus-layer, early-stage, cells default
  // to 'not-started' until client work is verified.
};

export const IMPL_STATE_ORDER: ImplState[] = ['not-started', 'planned', 'pr-open', 'implemented', 'interoperable', 'tested'];

export const IMPL_STATE_LABEL: Record<ImplState, string> = {
  'not-started': 'Not started',
  planned: 'Planned',
  'pr-open': 'PR open',
  implemented: 'Implemented',
  interoperable: 'Interoperable',
  tested: 'Tested',
};

export function implFor(eip: number, client: string): PqImpl {
  return PQ_IMPLEMENTATIONS[eip]?.[client] ?? { state: 'not-started' };
}

// ── Migration tracker: protocol vs ecosystem PQ readiness ────────────────────
// Ethereum can ship PQ support at the protocol while the ecosystem stays on
// vulnerable keys. This tracks readiness per category rather than declaring any
// organization "quantum safe". Conservative by design: most ecosystem categories
// have not begun migration, which is the honest, useful picture today.

export type ReadinessLevel = 'none' | 'research' | 'spec' | 'in-progress' | 'ready';

export const READINESS_ORDER: ReadinessLevel[] = ['none', 'research', 'spec', 'in-progress', 'ready'];
export const READINESS_LABEL: Record<ReadinessLevel, string> = {
  none: 'Not started',
  research: 'Research',
  spec: 'Specification',
  'in-progress': 'In progress',
  ready: 'Ready',
};

export interface MigrationCategory {
  name: string;
  group: 'Protocol' | 'Ecosystem';
  current: string; // current cryptography / auth
  pqCandidate: string; // PQ replacement approach
  eips: number[]; // relevant EIPs in this registry
  readiness: ReadinessLevel;
  note?: string;
}

export const PQ_MIGRATION: MigrationCategory[] = [
  // Protocol, what the protocol itself controls.
  {
    name: 'Validator keys',
    group: 'Protocol',
    current: 'BLS12-381',
    pqCandidate: 'Hash-based (XMSS)',
    eips: [8310, 8365],
    readiness: 'spec',
    note: 'Keystore design drafted (8310); the deposit-guard that stops new BLS validators (8365) is CFI for Hegota.',
  },
  {
    name: 'Attestation aggregation',
    group: 'Protocol',
    current: 'BLS aggregation',
    pqCandidate: 'STARK / hash-based aggregation',
    eips: [8292, 8288],
    readiness: 'research',
    note: 'Aggregating hash-based signatures at validator scale is the open scalability problem.',
  },
  {
    name: 'Beacon randomness (RANDAO)',
    group: 'Protocol',
    current: 'BLS-based reveals',
    pqCandidate: 'Hash-chain RANDAO',
    eips: [8321],
    readiness: 'research',
    note: 'Removes the BLS dependency so beacon randomness stays PQ-secure.',
  },
  // Ecosystem, needs action beyond the core protocol.
  {
    name: 'EOAs',
    group: 'Ecosystem',
    current: 'secp256k1',
    pqCandidate: 'Account-layer PQ signatures',
    eips: [8141],
    readiness: 'spec',
    note: 'Native AA (Frames) gives accounts flexible signature schemes, the on-ramp for PQ signatures.',
  },
  {
    name: 'Smart accounts',
    group: 'Ecosystem',
    current: 'secp256k1 · ERC-4337',
    pqCandidate: 'PQ verifier via native AA',
    eips: [8141],
    readiness: 'spec',
  },
  {
    name: 'Wallets',
    group: 'Ecosystem',
    current: 'secp256k1',
    pqCandidate: 'PQ signing via account-layer schemes',
    eips: [8141],
    readiness: 'research',
    note: 'Depends on account-layer PQ support plus wallet UX for key migration.',
  },
  {
    name: 'Staking & custody',
    group: 'Ecosystem',
    current: 'BLS (validators) · secp256k1',
    pqCandidate: 'Validator key migration',
    eips: [8310, 8365],
    readiness: 'none',
  },
  { name: 'Multisigs', group: 'Ecosystem', current: 'secp256k1', pqCandidate: 'PQ via account-layer schemes', eips: [8141], readiness: 'none' },
  { name: 'L2s / rollups', group: 'Ecosystem', current: 'secp256k1 · various', pqCandidate: 'TBD', eips: [], readiness: 'none' },
  { name: 'Bridges', group: 'Ecosystem', current: 'Various signatures', pqCandidate: 'TBD', eips: [], readiness: 'none' },
  { name: 'Exchanges', group: 'Ecosystem', current: 'secp256k1', pqCandidate: 'TBD', eips: [], readiness: 'none' },
  { name: 'Infrastructure (RPC, indexers)', group: 'Ecosystem', current: 'secp256k1', pqCandidate: 'TBD', eips: [], readiness: 'none' },
];
