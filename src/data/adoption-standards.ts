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
  | { kind: 'calldata'; selector: string } // function selector (4-byte prefix) on ethereum.transactions.input
  | { kind: 'txtype'; txType: number } // a transaction-type feature (e.g. EIP-7702 set-code), measured from ethereum.transactions
  | { kind: 'system_contract'; address: string } // protocol system contract address called via ethereum.transactions.to_address
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
  ERC5192_LOCKED: '0x032bc66be43dbccb7487781d168eb7bda224628a3b2c3388bdf69b532a3a1611', // Locked(uint256)
  ERC5192_UNLOCKED: '0xf27b6ce5b2f5e68ddb2fd95a8a909d4ecf1daaac270935fff052feacb24f1842', // Unlocked(uint256)
  ERC2309_CONSECUTIVE: '0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d', // ConsecutiveTransfer(uint256,uint256,address,address)
  ERC3525_TRANSFERVALUE: '0x0b2aac84f3ec956911fd78eae5311062972ff949f38412e8da39069d9f068cc6', // TransferValue(uint256,uint256,uint256)
  ERC3525_SLOTCHANGED: '0xe4f48c240d3b994948aa54f3e2f5fca59263dfe1d52b6e4cf39a5d249b5ccb65', // SlotChanged(uint256,uint256,uint256)
  ERC4907_UPDATEUSER: '0x4e06b4e7000e659094299b3533b47b6aa8ad048e95e872d23d1f4ee55af89cfe', // UpdateUser(uint256,address,uint64)
  ERC6551_ACCOUNT_CREATED: '0x79f19b3655ee38b1ce526556b7731a20c8f218fbda4a3990b6cc4172fdf88722', // ERC6551AccountCreated(address,address,bytes32,uint256,address,uint256)
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
  {
    id: 'eip-7702',
    eip: 'EIP-7702',
    name: 'EOA Code Delegation',
    category: 'Accounts',
    blurb: 'Lets an EOA run smart-account code via a signed delegation.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-7702',
    confidence: 'high',
    evidence: 'Measured from type-4 (set-code) authorization transactions — a transaction feature, counted as delegating accounts, not contracts.',
    detect: { kind: 'txtype', txType: 4 },
  },
  {
    id: 'eip-1559',
    eip: 'EIP-1559',
    name: 'Dynamic Fee Market',
    category: 'Applications',
    blurb: 'Base-fee burn and priority-tip pricing used by most mainnet transactions.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-1559',
    confidence: 'high',
    evidence: 'Measured from type-2 transactions in ethereum.transactions.',
    detect: { kind: 'txtype', txType: 2 },
  },
  {
    id: 'eip-4844',
    eip: 'EIP-4844',
    name: 'Shard Blob Transactions',
    category: 'Applications',
    blurb: 'Dedicated blob-carrying transactions used by rollups for L2 data availability.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-4844',
    confidence: 'high',
    evidence: 'Measured from type-3 (blob) transactions in ethereum.transactions.',
    detect: { kind: 'txtype', txType: 3 },
  },
  {
    id: 'eip-2930',
    eip: 'EIP-2930',
    name: 'Optional Access Lists',
    category: 'Applications',
    blurb: 'Transactions declaring storage slots and addresses up front to mitigate gas repricings.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-2930',
    confidence: 'high',
    evidence: 'Measured from type-1 (access-list) transactions in ethereum.transactions.',
    detect: { kind: 'txtype', txType: 1 },
  },
  {
    id: 'eip-7002',
    eip: 'EIP-7002',
    name: 'Execution-Layer Exits',
    category: 'Accounts',
    blurb: 'Lets smart contracts and stakers trigger validator withdrawals directly from the execution layer.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-7002',
    confidence: 'high',
    evidence: 'Measured from transactions calling the canonical EIP-7002 withdrawal request system contract (0x00000961…7002).',
    detect: { kind: 'system_contract', address: '0x00000961ef480eb55e80d19ad83579a64c007002' },
  },
  {
    id: 'eip-7251',
    eip: 'EIP-7251',
    name: 'MaxEB Consolidations',
    category: 'Accounts',
    blurb: 'Allows validator balances above 32 ETH and execution-layer consolidation requests.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-7251',
    confidence: 'high',
    evidence: 'Measured from transactions calling the canonical EIP-7251 consolidation request system contract (0x0000bbdd…7251).',
    detect: { kind: 'system_contract', address: '0x0000bbddc7ce488642fb579f8b00f3a590007251' },
  },
  {
    id: 'eip-4788',
    eip: 'EIP-4788',
    name: 'Beacon Block Root',
    category: 'Applications',
    blurb: 'Exposes consensus-layer beacon block roots inside the EVM for trustless staking and bridge proofs.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-4788',
    confidence: 'high',
    evidence: 'Measured from transactions interacting with the EIP-4788 beacon roots system contract (0x000f3df6…ac02).',
    detect: { kind: 'system_contract', address: '0x000f3df6d732807ef1319fb7b8bb8522d0beac02' },
  },
  {
    id: 'erc-5192',
    eip: 'ERC-5192',
    name: 'Minimal Soulbound NFTs',
    category: 'Tokens',
    blurb: 'Non-transferable (soulbound) NFTs.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-5192',
    confidence: 'high',
    evidence: 'Emits the Locked / Unlocked events unique to ERC-5192.',
    detect: { kind: 'event', topics: [SIG.ERC5192_LOCKED, SIG.ERC5192_UNLOCKED] },
  },
  {
    id: 'erc-2309',
    eip: 'ERC-2309',
    name: 'Consecutive NFT Transfers',
    category: 'Tokens',
    blurb: 'Gas-efficient batch minting of NFT ranges.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-2309',
    confidence: 'high',
    evidence: 'Emits the ConsecutiveTransfer event for ranged mints.',
    detect: { kind: 'event', topics: [SIG.ERC2309_CONSECUTIVE] },
  },
  {
    id: 'erc-3525',
    eip: 'ERC-3525',
    name: 'Semi-Fungible Tokens',
    category: 'Tokens',
    blurb: 'Tokens that carry both an id and a value (semi-fungible).',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-3525',
    confidence: 'high',
    evidence: 'Emits the TransferValue / SlotChanged events unique to ERC-3525.',
    detect: { kind: 'event', topics: [SIG.ERC3525_TRANSFERVALUE, SIG.ERC3525_SLOTCHANGED] },
  },
  {
    id: 'erc-4907',
    eip: 'ERC-4907',
    name: 'Rental NFTs',
    category: 'Tokens',
    blurb: 'NFTs with a time-limited "user" role for rentals.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-4907',
    confidence: 'high',
    evidence: 'Emits the UpdateUser event when a time-limited user is set.',
    detect: { kind: 'event', topics: [SIG.ERC4907_UPDATEUSER] },
  },
  {
    id: 'erc-6551',
    eip: 'ERC-6551',
    name: 'Token-Bound Accounts',
    category: 'Applications',
    blurb: 'Smart-contract accounts owned by NFTs.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-6551',
    confidence: 'high',
    evidence: 'Emits ERC6551AccountCreated when a token-bound account is deployed.',
    detect: { kind: 'event', topics: [SIG.ERC6551_ACCOUNT_CREATED] },
  },
  {
    id: 'erc-2612',
    eip: 'ERC-2612',
    name: 'Permit Approvals',
    category: 'Tokens',
    blurb: 'Gasless ERC-20 approvals via off-chain signatures.',
    specUrl: 'https://eips.ethereum.org/EIPS/eip-2612',
    confidence: 'high',
    evidence: 'Measured from permit() calls (selector 0xd505accf) on ethereum.transactions — counted by implementing token contracts.',
    detect: { kind: 'calldata', selector: '0xd505accf' },
  },
];

