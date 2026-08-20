export type MilestoneCategory = 'all' | 'upgrades' | 'standards' | 'governance' | 'ux';

export interface MilestoneEIP {
  number: string;
  link: string;
  title?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  year: string;
  category: 'upgrades' | 'standards' | 'governance' | 'ux';
  statusBadge: string;
  statusType?: 'success' | 'warning' | 'info' | 'purple';
  description: string;
  whyItMatters: string;
  takeaway: string;
  eips?: MilestoneEIP[];
  externalLink?: { label: string; url: string };
  terms: string[];
  iconName: 'Zap' | 'Flame' | 'ShieldCheck' | 'Layers' | 'Cpu' | 'Coins' | 'Terminal' | 'FileCode' | 'CheckCircle';
}

export interface YearConclusion {
  lead: string;
  detail: string;
}

export interface GlossaryTerm {
  term: string;
  meaning: string;
  category?: string;
  link?: string;
}

export interface CategoryInfo {
  id: MilestoneCategory;
  label: string;
  description: string;
  iconName: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'all',
    label: 'All Milestones',
    description: 'Complete timeline across upgrades, standards, governance, and UX.',
    iconName: 'Layers',
  },
  {
    id: 'upgrades',
    label: 'Hard Forks & Upgrades',
    description: 'Protocol-level execution & consensus upgrades from Frontier to Fusaka.',
    iconName: 'Flame',
  },
  {
    id: 'standards',
    label: 'Core EIPs & Standards',
    description: 'Foundational EIPs, ERCs, and technical specification milestones.',
    iconName: 'FileCode',
  },
  {
    id: 'governance',
    label: 'Governance & Process',
    description: 'AllCoreDevs evolution, editor workflows, and community coordination.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'ux',
    label: 'UX & Account Abstraction',
    description: 'Account Abstraction, EIP-7702, Smart Accounts, and user onboarding.',
    iconName: 'Zap',
  },
];

export const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2015-2019'];

