import type { UpgradeLifecycleStatus } from '@/lib/upgrade-stages';

/**
 * Curated per-upgrade metadata that is not derivable from the DB:
 * lifecycle status, taglines, narrative copy, activation details, and
 * headliner callouts. The DB (`upgrades` + composition tables, fed by the
 * scheduler) stays the source of truth for slugs, meta EIPs, and EIP buckets.
 *
 * Narrative copy was consolidated here from the per-slug conditionals that
 * previously lived in `src/app/upgrade/[slug]/page.tsx`.
 */

export interface UpgradeHeadliner {
  eip: number;
  title: string;
  note?: string;
}

export interface UpgradeRegistryEntry {
  slug: string;
  name: string;
  status: UpgradeLifecycleStatus;
  tagline: string;
  description: string;
  /** Mainnet activation date (YYYY-MM-DD) for Live upgrades. */
  activationDate?: string;
  activationBlock?: number;
  forkEpoch?: number;
  /** Execution-layer / consensus-layer fork names (post-Merge upgrades). */
  executionName?: string;
  consensusName?: string;
  /** Where the fork name comes from — shown in the simple view. */
  nameOrigin?: string;
  /** Selected or leading headliner features, curated manually. */
  headliners?: UpgradeHeadliner[];
  /** Devnet series (devnet_specs.series values) that belong to this fork. */
  devnetSeries?: string[];
  /**
   * One-line "what's happening right now" — shown on overview cards.
   * Keep current as ACD decisions land; falls back to the tagline.
   */
  statusNote?: string;
}

