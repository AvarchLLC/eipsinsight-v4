// Glamsterdam repricing-impact research (EIPsInsight, Nov 2026).
//
// Findings come from a two-stage audit run on EIPsInsight's own Ethereum
// archive node: a static scan of the busiest mainnet contracts against the 8
// invariants in ethereum/glamsterdam-gas-invariants, then a differential replay
// of their real transactions under Osaka (current) vs Amsterdam (EIP-8037/8038)
// rules with revm@glamsterdam-devnet-8. A transaction that succeeds under Osaka
// and reverts under Amsterdam is a repricing-attributable break; each is swept
// at 3x gas to separate fixed-gas (user raises the limit) from hard-break (a
// signed or hard-coded limit more gas can't fix).
//
// Every number here maps to a real transaction on Etherscan. The AA hard-breaks
// are confirmed by replay; the per-invariant counts are from the static scan
// (how many flagged contracts rely on each assumption), not all confirmed.

export const META = {
  fork: 'Glamsterdam',
  eips: 'EIP-8037 / EIP-8038',
  published: 'November 2026',
  scanned: 300,
  flagged: 115,
  replayedContracts: 25,
  txsEach: 50,
} as const;

// The headline numbers, each with a plain line on what it actually means.
export const SNAPSHOT: { v: string; k: string; note: string; danger?: boolean }[] = [
  { v: '300', k: 'contracts scanned', note: 'the most active contracts on Ethereum mainnet' },
  { v: '115', k: 'flagged by the scan', note: 'their code makes an assumption about gas that Glamsterdam can break' },
  { v: '25 × 50', k: 'transactions replayed', note: 'the top 25 flagged contracts, 50 recent transactions each, re-run under both rule sets' },
  { v: '3', k: 'account-abstraction break classes', note: 'ERC-4337 contracts that fail for good, no matter how much gas you add', danger: true },
];

// ── What the repricing actually changes ──
export const WHATS_CHANGING = {
  title: 'EIP-8037 and EIP-8038 enter the fork',
  body: 'Two state-gas repricings: 8037 raises the cost of creating state (new accounts and storage slots) and adds a state-gas reservoir; 8038 reprices state access. No deployed contract changes, but the gas every transaction needs does.',
} as const;

// ── The pipeline, as a funnel ──
export type FunnelStep = { label: string; value: string; width: number; tone: 'base' | 'warn' | 'break'; desc: string };
export const FUNNEL: FunnelStep[] = [
  { label: 'Scanned', value: '300', width: 100, tone: 'base', desc: 'busiest mainnet contracts, ranked against the 8 invariants' },
  { label: 'Flagged', value: '115', width: 70, tone: 'base', desc: 'carry risky gas patterns (hard-coded gas, fixed reserves, refund assumptions)' },
  { label: 'Replayed', value: '25 × 50', width: 46, tone: 'warn', desc: 'top contracts × recent txs, executed under both rule sets' },
  { label: 'Confirmed', value: 'AA class', width: 26, tone: 'break', desc: 'hard-breaks that still fail at 3× gas' },
];