export const MILESTONES_DATA: Milestone[] = [
  // 2026
  {
    id: 'fusaka-alignment-2026',
    title: 'Glamsterdam / Fusaka Upgrade Alignment',
    date: 'Target Late 2025 / Early 2026',
    year: '2026',
    category: 'upgrades',
    statusBadge: 'Devnet & Specs Locked',
    statusType: 'purple',
    description: 'Core developers aligned on the Fusaka upgrade scope pairing Osaka (execution layer) and Fulu (consensus layer), bringing PeerDAS for massive blob data scaling.',
    whyItMatters: 'PeerDAS (EIP-7594) allows consensus nodes to verify data availability without downloading full blobs, multiplying Ethereum\'s rollup data throughput by 4x-8x.',
    takeaway: 'Sampling-based data availability unlocks scalable L2 capacity while keeping node hardware requirements low and accessible.',
    eips: [
      { number: '7594', link: '/eip/7594', title: 'PeerDAS - Peer Data Availability Sampling' },
      { number: '7883', link: '/eip/7883', title: 'Blob Gas Target Increase' },
      { number: '7732', link: '/eip/7732', title: 'Enshrined Proposer-Builder Separation (ePBS)' },
    ],
    externalLink: { label: 'Explore Fork Schedule', url: '/upgrade/schedule' },
    terms: ['PeerDAS', 'Fusaka', 'ePBS', 'Blob Scaling', 'Osaka', 'Fulu'],
    iconName: 'Flame',
  },
  {
    id: 'eip7702-adoption-2026',
    title: 'EIP-7702 Set EOA Code Standardization',
    date: 'Early 2026',
    year: '2026',
    category: 'ux',
    statusBadge: 'Standard Adopted',
    statusType: 'success',
    description: 'Full ecosystem rollouts of EIP-7702 enabled traditional Ethereum keypairs (EOAs) to temporarily adopt smart contract functionality during transaction execution.',
    whyItMatters: 'Users gain native transaction batching, gas sponsorship, and custom permissions without transferring assets or migrating to specialized wallet contracts.',
    takeaway: 'UX breakthroughs succeed fastest when they upgrade existing user accounts rather than requiring users to abandon legacy addresses.',
    eips: [
      { number: '7702', link: '/eip/7702', title: 'Set EOA Account Code' },
    ],
    terms: ['EIP-7702', 'EOA Upgrade', 'Batching', 'Gas Sponsorship', 'Smart Accounts'],
    iconName: 'Zap',
  },
  {
    id: 'eip7683-intents-2026',
    title: 'EIP-7683 Cross-Chain Intents Standard',
    date: 'Mid 2026',
    year: '2026',
    category: 'standards',
    statusBadge: 'Ecosystem Adoption',
    statusType: 'info',
    description: 'Widespread adoption of EIP-7683 across major L2 rollups and solver networks standardized intent-based cross-chain swaps and liquidity routing.',
    whyItMatters: 'Eliminates fragmented L2 user experiences by allowing users to sign a single intent fulfilled instantly by cross-chain solvers.',
    takeaway: 'Standards bridging rollup boundaries are critical to preventing Ethereum ecosystem fragmentation.',
    eips: [
      { number: '7683', link: '/eip/7683', title: 'Cross-Chain Intent Settlement' },
    ],
    terms: ['Cross-Chain', 'Intents', 'Rollup Interop', 'Liquidity', 'Solvers'],
    iconName: 'FileCode',
  },

  // 2025
  {
    id: 'pectra-activation-2025',
    title: 'Pectra Upgrade Activation (Prague-Electra)',
    date: 'May 2025',
    year: '2025',
    category: 'upgrades',
    statusBadge: 'Mainnet Activated',
    statusType: 'purple',
    description: 'Execution (Prague) and Consensus (Electra) layers upgraded simultaneously, delivering 10 major EIPs including MaxEB validator consolidation and EIP-7702.',
    whyItMatters: 'EIP-7251 raised maximum effective balance from 32 to 2048 ETH, reducing validator set size and P2P message overhead while EIP-7623 capped payload gas.',
    takeaway: 'Combining validator ergonomics with UX account upgrades created Ethereum\'s most feature-packed fork since Shapella.',
    eips: [
      { number: '7702', link: '/eip/7702', title: 'Set EOA Code' },
      { number: '7251', link: '/eip/7251', title: 'Increase MAX_EFFECTIVE_BALANCE' },
      { number: '7623', link: '/eip/7623', title: 'Increase Calldata Cost' },
      { number: '2935', link: '/eip/2935', title: 'Historical Block Hashes in State' },
      { number: '2537', link: '/eip/2537', title: 'BLS12-381 Precompiles' },
    ],
    externalLink: { label: 'View Network Upgrades', url: '/upgrade' },
    terms: ['Pectra', 'Prague', 'Electra', 'MaxEB', 'EIP-7702', 'BLS Precompiles'],
    iconName: 'Flame',
  },
  {
    id: 'eip7623-calldata-2025',
    title: 'EIP-7623 Calldata Cost Optimization',
    date: 'May 2025',
    year: '2025',
    category: 'standards',
    statusBadge: 'Mainnet Activated',
    statusType: 'info',
    description: 'Increased floor price of calldata-heavy transactions to reduce maximum worst-case block size variance and incentivize blob storage.',
    whyItMatters: 'Protects node sync speed and network stability by setting clear economic boundaries between EVM calldata and blob space.',
    takeaway: 'Economic repricing is an essential tool to prevent worst-case resource exhaustion on node operators.',
    eips: [
      { number: '7623', link: '/eip/7623', title: 'Increase Calldata Cost' },
    ],
    terms: ['Calldata', 'Gas Limits', 'Block Size', 'Resource Bounds'],
    iconName: 'Cpu',
  },
  {
    id: 'editor-workflow-v2-2025',
    title: 'Editor Workflow & Subgroup Governance V2',
    date: 'September 2025',
    year: '2025',
    category: 'governance',
    statusBadge: 'Process Improvement',
    statusType: 'success',
    description: 'Ethereum Cat Herders and EIP Editors established automated PR triage bots, editor review quotas, and specialized category working groups.',
    whyItMatters: 'Dramatically reduced PR review latency for ERCs and RIPs, clearing multi-month editor backlogs.',
    takeaway: 'Governance tooling and editorial automation compound velocity for the entire developer ecosystem.',
    externalLink: { label: 'Check Editor Analytics', url: '/analytics/editors' },
    terms: ['Editor Workflow', 'PR Triage', 'Governance Speed', 'EIP Process'],
    iconName: 'ShieldCheck',
  },

  // 2024
  {
    id: 'dencun-activation-2024',
    title: 'Dencun Upgrade & EIP-4844 Proto-Danksharding',
    date: 'March 13, 2024',
    year: '2024',
    category: 'upgrades',
    statusBadge: 'Mainnet Activated',
    statusType: 'purple',
    description: 'Cancun-Deneb introduced blob-carrying transactions (EIP-4844), creating dedicated temporary data availability space for L2 rollups.',
    whyItMatters: 'L2 transaction fees dropped by 90-99% overnight, transitioning Ethereum into a true multi-rollup execution layer.',
    takeaway: 'Protocol-level data scaling is the single most effective lever for reducing end-user transaction costs.',
    eips: [
      { number: '4844', link: '/eip/4844', title: 'Shard Blob Transactions' },
      { number: '1153', link: '/eip/1153', title: 'Transient Storage Opcodes' },
      { number: '6780', link: '/eip/6780', title: 'SELFDESTRUCT Only in Same Tx' },
      { number: '5656', link: '/eip/5656', title: 'MCOPY Memory Copying' },
    ],
    externalLink: { label: 'Explore Dencun Specs', url: '/upgrade' },
    terms: ['Dencun', 'EIP-4844', 'Blobs', 'L2 Rollups', 'Proto-Danksharding'],
    iconName: 'Flame',
  },
  {
    id: 'eip7702-proposal-2024',
    title: 'EIP-7702 Proposed by Vitalik Buterin',
    date: 'May 2024',
    year: '2024',
    category: 'ux',
    statusBadge: 'Proposal Milestone',
    statusType: 'info',
    description: 'Vitalik Buterin published EIP-7702 as an elegant alternative to EIP-3074, allowing EOAs to temporarily set contract code for a single transaction.',
    whyItMatters: 'Achieved full account abstraction compatibility with ERC-4337 while maintaining forward compatibility with quantum resistance.',
    takeaway: 'Rapid iteration on proposal design can solve long-standing architectural trade-offs in days.',
    eips: [
      { number: '7702', link: '/eip/7702', title: 'Set EOA Account Code' },
      { number: '3074', link: '/eip/3074', title: 'AUTH and AUTHCALL' },
    ],
    terms: ['EIP-7702', 'Account Abstraction', 'EOA', 'Batching'],
    iconName: 'Zap',
  },
  {
    id: 'erc7579-modular-aa-2024',
    title: 'ERC-7579 Modular Smart Account Architecture',
    date: 'November 2024',
    year: '2024',
    category: 'standards',
    statusBadge: 'Final Standard',
    statusType: 'success',
    description: 'Standardized minimal modular smart account interfaces, enabling interoperable modules (validators, executors, hooks, fallback handlers) across wallet vendors.',
    whyItMatters: 'Prevents vendor lock-in for smart contract accounts and allows developers to build reusable wallet plugins.',
    takeaway: 'Modular architecture standards accelerate developer innovation across wallet applications.',
    eips: [
      { number: '7579', link: '/erc/erc-7579', title: 'Minimal Modular Smart Account' },
    ],
    terms: ['ERC-7579', 'Smart Wallets', 'Modular AA', 'Plugins'],
    iconName: 'FileCode',
  },

  // 2023
  {
    id: 'shapella-activation-2023',
    title: 'Shapella Upgrade (Shanghai-Capella)',
    date: 'April 12, 2023',
    year: '2023',
    category: 'upgrades',
    statusBadge: 'Mainnet Activated',
    statusType: 'purple',
    description: 'Shanghai (execution) and Capella (consensus) enabled beacon chain validator withdrawals via EIP-4895.',
    whyItMatters: 'Completed the Proof-of-Stake lifecycle, giving stakers full liquidity control and boosting institutional confidence in Ethereum.',
    takeaway: 'Demonstrated Ethereum\'s ability to execute seamless protocol updates with billions of dollars at stake.',
    eips: [
      { number: '4895', link: '/eip/4895', title: 'Beacon Chain Push Withdrawals' },
      { number: '3651', link: '/eip/3651', title: 'Warm COINBASE' },
      { number: '3855', link: '/eip/3855', title: 'PUSH0 Instruction' },
    ],
    terms: ['Shapella', 'Shanghai', 'Withdrawals', 'EIP-4895', 'Proof of Stake'],
    iconName: 'Flame',
  },
  {
    id: 'erc4337-mainnet-2023',
    title: 'ERC-4337 EntryPoint Deployed on Mainnet',
    date: 'March 2023',
    year: '2023',
    category: 'ux',
    statusBadge: 'Mainnet Deployed',
    statusType: 'success',
    description: 'EntryPoint v0.6 was deployed to Ethereum mainnet, enabling Account Abstraction without consensus-level hard fork changes.',
    whyItMatters: 'Initiated the ecosystem shift toward paymasters, user ops, bundlers, and gasless user onboarding.',
    takeaway: 'Application-layer standards (ERCs) can drive massive infrastructure changes without waiting for consensus forks.',
    eips: [
      { number: '4337', link: '/erc/erc-4337', title: 'Account Abstraction via EntryPoint' },
    ],
    terms: ['ERC-4337', 'EntryPoint', 'Bundler', 'Paymaster', 'UserOps'],
    iconName: 'Zap',
  },
  {
    id: 'eip1153-transient-storage-2023',
    title: 'EIP-1153 Transient Storage Opcodes',
    date: 'November 2023',
    year: '2023',
    category: 'standards',
    statusBadge: 'Spec Locked',
    statusType: 'info',
    description: 'Introduced TLOAD and TSTORE opcodes for storage that automatically clears at the end of every transaction.',
    whyItMatters: 'Drastically reduced gas costs for reentrancy locks, single-tx approvals, and transient data passing in complex smart contracts.',
    takeaway: 'Targeted EVM opcode additions unlock massive optimization for decentralized exchange protocol design.',
    eips: [
      { number: '1153', link: '/eip/1153', title: 'Transient Storage Opcodes' },
    ],
    terms: ['EIP-1153', 'TSTORE', 'TLOAD', 'Gas Optimization', 'EVM'],
    iconName: 'Cpu',
  },

  // 2022
  {
    id: 'the-merge-2022',
    title: 'The Merge (Bellatrix / Paris)',
    date: 'September 15, 2022',
    year: '2022',
    category: 'upgrades',
    statusBadge: 'Historical Milestone',
    statusType: 'purple',
    description: 'Ethereum officially transitioned from Proof-of-Work to Proof-of-Stake as the execution layer merged with the Beacon Chain.',
    whyItMatters: 'Reduced Ethereum\'s energy consumption by 99.95% and decreased ETH issuance by ~90%, marking a historic milestone in distributed systems.',
    takeaway: 'Proved that decentralized networks can execute monumental architectural upgrades live without downtime.',
    eips: [
      { number: '3675', link: '/eip/3675', title: 'Upgrade Consensus to Proof-of-Stake' },
      { number: '4399', link: '/eip/4399', title: 'Supplant DIFFICULTY with PREVRANDAO' },
    ],
    terms: ['The Merge', 'Proof of Stake', 'Paris', 'Bellatrix', 'Energy Reduction'],
    iconName: 'Flame',
  },
  {
    id: 'erc4626-vaults-2022',
    title: 'ERC-4626 Tokenized Vault Standard Finalized',
    date: 'May 2022',
    year: '2022',
    category: 'standards',
    statusBadge: 'Final Standard',
    statusType: 'success',
    description: 'Standardized yield-bearing vault contracts, establishing uniform deposit, withdraw, and shares calculation methods across DeFi.',
    whyItMatters: 'Prevented protocol fragmentation and security vulnerabilities across lending, staking, and vault aggregators.',
    takeaway: 'Unified financial interfaces unlock composability across disparate DeFi protocols.',
    eips: [
      { number: '4626', link: '/erc/erc-4626', title: 'Tokenized Vaults Standard' },
    ],
    terms: ['ERC-4626', 'Vaults', 'DeFi Standard', 'Composability'],
    iconName: 'Coins',
  },
  {
    id: 'allcoredevs-split-2022',
    title: 'AllCoreDevs Call Split (ACDE & ACDC)',
    date: 'October 2022',
    year: '2022',
    category: 'governance',
    statusBadge: 'Governance Process',
    statusType: 'info',
    description: 'AllCoreDevs meetings officially separated into AllCoreDevs Execution (ACDE) and Consensus (ACDC) bi-weekly calls.',
    whyItMatters: 'Allowed client engineering teams to focus deeply on layer-specific implementation details without context overload.',
    takeaway: 'Governance structures must evolve alongside technical architecture complexity.',
    terms: ['ACDE', 'ACDC', 'AllCoreDevs', 'Governance Cadence'],
    iconName: 'ShieldCheck',
  },

  // 2021
  {
    id: 'london-eip1559-2021',
    title: 'London Upgrade & EIP-1559 Fee Market Reform',
    date: 'August 5, 2021',
    year: '2021',
    category: 'upgrades',
    statusBadge: 'Mainnet Activated',
    statusType: 'purple',
    description: 'Activated EIP-1559, introducing base fee burning and predictable gas pricing for Ethereum transactions.',
    whyItMatters: 'Transformed Ethereum\'s monetary policy by burning billions of dollars in ETH fees and improving wallet gas estimation.',
    takeaway: 'Aligning protocol fee economics with asset scarcity fundamentally strengthens network value accrued to token holders.',
    eips: [
      { number: '1559', link: '/eip/1559', title: 'Fee Market Change for ETH 1.0' },
      { number: '3198', link: '/eip/3198', title: 'BASEFEE Opcode' },
    ],
    terms: ['London', 'EIP-1559', 'Base Fee', 'Fee Burn', 'Gas Market'],
    iconName: 'Flame',
  },
  {
    id: 'altair-beacon-2021',
    title: 'Beacon Chain Altair Upgrade',
    date: 'October 27, 2021',
    year: '2021',
    category: 'upgrades',
    statusBadge: 'Consensus Activated',
    statusType: 'info',
    description: 'First scheduled upgrade of the consensus layer, adding sync committees for light client support and adjusting inactivity penalties.',
    whyItMatters: 'Validated the consensus layer upgrade mechanism and laid the groundwork for mobile light clients.',
    takeaway: 'Consensus layer upgrades require precise coordination across independent validator client implementations.',
    terms: ['Altair', 'Sync Committees', 'Light Clients', 'Consensus'],
    iconName: 'Layers',
  },
  {
    id: 'berlin-typed-tx-2021',
    title: 'Berlin Upgrade & EIP-2718 Typed Transactions',
    date: 'April 15, 2021',
    year: '2021',
    category: 'standards',
    statusBadge: 'Mainnet Activated',
    statusType: 'success',
    description: 'Introduced EIP-2718 (Typed Transaction Envelope), EIP-2929 (State Access Gas Costs), and EIP-2930 (Optional Access Lists).',
    whyItMatters: 'EIP-2718 established an extensible framework allowing future transaction types (like EIP-1559 and EIP-4844 blobs).',
    takeaway: 'Extensible architectural envelopes prevent technical debt when adding future protocol capabilities.',
    eips: [
      { number: '2718', link: '/eip/2718', title: 'Typed Transaction Envelope' },
      { number: '2929', link: '/eip/2929', title: 'Gas Cost Increases for State Access' },
    ],
    terms: ['Berlin', 'EIP-2718', 'Typed Transactions', 'State Access'],
    iconName: 'Terminal',
  },

  // 2020
  {
    id: 'beacon-genesis-2020',
    title: 'Beacon Chain Phase 0 Genesis',
    date: 'December 1, 2020',
    year: '2020',
    category: 'upgrades',
    statusBadge: 'Consensus Launch',
    statusType: 'purple',
    description: 'Genesis block of the Proof-of-Stake Beacon Chain was produced with 21,000+ active validators.',
    whyItMatters: 'Initiated Ethereum\'s multi-year transition to Proof of Stake by running the consensus engine in parallel with PoW.',
    takeaway: 'Parallel network deployment allows live testing of new consensus engines under real economic stake.',
    terms: ['Beacon Chain', 'Genesis', 'Proof of Stake', 'Phase 0', 'Validators'],
    iconName: 'Flame',
  },
  {
    id: 'staking-deposit-contract-2020',
    title: 'Staking Deposit Contract Reaches Threshold',
    date: 'November 24, 2020',
    year: '2020',
    category: 'governance',
    statusBadge: 'Ecosystem Threshold',
    statusType: 'success',
    description: 'The official deposit contract crossed the required 524,288 ETH minimum threshold required to trigger Beacon Chain genesis.',
    whyItMatters: 'Demonstrated organic ecosystem alignment as thousands of community members staked their ETH to launch PoS.',
    takeaway: 'Community economic alignment is the ultimate validation of protocol upgrades.',
    terms: ['Deposit Contract', 'Staking Threshold', 'Validator Deposit'],
    iconName: 'ShieldCheck',
  },
  {
    id: 'erc2771-meta-tx-2020',
    title: 'ERC-2771 Meta-Transactions Standard',
    date: 'July 2020',
    year: '2020',
    category: 'standards',
    statusBadge: 'Final Standard',
    statusType: 'info',
    description: 'Standardized secure gasless transaction relaying via trusted forwarder contracts.',
    whyItMatters: 'Enabled applications to sponsor user gas fees before full account abstraction solutions matured.',
    takeaway: 'Pragmatic application standards bridge immediate user needs while long-term protocol upgrades build out.',
    eips: [
      { number: '2771', link: '/erc/erc-2771', title: 'Secure Protocol Native Meta Transactions' },
    ],
    terms: ['ERC-2771', 'Meta-Transactions', 'Gasless', 'Forwarder'],
    iconName: 'Zap',
  },

  // 2015-2019
  {
    id: 'istanbul-2019',
    title: 'Istanbul Upgrade & Calldata Reduction',
    date: 'December 7, 2019',
    year: '2015-2019',
    category: 'upgrades',
    statusBadge: 'Historical Upgrade',
    statusType: 'purple',
    description: 'Lowered calldata gas costs (EIP-2028) and added zk-SNARK precompiles (EIP-152, EIP-1108).',
    whyItMatters: 'Laid the initial groundwork for Layer 2 rollups by making transaction data cheaper.',
    takeaway: 'Lowering calldata gas costs was the first critical step enabling modern rollup scaling.',
    eips: [
      { number: '2028', link: '/eip/2028', title: 'Transaction Data Gas Cost Reduction' },
      { number: '1108', link: '/eip/1108', title: 'Reduce alt_bn128 Precompile Costs' },
    ],
    terms: ['Istanbul', 'Calldata Cost', 'zk-SNARKs', 'Precompiles'],
    iconName: 'Flame',
  },
  {
    id: 'byzantium-constantinople-2017-2019',
    title: 'Byzantium & Constantinople Upgrades',
    date: '2017 – 2019',
    year: '2015-2019',
    category: 'upgrades',
    statusBadge: 'Historical Upgrade',
    statusType: 'info',
    description: 'Added REVERT, STATICCALL, CREATE2, bitwise shifting instructions, and difficulty bomb adjustments.',
    whyItMatters: 'CREATE2 enabled counterfactual contract deployment, forming the bedrock of modern state channels and wallet proxies.',
    takeaway: 'EVM opcode additions like CREATE2 unlocked modular smart contract wallet architecture.',
    eips: [
      { number: '1014', link: '/eip/1014', title: 'Skinny CREATE2' },
      { number: '140', link: '/eip/140', title: 'REVERT Instruction' },
      { number: '214', link: '/eip/214', title: 'STATICCALL Opcode' },
    ],
    terms: ['Constantinople', 'Byzantium', 'CREATE2', 'REVERT'],
    iconName: 'Terminal',
  },
  {
    id: 'erc20-erc721-standards',
    title: 'ERC-20 & ERC-721 Token Standards Finalized',
    date: '2017 – 2018',
    year: '2015-2019',
    category: 'standards',
    statusBadge: 'Foundational Standards',
    statusType: 'success',
    description: 'Finalized standard interfaces for fungible tokens (ERC-20) and non-fungible tokens (ERC-721).',
    whyItMatters: 'Triggered the expansion of decentralized finance (DeFi) and digital collectibles by standardizing asset tokenization.',
    takeaway: 'Standardization is the fundamental enabler of composability across decentralized applications.',
    eips: [
      { number: '20', link: '/erc/erc-20', title: 'Token Standard' },
      { number: '721', link: '/erc/erc-721', title: 'Non-Fungible Token Standard' },
    ],
    terms: ['ERC-20', 'ERC-721', 'Tokens', 'NFTs', 'DeFi'],
    iconName: 'Coins',
  },
  {
    id: 'frontier-homestead-2015',
    title: 'Frontier & Homestead Mainnet Genesis',
    date: 'July 30, 2015 / March 14, 2016',
    year: '2015-2019',
    category: 'upgrades',
    statusBadge: 'Network Origin',
    statusType: 'purple',
    description: 'Ethereum network launched with the Frontier genesis block, followed by the Homestead upgrade stabilizing the protocol.',
    whyItMatters: 'Began the world\'s first programmable smart contract blockchain platform.',
    takeaway: 'Decentralized programmable smart contracts laid the foundation for the Web3 ecosystem.',
    terms: ['Frontier', 'Homestead', 'Genesis', 'Smart Contracts'],
    iconName: 'Flame',
  },
];