export const upgradeRegistry: Record<string, UpgradeRegistryEntry> = {
  glamsterdam: {
    slug: 'glamsterdam',
    name: 'Glamsterdam',
    status: 'Upcoming',
    tagline: 'The next major upgrade after Fusaka, with shorter slot times and block-level access lists in focus.',
    statusNote:
      'Scoping complete — implemented EIPs are being tested on devnets; devnet-7 is planned as the final devnet.',
    description:
      'Ethereum developers are preparing for the next major network upgrade, Glamsterdam. It introduces key changes to both the Execution and Consensus layers on mainnet. Candidate EIPs are being fine-tuned, implemented, and tested on devnets as the scope firms up.',
    executionName: 'Amsterdam',
    consensusName: 'Gloas',
    nameOrigin:
      'Combines "Gloas" (consensus layer, named after a star) and "Amsterdam" (execution layer, named after a Devconnect location).',
    devnetSeries: ['glamsterdam', 'bal', 'epbs'],
    headliners: [
      {
        eip: 7732,
        title: 'Enshrined Proposer-Builder Separation (ePBS)',
        note: 'Consensus-layer headliner: separates block proposal from block building at the protocol level.',
      },
      {
        eip: 7928,
        title: 'Block-Level Access Lists',
        note: 'Execution-layer headliner: enables parallel transaction execution and faster validation.',
      },
    ],
  },
  hegota: {
    slug: 'hegota',
    name: 'Hegotá',
    status: 'Planning',
    tagline: 'Early-stage upgrade following Glamsterdam; headliner selection in progress.',
    statusNote:
      'Headliner selection underway — FOCIL leading; EIP proposals (PFI) open until Aug 6, 2026.',
    description:
      'Hegotá is in early planning. The headliner proposal window is opening, with fork-choice enforced inclusion lists (FOCIL) among the leading candidates. Check back for updates as the upgrade planning process progresses.',
    executionName: 'Bogotá',
    consensusName: 'Heze',
    nameOrigin:
      'Combines "Heze" (consensus layer, named after a star) and "Bogotá" (execution layer, named after a Devcon location).',
    headliners: [
      {
        eip: 7805,
        title: 'Fork-choice enforced Inclusion Lists (FOCIL)',
        note: 'Proposed headliner: strengthens censorship resistance by letting validators force transaction inclusion.',
      },
    ],
  },
  fusaka: {
    slug: 'fusaka',
    name: 'Fusaka',
    status: 'Live',
    tagline: 'PeerDAS-powered blob scaling, a 60M gas limit, and Blob Parameter Only forks.',
    description:
      'Fusaka followed the Pectra upgrade, focusing on scaling and efficiency. Its headlining feature is PeerDAS (Peer Data Availability Sampling), enabling significant blob throughput scaling. Fusaka also raised the L1 gas limit to 60M and introduced "Blob Parameter Only" (BPO) forks to safely scale blob capacity, alongside optimizations for L1 performance and UX.',
    activationDate: '2025-12-03',
    activationBlock: 23935694,
    forkEpoch: 411392,
    executionName: 'Osaka',
    consensusName: 'Fulu',
    headliners: [
      {
        eip: 7594,
        title: 'PeerDAS - Peer Data Availability Sampling',
        note: 'Headliner: nodes verify data availability by sampling instead of downloading everything.',
      },
    ],
  },
  pectra: {
    slug: 'pectra',
    name: 'Pectra',
    status: 'Live',
    tagline: 'Account abstraction for EOAs, validator UX overhaul, and doubled blob throughput.',
    description:
      'Pectra (Prague + Electra) shipped significant changes to the Execution and Consensus layers, including EIP-7702 account abstraction for EOAs, validator consolidation via a higher MAX_EFFECTIVE_BALANCE, execution-layer triggerable exits, and a blob throughput increase. Due to the complexity of testing and scope, some EIPs were deferred to Fusaka.',
    activationDate: '2025-05-07',
    activationBlock: 22431084,
    forkEpoch: 364032,
    executionName: 'Prague',
    consensusName: 'Electra',
  },
  cancun: {
    slug: 'cancun',
    name: 'Dencun',
    status: 'Live',
    tagline: 'Proto-danksharding: blobs slash Layer 2 costs.',
    description:
      'Cancun (with the consensus-layer Deneb) delivered proto-danksharding through EIP-4844 blobs, enabling Layer 2 solutions to post data more economically. This upgrade reduced rollup costs by orders of magnitude and laid crucial groundwork for full danksharding scalability.',
    activationDate: '2024-03-13',
    activationBlock: 19426587,
    forkEpoch: 269568,
    executionName: 'Cancun',
    consensusName: 'Deneb',
  },
  shanghai: {
    slug: 'shanghai',
    name: 'Shapella',
    status: 'Live',
    tagline: 'Staking withdrawals unlocked.',
    description:
      'Shanghai (with the consensus-layer Capella) enabled validators to withdraw accrued staking rewards and exit the validator set, fulfilling a critical Proof-of-Stake requirement and completing the core capabilities needed for validator participation.',
    activationDate: '2023-04-12',
    activationBlock: 17034870,
    forkEpoch: 194048,
    executionName: 'Shanghai',
    consensusName: 'Capella',
  },
  paris: {
    slug: 'paris',
    name: 'The Merge',
    status: 'Live',
    tagline: 'Proof-of-Work to Proof-of-Stake.',
    description:
      "The Merge was Ethereum's most significant upgrade, transitioning consensus from Proof-of-Work to Proof-of-Stake. This historic change reduced energy consumption by 99.95% and established validator-based security.",
    activationDate: '2022-09-15',
    activationBlock: 15537394,
    executionName: 'Paris',
    consensusName: 'Bellatrix',
  },
  london: {
    slug: 'london',
    name: 'London',
    status: 'Live',
    tagline: 'EIP-1559 fee market reform.',
    description:
      "London fundamentally reformed Ethereum's fee market with EIP-1559, introducing dynamic base fees and a burn mechanism. It revolutionized how transaction fees work, improved user experience, and began Ethereum's deflationary phase.",
    activationDate: '2021-08-05',
    activationBlock: 12965000,
  },
  berlin: {
    slug: 'berlin',
    name: 'Berlin',
    status: 'Live',
    tagline: 'Gas accounting optimizations and access lists.',
    description:
      'Berlin optimized gas accounting for state-access operations and introduced transaction access lists to enable more efficient Layer 2 solutions.',
    activationDate: '2021-04-15',
    activationBlock: 12244000,
  },
  istanbul: {
    slug: 'istanbul',
    name: 'Istanbul',
    status: 'Live',
    tagline: 'Gas repricing and privacy-enabling precompiles.',
    description:
      'Istanbul introduced gas repricing for state-rent preparation, privacy-enabling precompiles, and STATICCALL optimizations, preparing the network for scalability solutions.',
    activationDate: '2019-12-07',
    activationBlock: 9069000,
  },
  constantinople: {
    slug: 'constantinople',
    name: 'Constantinople',
    status: 'Live',
    tagline: 'CREATE2 and cheaper EVM operations.',
    description:
      'Constantinople optimized EVM operations including SSTORE gas cost improvements, the CREATE2 opcode, and bitwise shifting, reducing smart contract deployment costs.',
    activationDate: '2019-02-28',
    activationBlock: 7280000,
  },
  byzantium: {
    slug: 'byzantium',
    name: 'Byzantium',
    status: 'Live',
    tagline: 'REVERT, zk-SNARK precompiles, and PoS groundwork.',
    description:
      'Byzantium was a major Metropolis phase upgrade introducing the REVERT opcode for safer contract development, zk-SNARK precompiles for privacy technologies, and a block reward reduction moving the network toward Proof-of-Stake.',
    activationDate: '2017-10-16',
    activationBlock: 4370000,
  },
  'spurious-dragon': {
    slug: 'spurious-dragon',
    name: 'Spurious Dragon',
    status: 'Live',
    tagline: 'Replay protection and state cleanup.',
    description:
      "Spurious Dragon continued Ethereum's security improvements with EXP gas repricing, contract code size limits, and transaction replay protection via the ChainID parameter (EIP-155).",
    activationDate: '2016-11-22',
    activationBlock: 2675000,
  },
  'tangerine-whistle': {
    slug: 'tangerine-whistle',
    name: 'Tangerine Whistle',
    status: 'Live',
    tagline: 'DoS attack response via gas repricing.',
    description:
      'Tangerine Whistle addressed denial-of-service vulnerabilities by repricing gas for state-heavy operations, making attacks economically infeasible.',
    activationDate: '2016-10-18',
    activationBlock: 2463000,
  },
  'dao-fork': {
    slug: 'dao-fork',
    name: 'DAO Fork',
    status: 'Live',
    tagline: 'Irregular state change to recover DAO funds.',
    description:
      'The DAO Fork was an irregular state transition coordinated by the community to recover funds stolen in The DAO exploit, establishing an important precedent for protocol decision-making during critical security incidents.',
    activationDate: '2016-07-20',
    activationBlock: 1920000,
  },
  homestead: {
    slug: 'homestead',
    name: 'Homestead',
    status: 'Live',
    tagline: 'First planned protocol upgrade.',
    description:
      'Homestead was the first planned Ethereum upgrade, introducing critical safety improvements including the DELEGATECALL opcode and fixes to the contract creation process.',
    activationDate: '2016-03-14',
    activationBlock: 1150000,
  },
  frontier: {
    slug: 'frontier',
    name: 'Frontier',
    status: 'Live',
    tagline: 'Ethereum genesis.',
    description:
      "Frontier was Ethereum's genesis release on July 30, 2015, marking the official launch of the Ethereum mainnet. It enabled the deployment of smart contracts and laid the foundation for decentralized applications.",
    activationDate: '2015-07-30',
    activationBlock: 0,
  },
};

export function getUpgradeRegistryEntry(slug: string): UpgradeRegistryEntry | null {
  return upgradeRegistry[slug] ?? null;
}

/** In-progress upgrades (Upcoming → Planning → Research), the index page's card order. */
export function getInProgressUpgrades(): UpgradeRegistryEntry[] {
  const order: Record<string, number> = { Upcoming: 0, Planning: 1, Research: 2 };
  return Object.values(upgradeRegistry)
    .filter((entry) => entry.status !== 'Live')
    .sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));
}

/** Live upgrades, newest first. */
export function getLiveUpgrades(): UpgradeRegistryEntry[] {
  return Object.values(upgradeRegistry)
    .filter((entry) => entry.status === 'Live')
    .sort((a, b) => (b.activationDate ?? '').localeCompare(a.activationDate ?? ''));
}
