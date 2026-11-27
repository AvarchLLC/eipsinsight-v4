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
  /** Competing designs for the same capability (alternative-to). */
  alternativeTo?: number[];
  /** Legacy mechanism this migrates away from (replaces). */
  replaces?: string;
  /** Research artifacts this depends on (leanVM, leanSig, Lean-SPHINCS…). */
  researchDep?: string[];
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
    note: 'Flexible signature schemes at the account layer are the on-ramp for PQ signatures in transactions. Live as the native option on the PQTS testnet (v0.2).',
  },
  {
    number: 8288,
    title: 'In-mempool signature and proof aggregation',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Aggregation',
    milestone: 'M*',
    dependsOn: [8141],
    researchDep: ['LeanVM', 'Lean-SPHINCS'],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'In-mempool aggregation of hash-based signatures; the scalability piece for PQ. Implementation underway on the PQTS testnet (v0.3) via LeanVM + Lean-SPHINCS; contributors wanted.',
  },
  {
    number: 8292,
    title: 'Post-Quantum Attestation Aggregators',
    layer: 'Consensus',
    role: 'Direct PQ',
    capability: 'Attestations',
    milestone: 'L*',
    researchDep: ['leanVM', 'leanSig'],
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
    replaces: 'BLS validator keys',
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
    replaces: 'BLS-based RANDAO reveals',
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
  {
    number: 8051,
    title: 'Precompile for ML-DSA signature verification',
    layer: 'Execution',
    role: 'Direct PQ',
    capability: 'Signatures',
    milestone: 'J*',
    alternativeTo: [8355],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'Lattice-based (ML-DSA / Dilithium) signature verification as an EVM precompile.',
  },
  {
    number: 8355,
    title: 'Precompiles for ML-DSA Verification',
    layer: 'Execution',
    role: 'Direct PQ',
    capability: 'Signatures',
    milestone: 'J*',
    alternativeTo: [8051],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'A second ML-DSA verification precompile design; competes with / complements EIP-8051.',
  },
  {
    number: 7619,
    title: 'Precompile Falcon512 generic verifier',
    layer: 'Execution',
    role: 'Direct PQ',
    capability: 'Signatures',
    milestone: 'J*',
    alternativeTo: [8052],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'Falcon-512 (lattice / NTRU) signature verification precompile.',
  },
  {
    number: 8052,
    title: 'Precompile for Falcon support',
    layer: 'Execution',
    role: 'Direct PQ',
    capability: 'Signatures',
    milestone: 'J*',
    alternativeTo: [7619],
    status: 'Draft',
    upgradeStatus: 'Proposed',
    note: 'A second Falcon verification precompile design; competes with / complements EIP-7619.',
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
  { milestone: 'J*', capability: 'PQ signature precompiles', research: 'Available', eip: 8051, gap: 'Consolidate 4 designs' },
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
    eip: 'EIP-7619 / 8051 / 8052 / 8355',
    action: 'Four competing precompile designs exist (Falcon: 7619, 8052; ML-DSA: 8051, 8355). Decide which to advance and the boundary versus account-layer signatures (8141).',
  },
  {
    title: 'EIP-8288 in-mempool signature aggregation',
    milestone: 'M*',
    research: 'Available',
    eip: 'EIP-8288',
    champion: 'Antonio Sanso · Riva Labs · Emil',
    action: 'Help implement LeanVM + Lean-SPHINCS aggregation on the PQTS v0.3 testnet; the breakout is actively seeking contributors (PQTS #16).',
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
  {
    title: 'PQ decoupled consensus',
    milestone: 'L* → M*',
    research: 'Partial',
    eip: 'Not identified',
    action: 'Open architectural choice surfaced by the Ethlabs pqai27 position: PQ-fy the current Gasper protocol in place, or jump directly to PQ decoupled consensus (the final form, unlocking fast finality and faster slots). No EIP covers either path yet.',
  },
  {
    title: 'Contract-based validator registration',
    milestone: 'I*',
    research: 'Partial',
    eip: 'Not identified',
    action: 'Proposed in pqai27: deploy a registration contract now and load its state into the next fork, avoiding a dedicated registration fork. Needs a specification owner and a decision on whether it is a protocol EIP.',
  },
];

/** Grouped phase a pipeline stage belongs to. */
export type PqPipelinePhase = 'Research' | 'Standardization' | 'Implementation' | 'Scheduling' | 'Deployment';

export interface PqPipelineStage {
  /** Short chip label. */
  label: string;
  /** Expansion for abbreviations (PFI/CFI/SFI) — shown as a subtitle/tooltip. */
  full?: string;
  phase: PqPipelinePhase;
}

/**
 * The path every PQ capability travels from research to ecosystem-wide
 * migration, grouped into phases. The fork-inclusion stages (PFI → CFI → SFI)
 * mirror the ACD process the EIP registry filters on.
 */
export const PQ_PIPELINE: PqPipelineStage[] = [
  { label: 'Research', phase: 'Research' },
  { label: 'Specification', phase: 'Research' },
  { label: 'EIP draft', phase: 'Standardization' },
  { label: 'PFI', full: 'Proposed for Inclusion', phase: 'Standardization' },
  { label: 'CFI', full: 'Considered for Inclusion', phase: 'Standardization' },
  { label: 'Client implementation', phase: 'Implementation' },
  { label: 'Devnet', phase: 'Implementation' },
  { label: 'SFI', full: 'Scheduled for Inclusion', phase: 'Scheduling' },
  { label: 'Testnet', phase: 'Scheduling' },
  { label: 'Mainnet', full: 'Included / deployed', phase: 'Deployment' },
  { label: 'Ecosystem migration', phase: 'Deployment' },
];

/** Phase order + accent for the readiness meter. */
export const PQ_PIPELINE_PHASES: PqPipelinePhase[] = [
  'Research',
  'Standardization',
  'Implementation',
  'Scheduling',
  'Deployment',
];

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
const PQ_DEVNET_1_URL = 'https://notes.ethereum.org/@ethpandaops/pq-devnet-1';

export const PQ_IMPLEMENTATIONS: Record<number, Record<string, PqImpl>> = {
  8141: {
    Geth: { state: 'tested' },
    Nethermind: { state: 'tested' },
    ethrex: { state: 'tested' },
    Besu: { state: 'planned' },
    Devnet: { state: 'tested' },
  },
  8292: {
    Lighthouse: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Prysm: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Teku: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Nimbus: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Grandine: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Lodestar: { state: 'interoperable', url: PQ_DEVNET_1_URL },
    Devnet: { state: 'tested', url: PQ_DEVNET_1_URL },
  },
  8310: {
    Lighthouse: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Prysm: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Teku: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Nimbus: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Grandine: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Lodestar: { state: 'implemented', url: PQ_DEVNET_1_URL },
    Devnet: { state: 'implemented', url: PQ_DEVNET_1_URL },
  },
  8288: {
    Devnet: { state: 'planned', url: '/calls/pqts' },
  },
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
    readiness: 'in-progress',
    note: 'leanXMSS genesis keys active on pq-devnet-1 (8310); BLS-to-XMSS transition deferred to later devnet; deposit-guard (8365) is CFI for Hegota.',
  },
  {
    name: 'Attestation aggregation',
    group: 'Protocol',
    current: 'BLS aggregation',
    pqCandidate: 'STARK / hash-based aggregation',
    eips: [8292, 8288],
    readiness: 'in-progress',
    note: 'pq-devnet-1 live across all CL clients using leanXMSS + leanVM v0.19.x STARK aggregation; segmented proof broadcast planned next.',
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

// ── PQTS testnet ─────────────────────────────────────────────────────────────
// The Post-Quantum Transaction Signatures breakout (chaired by Antonio Sanso, EF)
// runs a research testnet exercising PQ signatures end to end. Sourced from the
// PQTS breakout calls (/calls/pqts); updated through Breakout #19 (Nov 25 2026).

export interface PqtsPhase {
  version: string;
  status: 'live' | 'in-progress' | 'planned';
  summary: string;
  schemes: string[];
  eips: number[];
}

export const PQTS_TESTNET = {
  chair: 'Antonio Sanso (EF)',
  contributors: ['Riva Labs', 'Emil (LeanVM)', 'Julius', 'EF DevOps'],
  callsHref: '/calls/pqts',
  phases: [
    {
      version: 'v0.1',
      status: 'live',
      summary: 'Non-native account abstraction (ERC-4337) with a SPHINCS+ variant.',
      schemes: ['SPHINCS+'],
      eips: [],
    },
    {
      version: 'v0.2',
      status: 'live',
      summary: 'Choose ERC-4337 or native Frame transactions (EIP-8141, headed for Hegota).',
      schemes: ['SPHINCS+'],
      eips: [8141],
    },
    {
      version: 'v0.3',
      status: 'in-progress',
      summary: 'Lean-SPHINCS+ (sphincs.art defaults) targeting Bogota devnet; in-mempool aggregation (EIP-8288) via LeanVM deferred past bogota-devnet-3.',
      schemes: ['Lean-SPHINCS', 'LeanVM'],
      eips: [8288],
    },
  ] as PqtsPhase[],
};

// PQ signature schemes seen across the PQTS work, plus the classical baselines
// Ethereum uses today, so the size blow-up is visible. Sizes are the standard
// parameter-set values in bytes; they are parameter-set dependent, so each row
// names its set. Hash-based signatures are large, which is exactly why in-mempool
// aggregation (EIP-8288) is the scalability piece of the PQ roadmap.
export interface PqScheme {
  name: string;
  family: string;
  use: string;
  /** Parameter set the sizes below refer to. */
  paramSet?: string;
  /** Public-key size in bytes. */
  pubKeyBytes?: number;
  /** Signature size in bytes (approximate for variable-length schemes). */
  sigBytes?: number;
  /** Signatures aggregate into a shorter proof (BLS today; Lean-SPHINCS for PQ). */
  aggregatable?: boolean;
  /** A classical scheme in use today, shown only for size comparison. */
  baseline?: boolean;
  note?: string;
}

export const PQ_SCHEMES: PqScheme[] = [
  { name: 'secp256k1 (ECDSA)', family: 'Elliptic curve', use: 'EOA transaction signatures today', paramSet: 'secp256k1', pubKeyBytes: 33, sigBytes: 64, baseline: true, note: 'The classical baseline every EOA uses now. Not quantum-safe.' },
  { name: 'BLS12-381', family: 'Pairing-based', use: 'Validator signatures today', paramSet: 'BLS12-381', pubKeyBytes: 48, sigBytes: 96, aggregatable: true, baseline: true, note: 'Aggregatable, which is why the consensus layer scales. Not quantum-safe; the PQ roadmap must replace it without losing aggregation.' },
  { name: 'SPHINCS+', family: 'Hash-based (stateless)', use: 'Transaction signatures', paramSet: 'SHA2-128s', pubKeyBytes: 32, sigBytes: 7856, note: 'Runs on the PQTS testnet today. The 128f (fast) set is larger at ~17 KB per signature.' },
  { name: 'Lean-SPHINCS / LeanVM', family: 'Hash-based + aggregation', use: 'Signature aggregation', aggregatable: true, note: 'Aggregation-friendly variant targeted for EIP-8288; many signatures compress to one proof per block.' },
  { name: 'XMSS', family: 'Hash-based (stateful)', use: 'Validator keys', paramSet: 'SHA2_10_256', pubKeyBytes: 64, sigBytes: 2500, note: 'Candidate to replace BLS validator keys (EIP-8310). Stateful: the signer must not reuse a one-time key.' },
  { name: 'ML-DSA (Dilithium)', family: 'Lattice-based', use: 'Transaction signatures', paramSet: 'ML-DSA-65', pubKeyBytes: 1952, sigBytes: 3309, note: 'NIST standard (FIPS 204). A 6x-optimized EVM verifier was demoed by Fireblocks (PQTS #14).' },
  { name: 'Falcon-512', family: 'Lattice-based', use: 'Transaction signatures', paramSet: 'Falcon-512', pubKeyBytes: 897, sigBytes: 666, note: 'The most compact PQ signatures, but tricky constant-time implementation. Precompiles proposed in EIP-7619 / 8052.' },
];

// ── Roadmap positions ────────────────────────────────────────────────────────
// Competing views on HOW FAST and VIA WHICH PATH Ethereum reaches PQ security.
// These are positions and proposals, NOT EIPs and NOT settled consensus. The
// registry tracks that each exists and what it claims; it does not endorse one.
// "PQ-ready" = can switch to PQ mechanisms and keep operating (possibly at
// reduced capacity). "PQ-scaled" = full capacity using PQ transactions and DA.

export type PositionKind = 'EF roadmap' | 'Lab proposal' | 'Historical baseline';
export type PositionStatus = 'Reference' | 'Under discussion' | 'Superseded';

export interface PqPosition {
  id: string;
  title: string;
  author: string;
  kind: PositionKind;
  status: PositionStatus;
  /** Headline timeline, e.g. "2027 PQ-ready (2029 PQ-scaled stretch)". */
  target?: string;
  summary: string;
  /** What it would change relative to the current trajectory. */
  changes?: string[];
  discussionsTo?: string;
  writeup?: string;
  /** One-line reminder of standing, shown as a caveat. */
  neutralityNote?: string;
}

export const PQ_POSITIONS: PqPosition[] = [
  {
    id: 'ef-roadmap',
    title: 'EF protocol priorities and the lean PQ roadmap',
    author: 'Ethereum Foundation',
    kind: 'EF roadmap',
    status: 'Reference',
    target: '2029 full post-quantum (PQ-scaled)',
    summary:
      'The baseline this hub maps against. pq.ethereum.org sets the lean-roadmap milestones (I*/J*/L*/M*) and the capabilities each must deliver; the EF protocol-priorities post frames PQ as a long-horizon, full-capacity target.',
    discussionsTo: 'https://pq.ethereum.org',
    writeup: 'https://blog.ethereum.org/2026/09/07/protocol-priorities',
    neutralityNote: 'Roadmap direction, not a per-fork commitment; the live status of each capability is on its EIP pages.',
  },
  {
    id: 'pqai27',
    title: 'An Ethlabs view on post-quantum and post-AI timelines (pqai27)',
    author: 'Ethlabs (Josh Rudolf, Barnabe Monnot)',
    kind: 'Lab proposal',
    status: 'Under discussion',
    target: '2027 PQ-ready (2029 PQ-scaled stretch)',
    summary:
      'Argues the PQ migration can be accelerated because several steps once thought necessary are not: Ethereum can reach PQ security without first building decoupled consensus on BLS, and without a dedicated fork for validator registration. Rising quantum and AI threat assessment plus faster-than-expected research progress make going all-in on PQ attractive.',
    changes: [
      'Target PQ-ready by 2027 (full PQ-scaled as a stretch goal) versus the 2029 baseline.',
      'For consensus, either PQ-fy the current Gasper protocol or jump directly to PQ decoupled consensus (fast finality, faster slots, provably secure consensus).',
      'Register validators via a contract whose state loads into the next fork, instead of waiting for a registration fork.',
      'Withdraw Quick Slots from Hegota to concentrate resources on the PQ effort.',
    ],
    discussionsTo: 'https://ethereum-magicians.org/t/an-ethlabs-view-on-post-quantum-and-post-ai-timelines-pqai27/30351',
    writeup: 'https://ethlabs.org/writings/pqai27.html',
    neutralityNote: 'An Ethlabs proposal under early discussion, not an Ethereum-wide hard-fork commitment.',
  },
  {
    id: 'mission-2028',
    title: 'Mission 2028 (Cambridge / Devcon timeline)',
    author: 'Presented by Justin Drake at Devcon',
    kind: 'Historical baseline',
    status: 'Superseded',
    target: '2028 PQ steps, Hegota process continuing with Quick Slots',
    summary:
      'The prior trajectory the pqai27 post reacts to: deliver the PQ steps by 2028 while continuing Hegota as it had been going, including Quick Slots. pqai27 argues the cards have since been reshuffled toward an earlier, all-in PQ delivery.',
    neutralityNote: 'Context for the current debate; the active proposals are the two above.',
  },
];

// ── Readiness scorecard ──────────────────────────────────────────────────────
// The furthest PQ_PIPELINE stage a spec has reached, derived from its tracked
// signals (fork-inclusion status, client implementations, testnet presence).
// Conservative: a spec sits at the EIP-draft stage until there is evidence it
// has moved further. The index points into PQ_PIPELINE.

const UPGRADE_STAGE: Record<UpgradeStatus, number> = {
  Proposed: 2,   // EIP draft
  PFI: 3,
  CFI: 4,
  DFI: 2,        // declined: does not advance the pipeline
  SFI: 7,
  Scheduled: 8,  // testnet
  Deployed: 9,   // mainnet
  '—': 2,
};

function implAdvances(state: ImplState): boolean {
  return state === 'implemented' || state === 'interoperable' || state === 'tested';
}

export function pqReadinessStage(e: PqEip): number {
  let stage = 2; // listed in the registry => at least an EIP draft exists
  if (e.upgradeStatus) stage = Math.max(stage, UPGRADE_STAGE[e.upgradeStatus]);

  const impls = PQ_IMPLEMENTATIONS[e.number] ?? {};
  if (Object.entries(impls).some(([client, v]) => client !== 'Devnet' && implAdvances(v.state))) {
    stage = Math.max(stage, 5); // client implementation
  }
  if (impls['Devnet'] && implAdvances(impls['Devnet'].state)) {
    stage = Math.max(stage, 6); // devnet
  }

  for (const phase of PQTS_TESTNET.phases) {
    if (!phase.eips.includes(e.number)) continue;
    if (phase.status === 'live') stage = Math.max(stage, 8); // testnet
    else if (phase.status === 'in-progress') stage = Math.max(stage, 6); // devnet-equivalent
  }

  return Math.min(stage, PQ_PIPELINE.length - 1);
}