// ── The replayed set: the notable contracts and what happened to each ──
// 12 of the top-25 flagged contracts are individually notable; the rest were
// high-volume contracts whose txs passed unchanged or only needed more gas.
export type Outcome = 'hard-break' | 'out-of-gas' | 'fixable';
export type Replayed = { name: string; addr: string; outcome: Outcome; rate: string };
export const REPLAYED: Replayed[] = [
  { name: 'ERC-4337 account / module', addr: '0x4337084d9e255ff0702461cf8895ce9e3b5ff108', outcome: 'hard-break', rate: '25 / 50' },
  { name: 'ERC-4337 EntryPoint v0.7', addr: '0x0000000071727de22e5e9d8baf0edac6f37da032', outcome: 'hard-break', rate: '17 / 50' },
  { name: 'ERC-4337 EntryPoint v0.6', addr: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789', outcome: 'hard-break', rate: '13 / 50' },
  { name: 'Uniswap V3 Position Manager', addr: '0xc36442b4a4522e871399cd717abdd847ab11fe88', outcome: 'out-of-gas', rate: '3 / 50' },
  { name: 'Unverified contract', addr: '0x442be06bb5d13711a22ccd3fa382b72a874c5135', outcome: 'out-of-gas', rate: '3 / 50' },
  { name: 'Unverified contract', addr: '0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6', outcome: 'out-of-gas', rate: '2 / 50' },
  { name: 'Uniswap Universal Router', addr: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', outcome: 'fixable', rate: '41 / 50' },
  { name: 'Uniswap V2 Router 02', addr: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', outcome: 'fixable', rate: '37 / 50' },
  { name: '1inch Aggregation Router V6', addr: '0x111111125421ca6dc452d289314280a0f8842a65', outcome: 'fixable', rate: '32 / 50' },
  { name: 'Router / settlement', addr: '0x0fef9e88a7b76bcdbf451780c6774fe32965ee98', outcome: 'fixable', rate: '48 / 50' },
  { name: 'Router', addr: '0x0729e2a4716d9f7dd17858d5d504426d228697f7', outcome: 'fixable', rate: '47 / 50' },
  { name: 'Router', addr: '0x23617e59a5925b2a4bf75d73ff6711cd0b29de85', outcome: 'fixable', rate: '42 / 50' },
];

// ── How we checked, step by step ──
export type Step = { title: string; plain: string; tech: string };
export const STEPS: Step[] = [
  {
    title: 'Static scan',
    plain: 'Rank the 300 busiest contracts and flag the ones whose code makes assumptions about gas.',
    tech: 'Tier 0: ripgrep the verified source of the most-active mainnet contracts for the red-flag patterns in ethereum/glamsterdam-gas-invariants (hard-coded gas literals, fixed reserves, refund-dependent accounting, try/catch swallowing). 115 of 300 match.',
  },
  {
    title: 'Fork real state',
    plain: 'Rebuild the exact chain state each transaction ran against, so the replay sees what the network saw.',
    tech: 'For each candidate tx, fork mainnet state at the parent block from our Reth archive node (debug_/trace_ namespaces), so historical storage and balances are exact.',
  },
  {
    title: 'Execute under both rule sets',
    plain: "Run each transaction twice: once with today's gas prices, once with Glamsterdam's.",
    tech: 'Execute with revm@glamsterdam-devnet-8 under SpecId::OSAKA and SpecId::AMSTERDAM, with the real block environment. Balance/nonce/base-fee checks disabled so the only variable is the gas schedule.',
  },
  {
    title: 'Keep the flips',
    plain: 'Keep only transactions that work today but fail under the new rules.',
    tech: 'A tx that is success under Osaka and revert under Amsterdam is repricing-attributable. The Osaka success is the control: it proves the replay itself is faithful.',
  },
  {
    title: 'Gas-sweep to classify',
    plain: 'Re-run each break with triple the gas. If it still fails, no amount of gas fixes it. That is a hard-break.',
    tech: 'Re-run at 3× gas. Still-failing ⇒ hard-break (internal, signed, or hard-coded limit). Passing ⇒ fixed-gas (the user can raise the transaction gas limit).',
  },
];

// ── The headline finding: AA hard-breaks (confirmed by replay) ──
export type HardBreak = {
  name: string;
  addr: string;
  what: string;
  rate: string;
  pct: number;
  maxDelta: number;
  mechanism: string;
  repro: string[];
};
export const AA_HARD_BREAKS: HardBreak[] = [
  {
    name: 'ERC-4337 EntryPoint v0.7',
    addr: '0x0000000071727de22e5e9d8baf0edac6f37da032',
    what: 'The shared v0.7 EntryPoint. Every ERC-4337 smart-wallet on this version routes its user operations through this one contract, so a break here hits the whole v0.7 ecosystem.',
    rate: '17 / 50',
    pct: 34,
    maxDelta: 145410,
    mechanism: 'AA26 over verificationGasLimit',
    repro: [
      '0x8a8a90b19eba53ad802f6b1bc1f6097efca6f2a025b5b3c75e1ba905a54edc5b',
      '0xeae6b6d5588ae4fa9c4975bcdd6b202faa10c38b705da64a4fc8b389f051724b',
    ],
  },
  {
    name: 'ERC-4337 EntryPoint v0.6',
    addr: '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789',
    what: 'The earlier v0.6 EntryPoint, still carrying significant live traffic. Wallets built on v0.6 have not all migrated, so this stays relevant.',
    rate: '13 / 50',
    pct: 26,
    maxDelta: 390125,
    mechanism: 'AA40 over verificationGasLimit',
    repro: [
      '0xc57171cfdba38d595b0ce7a4ec1695b44c6319710dba83704f3fe5bebddd7d48',
      '0xbd582920fb9317b4ec284b31fdbabea33d8a2ce948aaa3c40d6ba027ee642f0c',
    ],
  },
  {
    name: 'ERC-4337 account / module',
    addr: '0x4337084d9e255ff0702461cf8895ce9e3b5ff108',
    what: 'A widely deployed smart-account (and its validation module) built on ERC-4337. Its own validation runs inside the signed gas budget, so it breaks the same way the EntryPoints do.',
    rate: '25 / 50',
    pct: 50,
    maxDelta: 411180,
    mechanism: 'AA26 over verificationGasLimit',
    repro: [
      '0x6383301073f00b9d216db250359a0257198fa649dd9c5abd109d058bfbf3655f',
      '0xb2b416ce7b226e32d4347f425704897d59b258efd519616e360332beb04a7b76',
    ],
  },
];

// Secondary out-of-gas breaks (different mechanism, smaller).
// `unverified` = no public source on Etherscan, so we can only name it by address.
export const OOG_BREAKS: { name: string; rate: string; note: string; unverified?: boolean }[] = [
  { name: 'Uniswap V3 Position Manager', rate: '3 / 50', note: 'out-of-gas on the state-creating mint paths' },
  { name: '0x442b…5135', rate: '3 / 50', note: 'out-of-gas on a storage-heavy path', unverified: true },
  { name: '0xbdb3…47b6', rate: '2 / 50', note: 'out-of-gas', unverified: true },
];

// Fixed-gas (user-fixable): flip only because the tx gas limit is now too low.
export const FIXED_GAS: { name: string; flips: string }[] = [
  { name: 'Uniswap Universal Router', flips: '41 / 50' },
  { name: 'Uniswap V2 Router 02', flips: '37 / 50' },
  { name: '1inch Aggregation Router V6', flips: '32 / 50' },
];

// Blast radius: real UserOperationEvent counts through each EntryPoint over the
// last 24h, straight from our archive node (eth_getLogs). at-risk = perDay x the
// sampled hard-break rate (an estimate, not a population rate — see caveats).
export const BLAST = {
  entryPoints: [
    { name: 'EntryPoint v0.7', perDay: 19927, pct: 34, atRisk: 6775 },
    { name: 'EntryPoint v0.6', perDay: 3005, pct: 26, atRisk: 781 },
  ],
  totalPerDay: 22932,
  totalAtRisk: 7556,
} as const;

// Worst-case extra gas each break needs beyond its budget (from the replay).
export const GAS_DELTA: { name: string; delta: number; kind: 'aa' | 'oog' }[] = [
  { name: 'ERC-4337 account / module', delta: 411180, kind: 'aa' },
  { name: 'EntryPoint v0.6', delta: 390125, kind: 'aa' },
  { name: 'EntryPoint v0.7', delta: 145410, kind: 'aa' },
  { name: 'UniV3 Position Manager', delta: 118880, kind: 'oog' },
];

// Gas-sweep: fail rate at the tx's normal gas vs 3x gas. Hard-breaks stay put;
// fixable contracts drop to zero once you raise the limit.
export const GAS_SWEEP: { name: string; normal: number; tripled: number; kind: 'hard' | 'fixable' }[] = [
  { name: 'ERC-4337 account / module', normal: 50, tripled: 50, kind: 'hard' },
  { name: 'EntryPoint v0.7', normal: 34, tripled: 34, kind: 'hard' },
  { name: 'EntryPoint v0.6', normal: 26, tripled: 26, kind: 'hard' },
  { name: 'Uniswap Universal Router', normal: 82, tripled: 0, kind: 'fixable' },
  { name: '1inch Aggregation Router', normal: 64, tripled: 0, kind: 'fixable' },
];

// ── Create-and-throw-away contracts (independently measured) ──
export const CREATE_SELFDESTRUCT = {
  perDay: 3456,
  costUpTo: '2.8×',
  stateGas: 183600,
  reportedByEf: 2100,
  repro: [
    '0x4de12d08fdc7a81fd302839e647c94993ea04a21cd7ddd721ffa29dafa417b24',
    '0x5852256b169191bb0330ea2f60ee947b8ddbdf29f34487c14ad0d913c58b92f6',
    '0x42e67723d63d6399ccc7162a5474dbadfa602d85c511d235897b650df7715853',
  ],
} as const;

// ── The 8 invariants, plain + technical ──
// `count` = flagged contracts touching each (static scan). `confirmed` marks the
// two invariants behind the replayed AA hard-breaks.
export type Invariant = {
  id: string;
  count: number;
  confirmed: boolean;
  plain: string;
  tech: string;
};
export const INVARIANTS: Invariant[] = [
  {
    id: 'INV-1',
    count: 96,
    confirmed: false,
    plain: 'A failed inner call no longer fails the whole transaction.',
    tech: 'Contracts that make a low-level CALL and ignore the boolean result (or wrap it in try/catch) assumed an inner out-of-gas would bubble up and revert everything. Repricing can push an inner call out of gas where it previously succeeded; the caller swallows the failure and continues in an inconsistent state.',
  },
  {
    id: 'INV-3',
    count: 73,
    confirmed: false,
    plain: 'A reverted call now hands a different amount of gas back to the caller.',
    tech: 'When a sub-call reverts, the unused gas (minus the 1/64 the EVM retains) returns to the caller. Repricing changes how much gas the sub-call burns before reverting, so the amount handed back shifts. Contracts that budget the next step from the returned gas misbehave.',
  },
  {
    id: 'INV-6',
    count: 32,
    confirmed: false,
    plain: 'Leftover gas after an out-of-gas call is now enough to keep going.',
    tech: 'After a sub-call OOGs, the caller keeps 1/64 of the forwarded gas. Some contracts assume that remainder is too small to do anything and will safely revert. Under repricing the remainder can be large enough to continue into a path the author treated as unreachable.',
  },
  {
    id: 'INV-7',
    count: 32,
    confirmed: true,
    plain: 'Fixed gas reserves and stipends are now too small.',
    tech: 'Constants that reserve a fixed amount of gas for finalization or cleanup were sized against the old schedule. Repricing makes that tail cost more than the reserve, so it is exhausted. This is one half of the ERC-4337 break: the EntryPoint reserves gas against the signed verificationGasLimit.',
  },
  {
    id: 'INV-2',
    count: 28,
    confirmed: false,
    plain: 'Clearing a storage slot refunds gas mid-transaction.',
    tech: 'Code that relies on the net cost of clearing storage (SSTORE refunds under the capped EIP-3529 schedule) breaks when access costs change the arithmetic. Accounting that assumes a refund offsets a later write comes out wrong.',
  },
  {
    id: 'INV-4',
    count: 25,
    confirmed: true,
    plain: 'Hard-coded gas amounts are now too low.',
    tech: 'A literal gas value forwarded to a CALL, such as call{gas: N}(…) or a fixed stipend, no longer covers the operation once state access is repriced upward, so it runs out of gas. This is the other half of the ERC-4337 break: the signed verificationGasLimit is exactly a hard-coded gas budget.',
  },
  {
    id: 'INV-8',
    count: 20,
    confirmed: false,
    plain: 'A failed EIP-7702 delegation can be replayed.',
    tech: 'EIP-7702 set-code authorizations interact with the repricing so that a delegation which failed in one context (for example on gas) can be re-submitted. Contracts assuming a 7702 delegation is single-shot need to re-check the authorization nonce path.',
  },
  {
    id: 'INV-5',
    count: 12,
    confirmed: false,
    plain: 'gasleft() can move in ways that break gas metering.',
    tech: 'Contracts that meter work by the delta of gasleft() between two points assume it only decreases monotonically. With repricing and refund timing, the measured gap can change magnitude or sign, breaking relayer accounting, gas auctions, and similar metering logic.',
  },
];
