// ─────────────────────────────────────────────────────────────────────────────
// EIP / ERC on-chain adoption catalog (EIPsInsight · /adoption)
//
// The single, EDITABLE source of truth for which standards the adoption
// dashboard tracks and HOW each one is detected on-chain. Add a standard by
// appending an entry here — the leaderboard and overview read straight from it.
//
// Detection is evidence-based, not self-reported. Each standard declares a
// `detect` strategy the ORPC `adoption` procedures run against our own Ethereum
// archive index (ClickHouse `ethereum.logs` / `ethereum.contract_events`):
//
//   • transfer  — the shared ERC-20/721 `Transfer(address,address,uint256)`
//                 signature, split by whether the 3rd topic (tokenId) is
//                 indexed: present ⇒ ERC-721, absent ⇒ ERC-20.
//   • event     — one or more UNIQUE event signatures only this standard emits
//                 (counted from the pre-aggregated contract_events rollup).
//   • deferred  — tracked in the catalog but not yet ranked: the standard is
//                 off-chain (signatures), interface-only (ERC-165), or
//                 transaction-type based (EIP-7702) and needs a different
//                 measurement than event detection. Shown, never faked.
//
// Coverage: our log index begins at the Dencun activation block (19,426,587,
// 2024-03-13). Counts are "within coverage", a conservative floor vs full
// history. Mainnet only in v1.
// ─────────────────────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export type Detect =
  | { kind: 'transfer'; side: 'erc20' | 'erc721' }
  | { kind: 'event'; topics: string[] }
  | { kind: 'deferred'; reason: string };

export type Standard = {
  id: string; // stable slug, e.g. 'erc-20'
  eip: string; // display label, e.g. 'ERC-20'
  name: string; // human name
  category: 'Tokens' | 'Accounts' | 'Proxies' | 'Interfaces' | 'Signatures' | 'Security' | 'Identity' | 'Applications';
  blurb: string; // one line, what it is
  specUrl: string;
  confidence: Confidence; // how strong the detection evidence is
  evidence: string; // plain-language note on WHY a match counts (shown in UI)
  detect: Detect;
};

// Canonical event-signature hashes (keccak of the event signature), lowercase.
export const SIG = {
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer(address,address,uint256)
  ERC1155_SINGLE: '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', // TransferSingle
  ERC1155_BATCH: '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb', // TransferBatch
  ERC1967_UPGRADED: '0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b', // Upgraded(address)
  ERC4626_DEPOSIT: '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7', // Deposit(address,address,uint256,uint256)
  ERC4626_WITHDRAW: '0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db', // Withdraw(...)
  ERC4337_USEROP: '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f', // UserOperationEvent
  ERC777_SENT: '0x06b541ddaa720db2b10a4d0cdac39b8d360425fc073085fac19bc82614677987', // Sent(...)
} as const;

// Coverage floor for every on-chain count on this dashboard.
export const COVERAGE = {
  fromBlock: 19426587,
  fromDate: '2024-03-13', // Dencun activation (EIP-4844)
  network: 'Ethereum mainnet',
} as const;