// ── Catalog-only standards: tracked, but detection needs a non-event method.
// Listed for transparency and as the roadmap for what gets measured next.
export const DEFERRED: Standard[] = [
  { id: 'eip-712', eip: 'EIP-712', name: 'Typed Structured Data', category: 'Signatures', blurb: 'Human-readable typed data signing.', specUrl: 'https://eips.ethereum.org/EIPS/eip-712', confidence: 'low', evidence: 'Used in off-chain signing; no reliable on-chain event.', detect: { kind: 'deferred', reason: 'Off-chain signatures' } },
  { id: 'erc-1271', eip: 'ERC-1271', name: 'Contract Signatures', category: 'Signatures', blurb: 'Signature validation for smart-contract wallets.', specUrl: 'https://eips.ethereum.org/EIPS/eip-1271', confidence: 'low', evidence: 'isValidSignature() view call — no event trail.', detect: { kind: 'deferred', reason: 'View function' } },
  { id: 'erc-165', eip: 'ERC-165', name: 'Interface Detection', category: 'Interfaces', blurb: 'Standard way to ask a contract which interfaces it supports.', specUrl: 'https://eips.ethereum.org/EIPS/eip-165', confidence: 'low', evidence: 'supportsInterface() view call — detected by probing, not logs.', detect: { kind: 'deferred', reason: 'Interface probe' } },
  { id: 'erc-2981', eip: 'ERC-2981', name: 'NFT Royalties', category: 'Tokens', blurb: 'A standard royalty-info interface for NFTs.', specUrl: 'https://eips.ethereum.org/EIPS/eip-2981', confidence: 'low', evidence: 'royaltyInfo() view function — no event.', detect: { kind: 'deferred', reason: 'View function' } },
];
