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

export interface UpgradeMascot {
  name: string;
  emoji: string;
  eip?: number;
  processNote?: string;
}

export interface UpgradeNameOriginDetails {
  elName: string;
  elHighlight: string;
  clName: string;
  clHighlight: string;
  eip?: number;
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
  /** Structured portmanteau derivation details per EIP-8133. */
  nameOriginDetails?: UpgradeNameOriginDetails;
  /** Official or community mascot per EIP-8066 Upgrade Mascots process. */
  mascot?: UpgradeMascot;
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
    tagline: 'The next major upgrade after Fusaka, featuring Enshrined Proposer-Builder Separation (ePBS) and Block-Level Access Lists (BALs).',
    statusNote:
      'Devnet testing active; Sepolia & Hoodi testnet deployments projected for September 2026, with mainnet target shifted to Q4 2026.',
    description:
      'Ethereum developers are preparing for the next major network upgrade, Glamsterdam. It introduces key changes to both the Execution and Consensus layers on mainnet. Candidate EIPs are being fine-tuned, implemented, and tested on devnets as the scope firms up.',
    executionName: 'Amsterdam',
    consensusName: 'Gloas',
    nameOrigin:
      'Combines "Gloas" (consensus layer, named after a star) and "Amsterdam" (execution layer, named after a Devconnect location).',
    nameOriginDetails: {
      clName: 'Gloas',
      clHighlight: 'Gl',
      elName: 'Amsterdam',
      elHighlight: 'erdam',
      eip: 8133,
    },
    mascot: {
      name: 'Polar Bear',
      emoji: '🐻‍❄️',
      eip: 7773,
      processNote: 'Mascot specified in the EIP-7773 Glamsterdam Meta EIP.',
    },
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
    tagline: 'The network upgrade following Glamsterdam, anchored by FOCIL for consensus-layer censorship resistance and statelessness groundwork.',
    statusNote:
      'FOCIL (EIP-7805) locked as CL headliner (ACDC #175); PFI proposal deadline Aug 6, 2026 (ACDE #240). Mainnet target H1/Q2 2027.',
    description:
      'Hegotá is Ethereum\'s next planned hard fork following Glamsterdam. It combines consensus-layer Heze and execution-layer Bogotá. FOCIL (Fork-choice Enforced Inclusion Lists) is locked as the primary consensus headliner to strengthen censorship resistance, while execution-layer candidates focus on state efficiency (Verkle Trees) and advanced account abstraction.',
    executionName: 'Bogotá',
    consensusName: 'Heze',
    nameOrigin:
      'Combines "Heze" (consensus layer star) and "Bogotá" (Devcon 6 location in Colombia).',
    nameOriginDetails: {
      clName: 'Heze',
      clHighlight: 'He',
      elName: 'Bogotá',
      elHighlight: 'gotá',
      eip: 8133,
    },
    headliners: [
      {
        eip: 7805,
        title: 'Fork-choice Enforced Inclusion Lists (FOCIL)',
        note: 'Confirmed CL headliner (ACDC #175): enables validators to enforce transaction inclusion to eliminate builder censorship.',
      },
      {
        eip: 6800,
        title: 'Verkle Trees & Statelessness',
        note: 'Execution-layer candidate: replaces Merkle Patricia Tries to drastically lower node storage requirements.',
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
    nameOriginDetails: {
      clName: 'Fulu',
      clHighlight: 'Fu',
      elName: 'Osaka',
      elHighlight: 'saka',
      eip: 8133,
    },
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
    nameOriginDetails: {
      elName: 'Prague',
      elHighlight: 'P',
      clName: 'Electra',
      clHighlight: 'ectra',
      eip: 8133,
    },
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
    nameOriginDetails: {
      clName: 'Deneb',
      clHighlight: 'Den',
      elName: 'Cancún',
      elHighlight: 'cún',
      eip: 8133,
    },
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
    nameOriginDetails: {
      elName: 'Shanghai',
      elHighlight: 'Sha',
      clName: 'Capella',
      clHighlight: 'pella',
      eip: 8133,
    },
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
  'bpo-3': {
    slug: 'bpo-3',
    name: 'BPO3',
    status: 'Upcoming',
    tagline: 'Blob Parameter Only 3: Incremental blob throughput increase.',
    statusNote: 'Planned parameter-only fork following BPO2, adjusting blob target and max limits.',
    description: 'BPO3 is a Blob-Parameter-Only network upgrade under EIP-7892, adjusting blob target and max limits.',
    executionName: 'BPO3',
  },
  'bpo-2': {
    slug: 'bpo-2',
    name: 'BPO2',
    status: 'Live',
    tagline: 'Blob Parameter Only 2: Raised blob target to 14 and max to 21.',
    description: 'BPO2 is a Blob-Parameter-Only network upgrade under EIP-7892, expanding data availability capacity for Layer 2 rollups.',
    activationDate: '2026-01-07',
    executionName: 'BPO2',
  },
  'bpo-1': {
    slug: 'bpo-1',
    name: 'BPO1',
    status: 'Live',
    tagline: 'Blob Parameter Only 1: Raised blob target to 10 and max to 15.',
    description: 'BPO1 is the first Blob-Parameter-Only network upgrade introduced via EIP-7892 following Fusaka, scaling blob throughput.',
    activationDate: '2025-12-09',
    executionName: 'BPO1',
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
  'gray-glacier': {
    slug: 'gray-glacier',
    name: 'Gray Glacier',
    status: 'Live',
    tagline: 'Difficulty bomb delay to September 2022.',
    description:
      'Gray Glacier delayed the difficulty bomb by 700,000 blocks (approx. September 2022), providing time for final PoS Merge preparations.',
    activationDate: '2022-06-30',
    activationBlock: 15050000,
    executionName: 'Gray Glacier',
  },
  'arrow-glacier': {
    slug: 'arrow-glacier',
    name: 'Arrow Glacier',
    status: 'Live',
    tagline: 'Difficulty bomb delay to June 2022.',
    description:
      'Arrow Glacier delayed the difficulty bomb by 1,070,000 blocks to June 2022, maintaining consistent block times while Proof-of-Stake development progressed.',
    activationDate: '2021-12-09',
    activationBlock: 13773000,
    executionName: 'Arrow Glacier',
  },
  'muir-glacier': {
    slug: 'muir-glacier',
    name: 'Muir Glacier',
    status: 'Live',
    tagline: 'Difficulty bomb delay to July 2020.',
    description:
      'Muir Glacier delayed the difficulty bomb by 4,000,000 blocks (approx. 611 days) to prevent block time degradation.',
    activationDate: '2020-01-02',
    activationBlock: 9200000,
    executionName: 'Muir Glacier',
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
  petersburg: {
    slug: 'petersburg',
    name: 'Petersburg',
    status: 'Live',
    tagline: 'Hotfix fork disabling EIP-1283 SSTORE net gas metering.',
    description:
      'Petersburg (also known as Constantinople Fix) disabled EIP-1283 net gas metering before activation to prevent reentrancy vulnerabilities.',
    activationDate: '2019-02-28',
    activationBlock: 7280000,
    executionName: 'Petersburg',
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