export const YEAR_CONCLUSIONS: Record<string, YearConclusion[]> = {
  '2026': [
    { lead: 'PeerDAS sampling', detail: 'became the primary architecture for scaling blob bandwidth.' },
    { lead: 'EIP-7702 adoption', detail: 'upgraded traditional EOAs into smart accounts ecosystem-wide.' },
    { lead: 'Cross-chain intents', detail: 'unified user experience across fragmented rollup networks.' },
  ],
  '2025': [
    { lead: 'Pectra Upgrade', detail: 'delivered massive validator MaxEB efficiency and EOA account code upgrades.' },
    { lead: 'Calldata cost caps', detail: 'protected node synchronization and execution payload stability.' },
    { lead: 'Governance V2', detail: 'streamlined editor triage velocity and category working groups.' },
  ],
  '2024': [
    { lead: 'Dencun & EIP-4844', detail: 'slashed rollup transaction costs by over 90% via blob space.' },
    { lead: 'EIP-7702 proposal', detail: 'reshaped account abstraction roadmap for existing accounts.' },
    { lead: 'Modular smart accounts', detail: 'standardized wallet plugin architecture via ERC-7579.' },
  ],
  '2023': [
    { lead: 'Shapella Upgrade', detail: 'unlocked validator withdrawals and completed PoS lifecycle.' },
    { lead: 'ERC-4337 EntryPoint', detail: 'sparked widespread adoption of Account Abstraction tooling.' },
    { lead: 'Transient storage', detail: 'introduced TLOAD/TSTORE for cheap in-tx storage.' },
  ],
  '2022': [
    { lead: 'The Merge', detail: 'transitioned Ethereum to Proof-of-Stake with zero downtime.' },
    { lead: 'ERC-4626', detail: 'standardized yield-bearing vault interfaces across DeFi.' },
    { lead: 'AllCoreDevs split', detail: 'separated Execution and Consensus call agendas.' },
  ],
  '2021': [
    { lead: 'EIP-1559', detail: 'reformed fee mechanics and initiated base fee burning.' },
    { lead: 'Altair', detail: 'established the consensus layer upgrade framework.' },
    { lead: 'EIP-2718', detail: 'introduced extensible typed transaction envelopes.' },
  ],
  '2020': [
    { lead: 'Beacon Chain Genesis', detail: 'launched Phase 0 of Proof-of-Stake consensus.' },
    { lead: 'Deposit contract', detail: 'surpassed staking thresholds driven by community support.' },
    { lead: 'Meta-transactions', detail: 'standardized early gasless relayer patterns.' },
  ],
  '2015-2019': [
    { lead: 'Genesis & Homestead', detail: 'established the first programmable smart contract network.' },
    { lead: 'ERC-20 & ERC-721', detail: 'created standardized tokenization for DeFi and NFTs.' },
    { lead: 'CREATE2 & REVERT', detail: 'expanded EVM programability and account proxy patterns.' },
  ],
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'PeerDAS',
    meaning: 'Peer Data Availability Sampling (EIP-7594) allowing nodes to verify blob availability via P2P sampling without downloading full blobs.',
    category: 'Data Scaling',
    link: '/eip/7594',
  },
  {
    term: 'Blob Transactions',
    meaning: 'Temporary data-carrying payload format introduced in EIP-4844 specifically optimized for L2 rollup data availability.',
    category: 'Data Scaling',
    link: '/eip/4844',
  },
  {
    term: 'EIP-7702',
    meaning: 'Mechanism allowing EOAs to temporarily set contract code during transaction execution, bringing smart account powers to normal keys.',
    category: 'Account Abstraction',
    link: '/eip/7702',
  },
  {
    term: 'ERC-4337',
    meaning: 'Account abstraction standard using an off-chain UserOperation mempool and on-chain EntryPoint contract without hard fork changes.',
    category: 'Account Abstraction',
    link: '/erc/erc-4337',
  },
  {
    term: 'MaxEB (EIP-7251)',
    meaning: 'Increases the maximum effective balance for validators from 32 ETH to 2048 ETH, allowing validator consolidation.',
    category: 'Staking',
    link: '/eip/7251',
  },
  {
    term: 'ePBS (EIP-7732)',
    meaning: 'Enshrined Proposer-Builder Separation, separating block proposal from block execution payloads natively at consensus.',
    category: 'Consensus',
    link: '/eip/7732',
  },
  {
    term: 'EIP-1559',
    meaning: 'Fee market reform introducing a dynamic base fee that is burned on every transaction, plus an optional priority tip.',
    category: 'Economics',
    link: '/eip/1559',
  },
  {
    term: 'Transient Storage (EIP-1153)',
    meaning: 'Opcodes (TLOAD/TSTORE) providing gas-cheap storage that automatically resets at the end of the transaction.',
    category: 'EVM',
    link: '/eip/1153',
  },
];