// ── Ranked standards: detectable from on-chain events, shown in the leaderboard.
export const STANDARDS: Standard[] = [
  {
    id: 'erc-20',
    eip: 'ERC-20',
    name: 'Fungible Tokens',
    category: 'Tokens',
    blurb: 'The fungible token interface behind nearly every on-chain asset.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-20',
    confidence: 'high',
    evidence: 'Emits Transfer with value in data (tokenId not indexed) — the 3rd log topic is absent.',
    detect: { kind: 'transfer', side: 'erc20' },
  },
  {
    id: 'erc-721',
    eip: 'ERC-721',
    name: 'NFTs',
    category: 'Tokens',
    blurb: 'Non-fungible tokens: unique, individually owned assets.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-721',
    confidence: 'high',
    evidence: 'Emits Transfer with an indexed tokenId — the 3rd log topic is present.',
    detect: { kind: 'transfer', side: 'erc721' },
  },
  {
    id: 'erc-1155',
    eip: 'ERC-1155',
    name: 'Multi-Token',
    category: 'Tokens',
    blurb: 'One contract managing many fungible and non-fungible token ids.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-1155',
    confidence: 'high',
    evidence: 'Emits the unique TransferSingle / TransferBatch events defined only by ERC-1155.',
    detect: { kind: 'event', topics: [SIG.ERC1155_SINGLE, SIG.ERC1155_BATCH] },
  },
  {
    id: 'erc-1967',
    eip: 'ERC-1967',
    name: 'Proxy Storage Slots',
    category: 'Proxies',
    blurb: 'Standard storage slots for upgradeable proxy contracts.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-1967',
    confidence: 'high',
    evidence: 'Emits the Upgraded(address) event from the standardized implementation slot.',
    detect: { kind: 'event', topics: [SIG.ERC1967_UPGRADED] },
  },
  {
    id: 'erc-4626',
    eip: 'ERC-4626',
    name: 'Tokenized Vaults',
    category: 'Tokens',
    blurb: 'A standard interface for yield-bearing vault shares.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-4626',
    confidence: 'high',
    evidence: 'Emits the ERC-4626-specific Deposit / Withdraw events (four-argument form).',
    detect: { kind: 'event', topics: [SIG.ERC4626_DEPOSIT, SIG.ERC4626_WITHDRAW] },
  },
  {
    id: 'erc-4337',
    eip: 'ERC-4337',
    name: 'Account Abstraction',
    category: 'Accounts',
    blurb: 'Smart-contract accounts via a UserOperation mempool and EntryPoint.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-4337',
    confidence: 'high',
    evidence: 'UserOperationEvent is emitted by the canonical EntryPoint contracts; counts are EntryPoints, not wallets.',
    detect: { kind: 'event', topics: [SIG.ERC4337_USEROP] },
  },
  {
    id: 'erc-777',
    eip: 'ERC-777',
    name: 'Token Operators & Hooks',
    category: 'Tokens',
    blurb: 'An advanced fungible token with operators and send/receive hooks.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-777',
    confidence: 'high',
    evidence: 'Emits the Sent(...) event unique to ERC-777 operator transfers.',
    detect: { kind: 'event', topics: [SIG.ERC777_SENT] },
  },
];

// ── Catalog-only standards: tracked, but detection needs a non-event method.
// Listed for transparency and as the roadmap for what gets measured next.
export const DEFERRED: Standard[] = [
  { id: 'eip-712', eip: 'EIP-712', name: 'Typed Structured Data', category: 'Signatures', blurb: 'Human-readable typed data signing.', specUrl: 'https://eips.ethereum.org/EIPS/eip-712', confidence: 'low', evidence: 'Used in off-chain signing; no reliable on-chain event. Measured via usage, not deployments.', detect: { kind: 'deferred', reason: 'Off-chain signatures' } },
  { id: 'eip-7702', eip: 'EIP-7702', name: 'EOA Code Delegation', category: 'Accounts', blurb: 'Let an EOA temporarily act as a smart account.', specUrl: 'https://eips.ethereum.org/EIPS/eip-7702', confidence: 'low', evidence: 'Measured through type-4 authorization transactions, not contract deployments.', detect: { kind: 'deferred', reason: 'Transaction-type based' } },
  { id: 'erc-2612', eip: 'ERC-2612', name: 'Permit Approvals', category: 'Tokens', blurb: 'Gasless ERC-20 approvals via signatures.', specUrl: 'https://eips.ethereum.org/EIPS/eip-2612', confidence: 'low', evidence: 'A permit() function, not an event — needs ABI/bytecode detection.', detect: { kind: 'deferred', reason: 'Function, not event' } },
  { id: 'erc-1271', eip: 'ERC-1271', name: 'Contract Signatures', category: 'Signatures', blurb: 'Signature validation for smart-contract wallets.', specUrl: 'https://eips.ethereum.org/EIPS/eip-1271', confidence: 'low', evidence: 'isValidSignature() view call — no event trail.', detect: { kind: 'deferred', reason: 'View function' } },
  { id: 'erc-165', eip: 'ERC-165', name: 'Interface Detection', category: 'Interfaces', blurb: 'Standard way to ask a contract which interfaces it supports.', specUrl: 'https://eips.ethereum.org/EIPS/eip-165', confidence: 'low', evidence: 'supportsInterface() view call — detected by probing, not logs.', detect: { kind: 'deferred', reason: 'Interface probe' } },
  { id: 'erc-6551', eip: 'ERC-6551', name: 'Token-Bound Accounts', category: 'Applications', blurb: 'Smart-contract accounts owned by NFTs.', specUrl: 'https://eips.ethereum.org/EIPS/eip-6551', confidence: 'low', evidence: 'Registry events vary by deployment; needs multi-registry coverage before ranking.', detect: { kind: 'deferred', reason: 'Multi-registry' } },
  { id: 'erc-2981', eip: 'ERC-2981', name: 'NFT Royalties', category: 'Tokens', blurb: 'A standard royalty-info interface for NFTs.', specUrl: 'https://eips.ethereum.org/EIPS/eip-2981', confidence: 'low', evidence: 'royaltyInfo() view function — no event.', detect: { kind: 'deferred', reason: 'View function' } },
];
