// Glamsterdam repricing-impact research (EIPsInsight, Nov 2026).
//
// Two sources, both our own: (1) a static scan of the busiest mainnet contracts
// against the 8 invariants in ethereum/glamsterdam-gas-invariants, flagging
// CANDIDATES (not confirmed breaks); (2) direct measurement on our own Ethereum
// archive node — real user-op traces (AA headroom) and a new-account transfer
// census. The repricing gas numbers come from the EIP-8037 / 8038 spec.

export const META = {
  fork: 'Glamsterdam',
  eips: 'EIP-8037 / EIP-8038',
  published: 'November 2026',
} as const;

// ── The repricing, in numbers (EIP-8037 / 8038) ──
// Before = current (Osaka) gas; after = Glamsterdam. Verified against the EF
// repricing write-up (Nov 2026). These are the three operations the scan keys on.
export type Reprice = { op: string; eip: string; before: number; after: number };
export const REPRICING: Reprice[] = [
  { op: 'Create a new account', eip: 'EIP-8037', before: 25000, after: 183600 },
  { op: 'Create a new storage slot', eip: 'EIP-8037', before: 20000, after: 97920 },
  { op: 'Touch a cold account', eip: 'EIP-8038', before: 2600, after: 3000 },
];

// ── Our own node measurement: plain ETH transfers to NEW (empty) accounts ──
// Under EIP-8037 a value transfer to an empty account needs ~204,600 gas
// (21,000 intrinsic + 183,600 new-account state gas), not the long-assumed
// 21,000. Each day we sampled 1,500 low-gas (<204,600) plain transfers from our
// own Ethereum archive node and checked, at the parent block, whether the
// destination was EMPTY (EIP-161: no code, nonce 0, balance 0) — the exact
// trigger for the new cost. Those transfers would be included with a FAILED
// status under EIP-8037: fee paid, nonce consumed, no ETH moved.
export type NewAcctDay = { date: string; label: string; vol: number; frac: number; atRisk: number };
export const NEWACCT = {
  gasNeeded: 204600,
  baseGas: 21000,
  stateGas: 183600,
  meanPerDay: 99134,
  share21000: 0.72, // of new-account transfers still use the 21,000 default
  sampledPerDay: 1500,
  series: [
    { date: '2026-11-16', label: 'Nov 16', vol: 833285, frac: 0.1227, atRisk: 102216 },
    { date: '2026-11-17', label: 'Nov 17', vol: 840705, frac: 0.1087, atRisk: 91357 },
    { date: '2026-11-18', label: 'Nov 18', vol: 506555, frac: 0.2133, atRisk: 108065 },
    { date: '2026-11-19', label: 'Nov 19', vol: 482025, frac: 0.218, atRisk: 105081 },
    { date: '2026-11-20', label: 'Nov 20', vol: 573134, frac: 0.1833, atRisk: 105075 },
    { date: '2026-11-21', label: 'Nov 21', vol: 614837, frac: 0.1573, atRisk: 96734 },
    { date: '2026-11-22', label: 'Nov 22', vol: 516610, frac: 0.1653, atRisk: 85413 },
  ] as NewAcctDay[],
} as const;

// ── Our own node measurement: create-and-self-destruct (ephemeral accounts) ──
// Detected with trace_block over a 200-block sample across ~2 days: transactions
// that CREATE a fresh address and SELFDESTRUCT it within the same transaction
// (the temporary deposit-address pattern). Under EIP-8037 each fresh account
// pays the full new-account state-creation cost, and because it is destroyed in
// the same tx the old refund no longer offsets it.
export type SdFactory = { name: string; addr: string; hits: number };
export const SELFDESTRUCT = {
  perDayTxs: 2520,
  sampledBlocks: 200,
  eventsSampled: 70,
  stateBefore: 25000,
  stateAfter: 183600,
  // top factories responsible, by share of the sampled events (hits / 70).
  factories: [
    { name: 'Factory', addr: '0x7c5a71c9fefbc7691f9d4ac7baf70c743792f716', hits: 25 },
    { name: '', addr: '0xbccfef37a529c1e9244b5c63ddb6cc5ee74938bb', hits: 11 },
    { name: '', addr: '0x4c1545b236fa7863d76df207b8bc47ac4588ab7f', hits: 4 },
    { name: 'EphemeralFactory', addr: '0x0ace98069f75358b01966fdf453be41ed0bf6fcb', hits: 3 },
    { name: '', addr: '0x58ae4fadb8816457225520918c1074561857e5f4', hits: 3 },
    { name: 'Factory', addr: '0x76ecb32b8941b648c480fba29ee3eeece94a8943', hits: 2 },
  ] as SdFactory[],
  examples: [
    '0x8bfb4286caab3511a10b7a66eb03011cf9b8a1cebb52f9923e1d3294f33b7faa',
    '0x86fe871752278a1eb1dc134187d5686f4286c22b5294cd3ffbbd79badd0206e5',
  ],
} as const;

// ── Measured: extra state-creation gas per operation (our node) ──
// For each flagged contract we traced 25 recent real txs with prestateTracer
// (diff mode), counted the NEW accounts and NEW storage slots each one creates,
// and applied EIP-8037's confirmed deltas: +158,600 gas per new account
// (183,600 − 25,000), +77,920 per new slot (97,920 − 20,000). This measures the
// EIP-8037 state-creation surcharge deterministically, no differential EVM.
export type StateRow = { name: string; addr: string; medSlots: number; medAcct: number; medDelta: number; p75: number; maxDelta: number };
export const STATE_REPLAY = {
  deltaAcct: 158600,
  deltaSlot: 77920,
  perContract: 25,
  rows: [
    { name: 'ForwarderFactoryV4', addr: '0x37996e762fa8b671869740c79eb33f625b3bf92a', medSlots: 2, medAcct: 1, medDelta: 314440, p75: 314440, maxDelta: 314440 },
    { name: 'Uniswap V3 Position Manager', addr: '0xc36442b4a4522e871399cd717abdd847ab11fe88', medSlots: 2, medAcct: 0, medDelta: 155840, p75: 857120, maxDelta: 1714240 },
    { name: 'Seaport (OpenSea)', addr: '0x0000000000000068f116a894984e2db1123eb395', medSlots: 1, medAcct: 0, medDelta: 77920, p75: 311680, maxDelta: 2337600 },
    { name: '1inch Router V6', addr: '0x111111125421ca6dc452d289314280a0f8842a65', medSlots: 1, medAcct: 0, medDelta: 77920, p75: 77920, maxDelta: 233760 },
    { name: 'Uniswap V4 PositionManager', addr: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e', medSlots: 0, medAcct: 0, medDelta: 0, p75: 77920, maxDelta: 701280 },
    { name: 'Aave WrappedTokenGateway', addr: '0xd01607c3c5ecaba394d8be377a08590149325722', medSlots: 0, medAcct: 0, medDelta: 0, p75: 0, maxDelta: 155840 },
    { name: 'Universal Router', addr: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', medSlots: 0, medAcct: 0, medDelta: 0, p75: 0, maxDelta: 77920 },
    { name: 'Uniswap V3 SwapRouter', addr: '0xe592427a0aece92de3edee1f18e0157c05861564', medSlots: 0, medAcct: 0, medDelta: 0, p75: 0, maxDelta: 0 },
  ] as StateRow[],
} as const;

// ── Who sends the at-risk new-account transfers (our node) ──
// From the same sampling method, now also reading the sender: 97% of at-risk
// transfers come from EOAs (wallets / exchange hot wallets), and a small set of
// high-volume senders originate a quarter of them.
export const NEWACCT_SENDERS = {
  sampled: 4000,
  atRisk: 682,
  eoaPct: 97,
  contractPct: 3,
  top15SharePct: 26,
  topSenders: [
    '0x300773969b499b9768267e0c5a049f7751de79e7',
    '0xbb2f33f73ccc2c74e3fb9bb8eb75241ac15337e0',
    '0x264bd8291fae1d75db2c5f573b07faa6715997b5',
    '0xd47a1bdc6872ad2fd16e50149baa9924c653e624',
    '0x9430801ebaf509ad49202aabc5f5bc6fd8a3daf8',
    '0x23920c97f74b2e41edd58d3be9964ed75883d2d8',
    '0x0784588e1950d554c674fbce204da8defab0457d',
    '0x397be73c6160e5e66408924da4ad32ea5e9ea9db',
  ],
} as const;

// ── State-impact composition (our node) ──
// How mainnet traffic divides by EIP-8037 state impact. Over-time + aggregate
// are from a 400-tx/day sample across 10 days, scaled to each day's real tx
// volume. `exact` holds one full day where EVERY transaction was classified
// (no sampling, no per-block diagnostic cap). Buckets: no new state (unaffected
// by 8037) · creates state (pays the surcharge, usually fixable) · AA state
// (through an ERC-4337 EntryPoint, signed limit → unrescuable-prone).
export type CompDay = { label: string; total: number; no: number; state: number; aa: number; na: number; ns: number; stateGas: number; pctState: number };
export type HistBucket = { bucket: string; label: string; txs: number };
export const COMPOSITION = {
  pctNo: 72.4,
  pctState: 26.7,
  pctAa: 0.9,
  // Seven consecutive days (Nov 17–23 2026), EVERY transaction on every block
  // classified by differential state-diff replay — no sampling, no per-block cap.
  // 13.08M transactions in all. `stateGas` is the extra gas EIP-8037 adds that day.
  sampledPerDay: 0,
  series: [
    { label: 'Nov 17', total: 2116818, no: 1617865, state: 480663, aa: 17805, na: 11482, ns: 995727, stateGas: 79408093040, pctState: 23.6 },
    { label: 'Nov 18', total: 1824338, no: 1291684, state: 514625, aa: 17351, na: 11459, ns: 1078257, stateGas: 85835182840, pctState: 29.2 },
    { label: 'Nov 19', total: 1801336, no: 1249094, state: 535160, aa: 16702, na: 12398, ns: 1049779, stateGas: 83765102480, pctState: 30.6 },
    { label: 'Nov 20', total: 1965716, no: 1380967, state: 566301, aa: 17913, na: 11135, ns: 1064811, stateGas: 84736084120, pctState: 29.7 },
    { label: 'Nov 21', total: 1849520, no: 1353490, state: 479321, aa: 15552, na: 10595, ns: 1300443, stateGas: 103010885560, pctState: 26.8 },
    { label: 'Nov 22', total: 1646421, no: 1210272, state: 420345, aa: 15524, na: 11419, ns: 1439709, stateGas: 113993178680, pctState: 26.5 },
    { label: 'Nov 23', total: 1882470, no: 1372131, state: 493002, aa: 16446, na: 11714, ns: 1230518, stateGas: 97739802960, pctState: 27.1 },
  ] as CompDay[],
  // whole-week aggregate across the 7 exact days
  week: { days: 7, txseen: 13082213, stateTx: 3489417, aaTx: 117293, newAccounts: 80202, newSlots: 8159244, stateGas: 648488329680, avgStateGasDay: 92641190, pctState: 26.7 },
  // one full day (Nov 23 2026) kept for the single-day headline card
  exact: { date: 'Nov 23, 2026', totalTx: 1881579, newAccounts: 11714, newSlots: 1230518, stateGasDay: 97739802960, pctState: 27.1 },
  // per-transaction extra-gas distribution, every state-creating tx across the week
  // bucketed by the EIP-8037 gas it adds (DELTA). ~3.6M state-touching txs in all.
  hist: [
    { bucket: '≤78k', label: '1 slot', txs: 2928998 },
    { bucket: '78–160k', label: '~1 account', txs: 325950 },
    { bucket: '160–320k', label: '2–4 slots', txs: 169590 },
    { bucket: '320–640k', label: '5–8 slots', txs: 84168 },
    { bucket: '640k–1.3M', label: 'heavy', txs: 66965 },
    { bucket: '>1.3M', label: 'deploys', txs: 31039 },
  ] as HistBucket[],
} as const;

// ── AA state-creation break (measured on our node) ──
// Our earlier headroom check only looked at STEADY-STATE validation. Tracing 40
// recent userOps per EntryPoint with prestateTracer shows the other half of the
// story: ~53% of userOps create new state (wallet deployments, first-touch
// SSTOREs), and ~1 in 3 create MORE state-gas than the entire ~80k validation
// headroom. Because callGasLimit / verificationGasLimit are signed into the
// userOp, that shortfall cannot be rescued by raising a limit — it is unrescuable
// (the EF repricing-impact dashboard ranks these EntryPoints the #1 affected
// entity). v0.8's 40-tx window happened to be all steady-state in our sample.
export type AaEp = { name: string; sampled: number; createState: number; exceedHeadroom: number; medDelta: number; maxDelta: number };
export const AA_STATEBREAK = {
  headroom: 80000,
  entrypoints: [
    { name: 'EntryPoint v0.7', sampled: 40, createState: 22, exceedHeadroom: 14, medDelta: 155840, maxDelta: 1015720 },
    { name: 'EntryPoint v0.6', sampled: 40, createState: 21, exceedHeadroom: 12, medDelta: 155840, maxDelta: 470280 },
    { name: 'EntryPoint v0.8', sampled: 40, createState: 0, exceedHeadroom: 0, medDelta: 0, maxDelta: 0 },
  ] as AaEp[],
} as const;

// ── AA validation headroom (steady-state userOps only — see AA_STATEBREAK) ──
// Real user-operations traced on the EIPsInsight archive node. `budget` is the
// signed verificationGasLimit; `used` is the gas validateUserOp actually spent.
// The repricing adds, at most, a few thousand gas to validation — far inside the
// gap between `used` and `budget`, so validation still completes.
export type Headroom = { label: string; tx: string; budget: number; used: number };
export const AA_HEADROOM: Headroom[] = [
  { label: 'EntryPoint v0.7', tx: '0x8a8a90b1…', budget: 94809, used: 14582 },
  { label: 'EntryPoint v0.6 · op 1', tx: '0xc57171cf…', budget: 120853, used: 15881 },
  { label: 'EntryPoint v0.6 · op 2', tx: '0xc57171cf…', budget: 113546, used: 10343 },
];

// ── The 8 invariants, plain + technical ──
// `count` = flagged contracts touching each (static scan). `confirmed` is a
// legacy flag, no longer read by any view.
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
    tech: 'Constants that reserve a fixed amount of gas for finalization or cleanup were sized against the old schedule. Repricing makes that tail cost more than the reserve, so it is exhausted. This is the mechanism people feared would break ERC-4337 validation, since the EntryPoint reserves gas against the signed verificationGasLimit — but our traces show that budget has ample headroom, so it holds (see Validation).',
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
    tech: 'A literal gas value forwarded to a CALL, such as call{gas: N}(…) or a fixed stipend, no longer covers the operation once state access is repriced upward, so it runs out of gas. The signed verificationGasLimit is exactly such a hard-coded budget, which is why ERC-4337 was the first suspect — but the traced headroom shows it holds (see Validation).',
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

// ── Static scan results (honest): the 115 flagged contracts are a heuristic
// source-pattern match, not confirmed breaks. See audit-20261117 on ba-data.
export const SCAN = {
  scanned: 300,
  flagged: 115,
  windowBlocks: 100000,
  // 44 of the 115 flag only INV-1/INV-3 (generic proxy delegatecall/return
  // patterns) — low-signal, likely noise.
  lowSignal: 44,
} as const;

export type Flagged = { name: string; addr: string; txs: number; invs: string[] };
// All 115 flagged contracts (static scan audit-20261117), names via Sourcify,
// sorted by match density. Flagged = source contains a reviewable pattern, not a break.
export const FLAGGED: Flagged[] = [
  { name: "Uniswap Universal Router (SwapRouter02)", addr: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", txs: 199030, invs: ["INV-1", "INV-2", "INV-5", "INV-6", "INV-7", "INV-8"] },
  { name: "Uniswap V4 PositionManager", addr: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e", txs: 57405, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-5", "INV-7", "INV-8"] },
  { name: "ERC-4337 smart account / module", addr: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", txs: 121478, invs: ["INV-1", "INV-3", "INV-4", "INV-5", "INV-6", "INV-7", "INV-8"] },
  { name: "ERC-4337 EntryPoint v0.7", addr: "0x0000000071727de22e5e9d8baf0edac6f37da032", txs: 538070, invs: ["INV-1", "INV-3", "INV-4", "INV-5", "INV-6", "INV-7"] },
  { name: "Symbiosis Metarouter", addr: "0x0fef9e88a7b76bcdbf451780c6774fe32965ee98", txs: 14820, invs: ["INV-1", "INV-3", "INV-4", "INV-7", "INV-8"] },
  { name: "Uniswap V3 Position Manager", addr: "0xc36442b4a4522e871399cd717abdd847ab11fe88", txs: 37632, invs: ["INV-1", "INV-2", "INV-6", "INV-7", "INV-8"] },
  { name: "ERC-4337 EntryPoint v0.6", addr: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", txs: 84213, invs: ["INV-1", "INV-3", "INV-4", "INV-5", "INV-6", "INV-7"] },
  { name: "ForwarderFactoryV4", addr: "0x37996e762fa8b671869740c79eb33f625b3bf92a", txs: 17029, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-6", "INV-7"] },
  { name: "Uniswap V3 SwapRouter", addr: "0xe592427a0aece92de3edee1f18e0157c05861564", txs: 67825, invs: ["INV-1", "INV-2", "INV-5", "INV-6", "INV-7", "INV-8"] },
  { name: "Uniswap V2 Router 02", addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", txs: 131013, invs: ["INV-1", "INV-6", "INV-7", "INV-8"] },
  { name: "UniversalRouter", addr: "0x23617e59a5925b2a4bf75d73ff6711cd0b29de85", txs: 138857, invs: ["INV-1", "INV-3", "INV-4", "INV-6", "INV-7", "INV-8"] },
  { name: "PangeaOFTV3", addr: "0x19993b3cf15c1055063468eb932f5e335a7526ea", txs: 13061, invs: ["INV-1", "INV-3", "INV-4", "INV-5", "INV-6", "INV-7"] },
  { name: "1inch Aggregation Router V6", addr: "0x111111125421ca6dc452d289314280a0f8842a65", txs: 82094, invs: ["INV-1", "INV-3", "INV-4"] },
  { name: "UniversalRouter", addr: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af", txs: 1001361, invs: ["INV-1", "INV-3", "INV-4", "INV-6", "INV-7", "INV-8"] },
  { name: "ERC-4337 EntryPoint v0.8", addr: "0x0000000aa232009084bd71a5797d089aa4edfad4", txs: 114971, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-6", "INV-8"] },
  { name: "Aave WrappedTokenGatewayV3", addr: "0xd01607c3c5ecaba394d8be377a08590149325722", txs: 12340, invs: ["INV-1", "INV-3", "INV-7", "INV-8"] },
  { name: "GlideDepositFactory", addr: "0x442be06bb5d13711a22ccd3fa382b72a874c5135", txs: 14066, invs: ["INV-1", "INV-3", "INV-4", "INV-8"] },
  { name: "TransparentUpgradeableProxy", addr: "0xda5e1988097297dcdc1f90d4dfe7909e847cbef6", txs: 17556, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-6", "INV-8"] },
  { name: "RelayDepository", addr: "0x4cd00e387622c35bddb9b4c962c136462338bc31", txs: 243524, invs: ["INV-1", "INV-3", "INV-4"] },
  { name: "Rollup", addr: "0xe37a2663cc9c119ba41572c40fab0bbb23a5402f", txs: 18495, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-5", "INV-6", "INV-8"] },
  { name: "DexRouter", addr: "0x8feab81d36e7576107d5de0758c1b839be31b4f6", txs: 95330, invs: ["INV-1", "INV-3", "INV-4", "INV-6"] },
  { name: "Seaport (OpenSea)", addr: "0x0000000000000068f116a894984e2db1123eb395", txs: 121488, invs: ["INV-3", "INV-4", "INV-5"] },
  { name: "Bot", addr: "0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6", txs: 129513, invs: ["INV-1", "INV-3", "INV-7"] },
  { name: "HighwayPaymaster", addr: "0xa63fd572a6396af29c14e304aba00978ca9582d8", txs: 13669, invs: ["INV-2", "INV-3", "INV-4"] },
  { name: "ERC1967Proxy", addr: "0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5", txs: 94085, invs: ["INV-1", "INV-3"] },
  { name: "RelayRouter", addr: "0x0729e2a4716d9f7dd17858d5d504426d228697f7", txs: 65017, invs: ["INV-1", "INV-3", "INV-4", "INV-6"] },
  { name: "AllowanceHolder", addr: "0x0000000000001ff3684f28c67538d4d072c22734", txs: 75262, invs: ["INV-3"] },
  { name: "Bot", addr: "0x51c72848c68a965f66fa7a88855f9f7784502a7f", txs: 361173, invs: ["INV-1", "INV-2", "INV-4", "INV-6"] },
  { name: "PrioUpdateRegistry", addr: "0xda7afeed021eafc1c1af9c362de477dad0396b81", txs: 122667, invs: ["INV-3"] },
  { name: "DVN", addr: "0x3b0531eb02ab4ad72e7a531180beef9493a00dd2", txs: 14162, invs: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-6"] },
  { name: "KyberSwap MetaAggregationRouterV2", addr: "0x6131b5fae19ea4f9d964eac0408e4408b66337b5", txs: 58494, invs: ["INV-1", "INV-5", "INV-6"] },
  { name: "ERC1967Proxy", addr: "0xee39678386f5bfc68df2c65656ec8e23f60063b5", txs: 109908, invs: ["INV-1", "INV-3"] },
  { name: "RelayApprovalProxy", addr: "0x5567954cd026cebfe486062cb75848e0f1c12e58", txs: 78070, invs: ["INV-1", "INV-3", "INV-6"] },
  { name: "ERC1967Proxy", addr: "0xb5f650e96ed10184e1be22390fddb0a0c0f024d0", txs: 50386, invs: ["INV-1", "INV-3"] },
  { name: "Router", addr: "0xeff6cb8b614999d130e537751ee99724d01aa167", txs: 166614, invs: ["INV-1", "INV-3", "INV-5", "INV-7"] },
  { name: "THORChain Router", addr: "0xd37bbe5744d730a1d98d8dc97c42f0ca46ad7146", txs: 93073, invs: ["INV-1", "INV-6", "INV-7"] },
  { name: "ERC1967Proxy", addr: "0x2744dfd9898f0babbc570cc594bbbc84b487a22b", txs: 124540, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0xbd0d173eeb87d57a09521c24388a12789f33ba96", txs: 49595, invs: ["INV-1", "INV-3"] },
  { name: "InitializableAdminUpgradeabilityProxy", addr: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", txs: 54722, invs: ["INV-1", "INV-3", "INV-7", "INV-8"] },
  { name: "Pyth Oracle", addr: "0x30a88bf894d1b806125a23ebf23d715496fd7102", txs: 67185, invs: ["INV-1", "INV-2", "INV-7", "INV-8"] },
  { name: "ERC1967Proxy", addr: "0xf4e147db314947fc1275a8cbb6cde48c510cd8cf", txs: 45779, invs: ["INV-1", "INV-3"] },
  { name: "CoW GPv2Settlement", addr: "0x9008d19f58aabd9ed0d60971565aa8510560ab41", txs: 85087, invs: ["INV-1", "INV-3", "INV-6", "INV-7"] },
  { name: "SAITAMA", addr: "0xce3f08e664693ca792cace4af1364d5e220827b2", txs: 13350, invs: ["INV-1", "INV-7", "INV-8"] },
  { name: "BananaMiner", addr: "0x68e534a0122223a119980f6c394683bcd0215e71", txs: 15333, invs: ["INV-1", "INV-3"] },
  { name: "MayanForwarder2", addr: "0x337685fdab40d39bd02028545a4ffa7d287cc3e2", txs: 13002, invs: ["INV-1", "INV-6"] },
  { name: "Multicall3", addr: "0xca11bde05977b3631167028862be2a173976ca11", txs: 121481, invs: ["INV-1", "INV-4", "INV-6"] },
  { name: "OptimizedTransparentUpgradeableProxy", addr: "0x173272739bd7aa6e4e214714048a9fe699453059", txs: 51038, invs: ["INV-1", "INV-3"] },
  { name: "ZamaERC20", addr: "0xa12cc123ba206d4031d1c7f6223d1c2ec249f4f3", txs: 12465, invs: ["INV-1", "INV-3"] },
  { name: "DVN", addr: "0x589dedbd617e0cbcb916a9223f4d1300c294236b", txs: 51540, invs: ["INV-1", "INV-4", "INV-6"] },
  { name: "DVN", addr: "0x380275805876ff19055ea900cdb2b46a94ecf20d", txs: 14974, invs: ["INV-1", "INV-4", "INV-6"] },
  { name: "UTB", addr: "0x1b6257cae4192e62b629efca21771be3d759183d", txs: 18275, invs: ["INV-1", "INV-2", "INV-6"] },
  { name: "ERC1967Proxy", addr: "0xce43851485f437005ef3c1821e250c4d3c53b946", txs: 107834, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0xec53bf9167f50cdeb3ae105f56099aaab9061f83", txs: 85579, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0x4313c378cc91ea583c91387b9216e2c03096b27f", txs: 68231, invs: ["INV-1", "INV-3"] },
  { name: "Zora1155Factory", addr: "0x6fa5b6d93e2539caea358518d3fe8f75418e5a1d", txs: 35558, invs: ["INV-1", "INV-3"] },
  { name: "BlueBundlesV1", addr: "0x38b0c12ab81976e9417d4ebfe2a34db6df22e6ad", txs: 18171, invs: ["INV-1", "INV-6"] },
  { name: "ERC1967Proxy", addr: "0xe343167631d89b6ffc58b88d6b7fb0228795491d", txs: 16023, invs: ["INV-1", "INV-3"] },
  { name: "ERC1967Proxy", addr: "0xa66b23d9a8a46c284fa5b3f2e2b59eb5cc3817f4", txs: 15435, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0x1c479675ad559dc151f6ec7ed3fbf8cee79582b6", txs: 14455, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0x0a14b696350546110a0d8acdb86226983af9d2a0", txs: 13266, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0x93a2db22b7c736b341c32ff666307f4a9ed910f5", txs: 13080, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0xdc26b08f0335b68721f64001c38b05d0bc9b539d", txs: 12915, invs: ["INV-1", "INV-3"] },
  { name: "Zora1155Factory", addr: "0x445f16314284b43dfa1fd3cd77b9dea4a1bebd97", txs: 11933, invs: ["INV-1", "INV-3"] },
  { name: "CoinTool_App", addr: "0x0de8bf93da2f7eecb3d9169422413a9bef4ef628", txs: 15266, invs: ["INV-1", "INV-3", "INV-7"] },
  { name: "FulfillHelper", addr: "0x3e07be15370d8b12d80a159a7ef14b9e51869497", txs: 17218, invs: ["INV-1", "INV-6"] },
  { name: "InitializableImmutableAdminUpgradeabilityProxy", addr: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", txs: 61541, invs: ["INV-1", "INV-3", "INV-8"] },
  { name: "Graveyard", addr: "0xda021a2c1c2f99574d861ef8c6fa745851beb7f6", txs: 18389, invs: ["INV-1", "INV-2", "INV-3"] },
  { name: "SwftSwap", addr: "0xc1d13492285eb664951e201bf7c80c7c6318a1b5", txs: 117627, invs: ["INV-1", "INV-6"] },
  { name: "SoulsPass", addr: "0x94a2eea20ff8cba3563e4436e295872ac74f4177", txs: 74233, invs: ["INV-1", "INV-2", "INV-3"] },
  { name: "AdminUpgradableProxy", addr: "0x81d40f21f12a8f0e3252bccb954d722d4c464b64", txs: 46480, invs: ["INV-1", "INV-3"] },
  { name: "FiatTokenProxy", addr: "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c", txs: 46044, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0x68749665ff8d2d112fa859aa293f07a622782f38", txs: 36855, invs: ["INV-1", "INV-3"] },
  { name: "EthcoinProxy", addr: "0xe957ea0b072910f508dd2009f4acb7238c308e29", txs: 36215, invs: ["INV-1", "INV-3"] },
  { name: "ERC1967Proxy", addr: "0x09c30cdcdd971423cb3ba757a47d56c35d06d818", txs: 35939, invs: ["INV-1", "INV-3"] },
  { name: "FiatTokenProxy", addr: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", txs: 17499, invs: ["INV-1", "INV-3"] },
  { name: "TransparentUpgradeableProxy", addr: "0xc4441c2be5d8fa8126822b9929ca0b81ea0de38e", txs: 17115, invs: ["INV-1", "INV-3"] },
  { name: "ERC1967Proxy", addr: "0xe2ad0bf751834f2fbdc62a41014f84d67ca1de2a", txs: 15561, invs: ["INV-1", "INV-3"] },
  { name: "SafeProxyFactory", addr: "0x14f2982d601c9458f93bd70b218933a6f8165e7b", txs: 14060, invs: ["INV-1", "INV-3"] },
  { name: "UUPSProxy", addr: "0x031de51f3e8016514bd0963d0b2ab825a591db9a", txs: 13091, invs: ["INV-1", "INV-3"] },
  { name: "ERC1967Proxy", addr: "0x2222222d7164433c4c09b0b0d809a9b52c04c205", txs: 12599, invs: ["INV-1", "INV-3"] },
  { name: "StablecoinProxy", addr: "0x8292bb45bf1ee4d140127049757c2e0ff06317ed", txs: 12214, invs: ["INV-1", "INV-3"] },
  { name: "AppProxyUpgradeable", addr: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", txs: 16057, invs: ["INV-1", "INV-4", "INV-8"] },
  { name: "Disperse", addr: "0xd152f549545093347a162dce210e7293f1452150", txs: 13829, invs: ["INV-7"] },
  { name: "LiFiDiamond", addr: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae", txs: 68516, invs: ["INV-1", "INV-2", "INV-3"] },
  { name: "Diamond", addr: "0xb300000b72deaeb607a12d5f54773d1c19c7028d", txs: 55393, invs: ["INV-1", "INV-2", "INV-3"] },
  { name: "RangoDiamond", addr: "0x69460570c93f9de5e2edbc3052bf10125f0ca22d", txs: 43351, invs: ["INV-1", "INV-2", "INV-3"] },
  { name: "Proxy", addr: "0x49048044d57e1c92a77f79988d21fa8faf74e97e", txs: 15160, invs: ["INV-1", "INV-3"] },
  { name: "MainnetBridge", addr: "0x7d0e63736aeb136acd44c70d6e1a0f27fb897679", txs: 59566, invs: ["INV-1", "INV-2", "INV-7"] },
  { name: "MetaBridge", addr: "0x0439e60f02a8900a951603950d8d4527f400c3f1", txs: 77973, invs: ["INV-1", "INV-2", "INV-6"] },
  { name: "SeaDrop", addr: "0x00005ea00ac477b1030ce78506496e8c2de24bf5", txs: 61631, invs: ["INV-2", "INV-3"] },
  { name: "Proxy", addr: "0x3b4d794a66304f130a4db8f2551b0070dfcf5ca7", txs: 48392, invs: ["INV-1", "INV-3", "INV-8"] },
  { name: "LayerZeroToken", addr: "0x6985884c4392d348587b19cb9eaaf157f13271cd", txs: 16631, invs: ["INV-1", "INV-6"] },
  { name: "MetaSwap", addr: "0x881d40237659c251811cec9c364ef91dc08d300c", txs: 98739, invs: ["INV-1", "INV-2", "INV-5"] },
  { name: "LinkToken", addr: "0x514910771af9ca656af840dff83e8264ecf986ca", txs: 119217, invs: ["INV-7"] },
  { name: "WBTC", addr: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", txs: 42547, invs: ["INV-7"] },
  { name: "WalletSimple", addr: "0x3a5cc8689d1b0cef2c317bc5c0ad6ce88b27d597", txs: 15616, invs: ["INV-7"] },
  { name: "VotingV2", addr: "0x004395edb43efca9885cedad51ec9faf93bd34ac", txs: 13467, invs: ["INV-1", "INV-2", "INV-7"] },
  { name: "OwnedProxy", addr: "0x278d858f05b94576c1e6f73285886876ff6ef8d2", txs: 303465, invs: ["INV-1", "INV-3"] },
  { name: "PendleRouterV4", addr: "0x888888888889758f76e7103c6cbf23abbf58f946", txs: 17678, invs: ["INV-1", "INV-3"] },
  { name: "PENDLE", addr: "0x808507121b80c02388fad14726482e061b8da827", txs: 14146, invs: ["INV-1"] },
  { name: "SwapProxy", addr: "0x02e5be68d46dac0b524905bff209cf47ee6db2a9", txs: 38375, invs: ["INV-3"] },
  { name: "TetherToken", addr: "0xdac17f958d2ee523a2206206994597c13d831ec7", txs: 8411146, invs: ["INV-7"] },
  { name: "WETH9", addr: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", txs: 144445, invs: ["INV-7"] },
  { name: "TokenMintERC20Token", addr: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", txs: 72933, invs: ["INV-7"] },
  { name: "ethZeroTokenSender", addr: "0x3ffb141ee3f9b003fc315331dd70eda7a2b80631", txs: 12164, invs: ["INV-7"] },
  { name: "CompressedOracleV1", addr: "0xe844701934d9c6085b292e428f41b911cc0b3872", txs: 75020, invs: ["INV-2"] },
  { name: "SushiToken", addr: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2", txs: 14572, invs: ["INV-1"] },
  { name: "FiatTokenProxy", addr: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", txs: 4313878, invs: ["INV-1"] },
  { name: "AdminUpgradeabilityProxy", addr: "0x6c3ea9036406852006290770bedfcaba0e23a0e8", txs: 113370, invs: ["INV-1"] },
  { name: "Poisoner", addr: "0x00fe78205f5f0e63b8ad2b2ae5337f538a610e04", txs: 68370, invs: ["INV-1"] },
  { name: "ReceiveUln302", addr: "0xc02ab410f0734efa3f14628780e6e695156024c2", txs: 51255, invs: ["INV-2"] },
  { name: "AdminUpgradeabilityProxy", addr: "0x45804880de22913dafe09f4980848ece6ecbaf78", txs: 36754, invs: ["INV-1"] },
  { name: "ENA", addr: "0x57e114b691db790c35207b2e685d4a43181e6061", txs: 47328, invs: ["INV-2"] },
  { name: "BeamToken", addr: "0x62d0a8458ed7719fdaf978fe5929c6d342b0bfce", txs: 13129, invs: ["INV-2"] },
  { name: "USDe", addr: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3", txs: 11592, invs: ["INV-2"] },
];

export type Scanned = { n: string; a: string; t: number; f: boolean };
// The 300 busiest mainnet contracts scanned (top-300 by contract-call count
// over the 100,000-block scan window). f = flagged by the invariant scan.
// Names via Sourcify; blank = unverified source. Addresses link to Etherscan.
export const SCANNED: Scanned[] = [
  { n: "TetherToken", a: "0xdac17f958d2ee523a2206206994597c13d831ec7", t: 8411271, f: true },
  { n: "FiatTokenProxy", a: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", t: 4313955, f: true },
  { n: "UniversalRouter", a: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af", t: 1001398, f: true },
  { n: "", a: "0x1a36abe92e391dd8d8b687af5e4560c3eb0723c6", t: 770721, f: false },
  { n: "ERC-4337 EntryPoint v0.7", a: "0x0000000071727de22e5e9d8baf0edac6f37da032", t: 538080, f: true },
  { n: "Bot", a: "0x51c72848c68a965f66fa7a88855f9f7784502a7f", t: 360412, f: true },
  { n: "OwnedProxy", a: "0x278d858f05b94576c1e6f73285886876ff6ef8d2", t: 303465, f: true },
  { n: "", a: "0xfeeeeee44046c3f61a8cc081e0918ef0de0a7ffc", t: 256826, f: false },
  { n: "RelayDepository", a: "0x4cd00e387622c35bddb9b4c962c136462338bc31", t: 243530, f: true },
  { n: "Uniswap Universal Router (SwapRouter02)", a: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", t: 199029, f: true },
  { n: "Router", a: "0xeff6cb8b614999d130e537751ee99724d01aa167", t: 166614, f: true },
  { n: "", a: "0x93c30e6e09f698cfea99b09b5166ed90cfaedd17", t: 153028, f: false },
  { n: "WETH9", a: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", t: 144404, f: true },
  { n: "UniversalRouter", a: "0x23617e59a5925b2a4bf75d73ff6711cd0b29de85", t: 138859, f: true },
  { n: "PepeToken", a: "0x6982508145454ce325ddbe47a25d4ec3d2311933", t: 131403, f: false },
  { n: "Uniswap V2 Router 02", a: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", t: 131018, f: true },
  { n: "Bot", a: "0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6", t: 128285, f: true },
  { n: "ERC1967Proxy", a: "0x2744dfd9898f0babbc570cc594bbbc84b487a22b", t: 124539, f: true },
  { n: "PrioUpdateRegistry", a: "0xda7afeed021eafc1c1af9c362de477dad0396b81", t: 122669, f: true },
  { n: "Seaport (OpenSea)", a: "0x0000000000000068f116a894984e2db1123eb395", t: 121486, f: true },
  { n: "Multicall3", a: "0xca11bde05977b3631167028862be2a173976ca11", t: 121483, f: true },
  { n: "ERC-4337 smart account / module", a: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", t: 121478, f: true },
  { n: "LinkToken", a: "0x514910771af9ca656af840dff83e8264ecf986ca", t: 119195, f: true },
  { n: "SwftSwap", a: "0xc1d13492285eb664951e201bf7c80c7c6318a1b5", t: 117299, f: true },
  { n: "ERC-4337 EntryPoint v0.8", a: "0x0000000aa232009084bd71a5797d089aa4edfad4", t: 114975, f: true },
  { n: "AdminUpgradeabilityProxy", a: "0x6c3ea9036406852006290770bedfcaba0e23a0e8", t: 113374, f: true },
  { n: "ERC1967Proxy", a: "0xee39678386f5bfc68df2c65656ec8e23f60063b5", t: 109908, f: true },
  { n: "ERC1967Proxy", a: "0xce43851485f437005ef3c1821e250c4d3c53b946", t: 107816, f: true },
  { n: "MetaSwap", a: "0x881d40237659c251811cec9c364ef91dc08d300c", t: 98741, f: true },
  { n: "", a: "0x6ddab021daedcfba8c4e12911b906a69da0e6795", t: 97148, f: false },
  { n: "DexRouter", a: "0x8feab81d36e7576107d5de0758c1b839be31b4f6", t: 95332, f: true },
  { n: "ERC1967Proxy", a: "0x5c7bcd6e7de5423a257d81b442095a1a6ced35c5", t: 94075, f: true },
  { n: "THORChain Router", a: "0xd37bbe5744d730a1d98d8dc97c42f0ca46ad7146", t: 93073, f: true },
  { n: "TransparentUpgradeableProxy", a: "0xec53bf9167f50cdeb3ae105f56099aaab9061f83", t: 85579, f: true },
  { n: "CoW GPv2Settlement", a: "0x9008d19f58aabd9ed0d60971565aa8510560ab41", t: 85086, f: true },
  { n: "ERC-4337 EntryPoint v0.6", a: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", t: 84211, f: true },
  { n: "1inch Aggregation Router V6", a: "0x111111125421ca6dc452d289314280a0f8842a65", t: 82096, f: true },
  { n: "Uni", a: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", t: 81666, f: false },
  { n: "N", a: "0xe73d53e3a982ab2750a0b76f9012e18b256cc243", t: 78491, f: false },
  { n: "RelayApprovalProxy", a: "0x5567954cd026cebfe486062cb75848e0f1c12e58", t: 78072, f: true },
  { n: "MetaBridge", a: "0x0439e60f02a8900a951603950d8d4527f400c3f1", t: 77977, f: true },
  { n: "AllowanceHolder", a: "0x0000000000001ff3684f28c67538d4d072c22734", t: 75262, f: true },
  { n: "CompressedOracleV1", a: "0xe844701934d9c6085b292e428f41b911cc0b3872", t: 75024, f: true },
  { n: "SoulsPass", a: "0x94a2eea20ff8cba3563e4436e295872ac74f4177", t: 74183, f: true },
  { n: "TokenMintERC20Token", a: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", t: 72933, f: true },
  { n: "LiFiDiamond", a: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae", t: 68512, f: true },
  { n: "", a: "0x129b898cc5af54c9a7ebf91f083bce6ff42e5d3b", t: 68461, f: false },
  { n: "Poisoner", a: "0x00fe78205f5f0e63b8ad2b2ae5337f538a610e04", t: 68372, f: true },
  { n: "TransparentUpgradeableProxy", a: "0x4313c378cc91ea583c91387b9216e2c03096b27f", t: 68233, f: true },
  { n: "Uniswap V3 SwapRouter", a: "0xe592427a0aece92de3edee1f18e0157c05861564", t: 67827, f: true },
  { n: "HotWallet", a: "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43", t: 67441, f: false },
  { n: "Pyth Oracle", a: "0x30a88bf894d1b806125a23ebf23d715496fd7102", t: 67189, f: true },
  { n: "RelayRouter", a: "0x0729e2a4716d9f7dd17858d5d504426d228697f7", t: 65011, f: true },
  { n: "", a: "0x34d6bb3280d2f4ef25ff14801e0838dba76ae664", t: 64176, f: false },
  { n: "", a: "0x4de23f3f0fb3318287378adbde030cf61714b2f3", t: 62705, f: false },
  { n: "SeaDrop", a: "0x00005ea00ac477b1030ce78506496e8c2de24bf5", t: 61631, f: true },
  { n: "InitializableImmutableAdminUpgradeabilityProxy", a: "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2", t: 61542, f: true },
  { n: "", a: "0x4b0b50c68d455cbf15917efd4c14d5f700661387", t: 61478, f: false },
  { n: "MainnetBridge", a: "0x7d0e63736aeb136acd44c70d6e1a0f27fb897679", t: 59566, f: true },
  { n: "", a: "0x77eb52e44db06777bce478159f25c0d55a295314", t: 58731, f: false },
  { n: "KyberSwap MetaAggregationRouterV2", a: "0x6131b5fae19ea4f9d964eac0408e4408b66337b5", t: 58492, f: true },
  { n: "Ondo", a: "0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3", t: 57675, f: false },
  { n: "Dai", a: "0x6b175474e89094c44da98b954eedeac495271d0f", t: 57539, f: false },
  { n: "Uniswap V4 PositionManager", a: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e", t: 57405, f: true },
  { n: "Diamond", a: "0xb300000b72deaeb607a12d5f54773d1c19c7028d", t: 55394, f: true },
  { n: "InitializableAdminUpgradeabilityProxy", a: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", t: 54722, f: true },
  { n: "DVN", a: "0x589dedbd617e0cbcb916a9223f4d1300c294236b", t: 51540, f: true },
  { n: "ReceiveUln302", a: "0xc02ab410f0734efa3f14628780e6e695156024c2", t: 51255, f: true },
  { n: "OptimizedTransparentUpgradeableProxy", a: "0x173272739bd7aa6e4e214714048a9fe699453059", t: 51040, f: true },
  { n: "ERC1967Proxy", a: "0xb5f650e96ed10184e1be22390fddb0a0c0f024d0", t: 50388, f: true },
  { n: "TransparentUpgradeableProxy", a: "0xbd0d173eeb87d57a09521c24388a12789f33ba96", t: 49594, f: true },
  { n: "", a: "0x9ccc2f3ecde026230e11a5c8799ac7524f2bb294", t: 48978, f: false },
  { n: "Proxy", a: "0x3b4d794a66304f130a4db8f2551b0070dfcf5ca7", t: 48394, f: true },
  { n: "ENA", a: "0x57e114b691db790c35207b2e685d4a43181e6061", t: 47330, f: true },
  { n: "", a: "0x7ec8a30a34b86927dc77b302603d1d53e640bef7", t: 46647, f: false },
  { n: "AdminUpgradableProxy", a: "0x81d40f21f12a8f0e3252bccb954d722d4c464b64", t: 46482, f: true },
  { n: "FiatTokenProxy", a: "0x1abaea1f7c830bd89acc67ec4af516284b1bc33c", t: 46048, f: true },
  { n: "ERC1967Proxy", a: "0xf4e147db314947fc1275a8cbb6cde48c510cd8cf", t: 45779, f: true },
  { n: "StandardToken", a: "0x4a220e6096b25eadb88358cb44068a3248254675", t: 43596, f: false },
  { n: "", a: "0x8d8210a0252a706cb5de0c6f8e46b6d3692afc19", t: 43419, f: false },
  { n: "RangoDiamond", a: "0x69460570c93f9de5e2edbc3052bf10125f0ca22d", t: 43355, f: true },
  { n: "WBTC", a: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", t: 42547, f: true },
  { n: "", a: "0x0c8c5891a41078cef36970932d5c05dc1de7288b", t: 40335, f: false },
  { n: "", a: "0x3e8282bd1bfabd23249701e978e9db3df3d7073a", t: 39258, f: false },
  { n: "SwapProxy", a: "0x02e5be68d46dac0b524905bff209cf47ee6db2a9", t: 38375, f: true },
  { n: "", a: "0x09fc9b7545020f6a51d113e495e0a451597969d3", t: 38288, f: false },
  { n: "Uniswap V3 Position Manager", a: "0xc36442b4a4522e871399cd717abdd847ab11fe88", t: 37632, f: true },
  { n: "", a: "0xfd03abcadaf3f930fa4e37eb2f6ea3a44a41b7f0", t: 37047, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x68749665ff8d2d112fa859aa293f07a622782f38", t: 36853, f: true },
  { n: "AdminUpgradeabilityProxy", a: "0x45804880de22913dafe09f4980848ece6ecbaf78", t: 36754, f: true },
  { n: "", a: "0xbee162fa5ae892be74f3f3e01c23da89adbccccc", t: 36339, f: false },
  { n: "EthcoinProxy", a: "0xe957ea0b072910f508dd2009f4acb7238c308e29", t: 36217, f: true },
  { n: "ERC1967Proxy", a: "0x09c30cdcdd971423cb3ba757a47d56c35d06d818", t: 35934, f: true },
  { n: "Zora1155Factory", a: "0x6fa5b6d93e2539caea358518d3fe8f75418e5a1d", t: 35558, f: true },
  { n: "MockB", a: "0xb442b0b79ee370547205be9ce0f61d8438c2673a", t: 34923, f: false },
  { n: "ERC1967Proxy", a: "0xd1d2eb1b1e90b638588728b4130137d262c87cae", t: 33026, f: false },
  { n: "DVN", a: "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5", t: 32341, f: false },
  { n: "", a: "0x4e0bb5481789980cc236e3c4b1d80f5589a9e0b1", t: 32081, f: false },
  { n: "Permit2", a: "0x000000000022d473030f116ddee9f6b43ac78ba3", t: 31959, f: false },
  { n: "MetricOmmSimpleRouter", a: "0x02201e6f13c41506c7bb635d7543f98826229ab7", t: 31885, f: false },
  { n: "AugustusV6", a: "0x6a000f20005980200259b80c5102003040001068", t: 31875, f: false },
  { n: "", a: "0x0109aa912b58508886a2a707204b0f8c8b164ccc", t: 31680, f: false },
  { n: "Vault", a: "0xf5e10380213880111522dd0efd3dbb45b9f62bcc", t: 29898, f: false },
  { n: "SpokePoolPeriphery", a: "0x97ccdbea4632140639ad5ea9b944aa034eb15fd4", t: 29706, f: false },
  { n: "puppies", a: "0xcf91b70017eabde82c9671e30e5502d312ea6eb2", t: 29392, f: false },
  { n: "", a: "0xb222da0f9c22ad2addcb0b0d6b150f398e44157a", t: 28961, f: false },
  { n: "", a: "0x7850bfe5b2295be4842b24c821385284c85f787f", t: 28698, f: false },
  { n: "FetchToken", a: "0xaea46a60368a7bd060eec7df8cba43b7ef41ad85", t: 28277, f: false },
  { n: "ERC1967Proxy", a: "0xfaf17849fb05a11a4e233f221bac99ca43fc83f8", t: 27984, f: false },
  { n: "TransparentUpgradeableProxy", a: "0xbee3211ab312a8d065c4fef0247448e17a8da000", t: 27943, f: false },
  { n: "OffRamp", a: "0x26d3681dfc9e4c8c79cfbf461adec8a21d5d73c5", t: 27914, f: false },
  { n: "", a: "0xb261ef0a97bc7cf3af2025ab6b3792e6062d3d4a", t: 27665, f: false },
  { n: "DVN", a: "0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd", t: 27649, f: false },
  { n: "", a: "0xfeeeeeeaea9b3ce71ce8a252aaa11d2dc439cc69", t: 27418, f: false },
  { n: "", a: "0xdfa8ead9129d2053f307e9370570a33118619ea0", t: 26545, f: false },
  { n: "", a: "0x2192bc3b4028acc1113f2cd9ac2cba70c36520db", t: 26534, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x2e5110cf18678ec99818bfaa849b8c881744b776", t: 26454, f: false },
  { n: "NonfungiblePositionManager", a: "0x4857db576ee0e45f10525ec59527bfd10beec60b", t: 26316, f: false },
  { n: "NullmaskProxy", a: "0xd64ef1417eb047ed0b54736a5a41f01178c391c6", t: 25919, f: false },
  { n: "ERC1967Proxy", a: "0xab830fcccb4f20bad23b7669d58cb35a96d57d5a", t: 25290, f: false },
  { n: "KeystoneForwarder", a: "0x0b93082d9b3c7c97facd250082899bacf3af3885", t: 25133, f: false },
  { n: "Tangem7702GaslessEntryPoint", a: "0xf67e35af6a18a01702e6c2f1e18a63c2fc3a528c", t: 24938, f: false },
  { n: "MAYAChain_Router", a: "0xe3985e6b61b814f7cdb188766562ba71b446b46d", t: 24080, f: false },
  { n: "", a: "0x1ef615c7d6b02fd05acff1572951f5cd0e342d93", t: 23565, f: false },
  { n: "PolygonEcosystemToken", a: "0x455e53cbb86018ac2b8092fdcd39d8444affc3f6", t: 23562, f: false },
  { n: "Lighter", a: "0x232ce3bd40fcd6f80f3d55a522d03f25df784ee2", t: 23414, f: false },
  { n: "ERC1967Proxy", a: "0xac49c7ee67b6afe5f9693089e4b8f171d0432605", t: 23049, f: false },
  { n: "OceanToken", a: "0x967da4048cd07ab37855c090aaf366e4ce1b9f48", t: 22463, f: false },
  { n: "", a: "0x3db107e2b67aa7c86403c3f4db4a49cb98aaddc4", t: 22139, f: false },
  { n: "BARD", a: "0xf0db65d17e30a966c2ae6a21f6bba71cea6e9754", t: 22115, f: false },
  { n: "TransitSwapRouterV5", a: "0x07964f135f276412b3182a3b2407b8dd45000000", t: 21787, f: false },
  { n: "Executor", a: "0xec6fc9be2d5e505b40a2df8b0622cd25333823db", t: 21640, f: false },
  { n: "Proxy", a: "0x32ec4cafa6949c4a177542223a0f1c9a17a5a8ca", t: 21368, f: false },
  { n: "Factory", a: "0x7c5a71c9fefbc7691f9d4ac7baf70c743792f716", t: 20790, f: false },
  { n: "Zora1155Factory", a: "0xebf6c883a1d60ab38c8ed4780aadbfe4c805ed4f", t: 20596, f: false },
  { n: "", a: "0x42dc0f9914585705d58fada7e053cdb3e0d4e70a", t: 20550, f: false },
  { n: "DEAPCoin", a: "0x1a3496c18d558bd9c6c8f609e1b129f67ab08163", t: 20535, f: false },
  { n: "Astgik", a: "0x4d224452801aced8b2f0aebe155379bb5d594381", t: 20483, f: false },
  { n: "PoolManager", a: "0x000000000004444c5dc75cb358380d2e3de08a90", t: 20270, f: false },
  { n: "TransparentUpgradeableProxy", a: "0xd72a6ba4a87ddb33e801b3f1c7750b2d0911fc6c", t: 20075, f: false },
  { n: "Sand", a: "0x3845badade8e6dff049820680d1f14bd3903a5d0", t: 20026, f: false },
  { n: "Permit2Proxy", a: "0x8eed5e28216c0bc6f817df40ae6ca11c2294cc1c", t: 19940, f: false },
  { n: "MANAToken", a: "0x0f5d2fb29fb7d3cfee444a200298f468908cc942", t: 19847, f: false },
  { n: "AdminUpgradableProxy", a: "0x28b5a0e9c621a5badaa536219b3a228c8168cf5d", t: 19819, f: false },
  { n: "MiniMeToken", a: "0x5a98fcbea516cf06857215779fd812ca3bef1b32", t: 19720, f: false },
  { n: "DSLOProtocol", a: "0xcab2fa2eeab7065b45cbcf6e3936dde2506b4f6c", t: 19696, f: false },
  { n: "", a: "0xbc1d9760bd6ca468ca9fb5ff2cfbeac35d86c973", t: 19226, f: false },
  { n: "WLD", a: "0x163f8c2467924be0ae7b5347228cabf260318753", t: 18939, f: false },
  { n: "", a: "0xd862cdcfeb856c32b3c4f7563f4811d8ddfd42e2", t: 18764, f: false },
  { n: "TransparentUpgradeableProxy", a: "0xc005dc82818d67af737725bd4bf75435d065d239", t: 18555, f: false },
  { n: "Rollup", a: "0xe37a2663cc9c119ba41572c40fab0bbb23a5402f", t: 18495, f: true },
  { n: "Graveyard", a: "0xda021a2c1c2f99574d861ef8c6fa745851beb7f6", t: 18389, f: true },
  { n: "UTB", a: "0x1b6257cae4192e62b629efca21771be3d759183d", t: 18275, f: true },
  { n: "", a: "0xba412d8b36bfd7d65dff5cc0df7b3c29a7eae687", t: 18179, f: false },
  { n: "BlueBundlesV1", a: "0x38b0c12ab81976e9417d4ebfe2a34db6df22e6ad", t: 18173, f: true },
  { n: "HoloToken", a: "0x6c6ee5e31d828de241282b9606c8e98ea48526e2", t: 17990, f: false },
  { n: "PendleRouterV4", a: "0x888888888889758f76e7103c6cbf23abbf58f946", t: 17678, f: true },
  { n: "TransparentUpgradeableProxy", a: "0xda5e1988097297dcdc1f90d4dfe7909e847cbef6", t: 17556, f: true },
  { n: "FiatTokenProxy", a: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", t: 17499, f: true },
  { n: "FulfillHelper", a: "0x3e07be15370d8b12d80a159a7ef14b9e51869497", t: 17218, f: true },
  { n: "TransparentUpgradeableProxy", a: "0xc4441c2be5d8fa8126822b9929ca0b81ea0de38e", t: 17115, f: true },
  { n: "TetherUSD", a: "0x0554811363ed90a09b6db5b0ffbed6c9bb47fe2b", t: 17109, f: false },
  { n: "ForwarderFactoryV4", a: "0x37996e762fa8b671869740c79eb33f625b3bf92a", t: 17029, f: true },
  { n: "Vyper_contract", a: "0xd533a949740bb3306d119cc777fa900ba034cd52", t: 16931, f: false },
  { n: "", a: "0x225a38bc71102999dd13478bfabd7c4d53f2dc17", t: 16847, f: false },
  { n: "LayerZeroToken", a: "0x6985884c4392d348587b19cb9eaaf157f13271cd", t: 16631, f: true },
  { n: "", a: "0xbf7fe109f674ab1341d69e67a262e50ce87eb7c1", t: 16257, f: false },
  { n: "Carrier", a: "0x1f2f10d1c40777ae1da742455c65828ff36df387", t: 16193, f: false },
  { n: "AevoToken", a: "0xb528edbef013aff855ac3c50b381f253af13b997", t: 16166, f: false },
  { n: "", a: "0x0c258a011da68c2be7d48316a9ba06a28a2af6c3", t: 16070, f: false },
  { n: "AppProxyUpgradeable", a: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", t: 16055, f: true },
  { n: "ERC1967Proxy", a: "0xe343167631d89b6ffc58b88d6b7fb0228795491d", t: 16023, f: true },
  { n: "", a: "0x342bf88482af5e58c8e2868cd8366d4e571c0a21", t: 15665, f: false },
  { n: "WalletSimple", a: "0x3a5cc8689d1b0cef2c317bc5c0ad6ce88b27d597", t: 15608, f: true },
  { n: "ERC1967Proxy", a: "0xe2ad0bf751834f2fbdc62a41014f84d67ca1de2a", t: 15561, f: true },
  { n: "Token", a: "0x14d6c649292c5c9790c5196d1a9ea039307947a1", t: 15487, f: false },
  { n: "ERC1967Proxy", a: "0xa66b23d9a8a46c284fa5b3f2e2b59eb5cc3817f4", t: 15435, f: true },
  { n: "BananaMiner", a: "0x68e534a0122223a119980f6c394683bcd0215e71", t: 15333, f: true },
  { n: "CoinTool_App", a: "0x0de8bf93da2f7eecb3d9169422413a9bef4ef628", t: 15266, f: true },
  { n: "", a: "0x8f5835e9d756c9bd934bce527157a4b0ef3c5cb7", t: 15257, f: false },
  { n: "", a: "0xde0a10181d590ad8f93a8ef17343d61b9fffa3e5", t: 15224, f: false },
  { n: "", a: "0xf9236897a6fe2717f1e5211a3c2a15901181f4d8", t: 15136, f: false },
  { n: "Proxy", a: "0x49048044d57e1c92a77f79988d21fa8faf74e97e", t: 15118, f: true },
  { n: "DVN", a: "0x380275805876ff19055ea900cdb2b46a94ecf20d", t: 14974, f: true },
  { n: "GraphToken", a: "0xc944e90c64b2c07662a292be6244bdf05cda44a7", t: 14866, f: false },
  { n: "Symbiosis Metarouter", a: "0x0fef9e88a7b76bcdbf451780c6774fe32965ee98", t: 14820, f: true },
  { n: "", a: "0x8ec663a80ebc925b3f14101c42b9a35996f9843c", t: 14724, f: false },
  { n: "SushiToken", a: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2", t: 14572, f: true },
  { n: "TransparentUpgradeableProxy", a: "0x1c479675ad559dc151f6ec7ed3fbf8cee79582b6", t: 14455, f: true },
  { n: "EtherFiGovernanceToken", a: "0xfe0c30065b384f05761f15d0cc899d4f9f9cc0eb", t: 14318, f: false },
  { n: "DVN", a: "0x3b0531eb02ab4ad72e7a531180beef9493a00dd2", t: 14162, f: true },
  { n: "PENDLE", a: "0x808507121b80c02388fad14726482e061b8da827", t: 14146, f: true },
  { n: "GlideDepositFactory", a: "0x442be06bb5d13711a22ccd3fa382b72a874c5135", t: 14066, f: true },
  { n: "SafeProxyFactory", a: "0x14f2982d601c9458f93bd70b218933a6f8165e7b", t: 14062, f: true },
  { n: "Token", a: "0x1223334444a7466fbf985b14e1f4edaf3883bca6", t: 13900, f: false },
  { n: "Disperse", a: "0xd152f549545093347a162dce210e7293f1452150", t: 13829, f: true },
  { n: "", a: "0x4ecef7bd1ed0c9f64a3a5c1a785a3bb39dc5df6a", t: 13793, f: false },
  { n: "TetherUSD", a: "0x51af3140e08bd16d75e23212c9ac1895b4a0c1cd", t: 13742, f: false },
  { n: "", a: "0x950fd558f47e234a2fde23b7d61f7ccdbcb4a86f", t: 13665, f: false },
  { n: "", a: "0x78ace9b2ee9a31737fad748015266a59f32dc79a", t: 13655, f: false },
  { n: "Open", a: "0xa227cc36938f0c9e09ce0e64dfab226cad739447", t: 13640, f: false },
  { n: "", a: "0xbdd50e6f8b34593b1fa8d5e59e9e01b9de531fc6", t: 13563, f: false },
  { n: "Swap", a: "0x8cc5c24a1666d3214340050315b82b2b6b0d9027", t: 13532, f: false },
  { n: "VotingV2", a: "0x004395edb43efca9885cedad51ec9faf93bd34ac", t: 13467, f: true },
  { n: "SAITAMA", a: "0xce3f08e664693ca792cace4af1364d5e220827b2", t: 13350, f: true },
  { n: "TransparentUpgradeableProxy", a: "0x0a14b696350546110a0d8acdb86226983af9d2a0", t: 13266, f: true },
  { n: "", a: "0xeab4e987660c8422906a60b18c49c93cdb92fb11", t: 13134, f: false },
  { n: "BeamToken", a: "0x62d0a8458ed7719fdaf978fe5929c6d342b0bfce", t: 13129, f: true },
  { n: "UUPSProxy", a: "0x031de51f3e8016514bd0963d0b2ab825a591db9a", t: 13091, f: true },
  { n: "IMXToken", a: "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff", t: 13091, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x93a2db22b7c736b341c32ff666307f4a9ed910f5", t: 13080, f: true },
  { n: "PangeaOFTV3", a: "0x19993b3cf15c1055063468eb932f5e335a7526ea", t: 13061, f: true },
  { n: "MayanForwarder2", a: "0x337685fdab40d39bd02028545a4ffa7d287cc3e2", t: 12997, f: true },
  { n: "TransparentUpgradeableProxy", a: "0xdc26b08f0335b68721f64001c38b05d0bc9b539d", t: 12917, f: true },
  { n: "", a: "0x08ec0883dec73e786ccf01461e4e543e23a731a7", t: 12762, f: false },
  { n: "StarkNetToken", a: "0xca14007eff0db1f8135f4c25b34de49ab0d42766", t: 12658, f: false },
  { n: "ERC1967Proxy", a: "0x2222222d7164433c4c09b0b0d809a9b52c04c205", t: 12599, f: true },
  { n: "", a: "0x88cc0800464fcef3e643a369e8a0532990995eee", t: 12484, f: false },
  { n: "", a: "0x4a00d2e63732932d00f3005c006141fe85000000", t: 12482, f: false },
  { n: "ZamaERC20", a: "0xa12cc123ba206d4031d1c7f6223d1c2ec249f4f3", t: 12465, f: true },
  { n: "Aave WrappedTokenGatewayV3", a: "0xd01607c3c5ecaba394d8be377a08590149325722", t: 12340, f: true },
  { n: "StablecoinProxy", a: "0x8292bb45bf1ee4d140127049757c2e0ff06317ed", t: 12214, f: true },
  { n: "ethZeroTokenSender", a: "0x3ffb141ee3f9b003fc315331dd70eda7a2b80631", t: 12166, f: true },
  { n: "", a: "0xff00000000000000000000000000000000042220", t: 12098, f: false },
  { n: "Chain", a: "0xa2cd3d43c775978a96bdbf12d733d5a1ed94fb18", t: 11960, f: false },
  { n: "Zora1155Factory", a: "0x445f16314284b43dfa1fd3cd77b9dea4a1bebd97", t: 11931, f: true },
  { n: "", a: "0xe6f87b8eae04944d5209d0ba290e7067050b728b", t: 11910, f: false },
  { n: "TKGasStation", a: "0x5af5194b4b0909eb978e3cf1e25333852277f07d", t: 11822, f: false },
  { n: "", a: "0xb561a6867c5d31634237230e28468315340617c7", t: 11601, f: false },
  { n: "USDe", a: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3", t: 11596, f: true },
  { n: "", a: "0xcf7246795557be6f4dd5d8a1aed964529325980e", t: 11586, f: false },
  { n: "CyberToken", a: "0x14778860e937f509e651192a90589de711fb88a9", t: 11517, f: false },
  { n: "Token", a: "0x40aaf75454036bed56f3266ccf18f6b7befd6aca", t: 11495, f: false },
  { n: "", a: "0x845688e603f853e4703f0ff5397fce174ba0d7a8", t: 11329, f: false },
  { n: "", a: "0xe212c04fed5e637014940cbea00c44a1fc2f6299", t: 11314, f: false },
  { n: "TransparentUpgradeableProxy", a: "0xaca92e438df0b2401ff60da7e4337b687a2435da", t: 11176, f: false },
  { n: "OneInch", a: "0x111111111117dc0aa78b770fa6a738034120c302", t: 11132, f: false },
  { n: "", a: "0xe60fae7817aeee84f378cde1ea2587795694347e", t: 11037, f: false },
  { n: "NFT", a: "0xf8b37af2b5fe2ce1cc303a8472dedccca0953bb2", t: 11032, f: false },
  { n: "TetherUSD", a: "0xf4edcfdfcb11eb5245953764b051bf2e5ee6291c", t: 11006, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x663dc15d3c1ac63ff12e45ab68fea3f0a883c251", t: 10897, f: false },
  { n: "BAToken", a: "0x0d8775f648430679a709e98d2b0cb6250d2887ef", t: 10771, f: false },
  { n: "Token", a: "0x95669a6589a81a6704bab1020722d0c405841885", t: 10769, f: false },
  { n: "", a: "0x00000000e91fc5bad977c0cc4ad60557c06886a2", t: 10738, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x33b41fe18d3a39046ad672f8a0c8c415454f629c", t: 10723, f: false },
  { n: "RSR", a: "0x320623b8e4ff03373931769a31fc52a4e78b5d70", t: 10698, f: false },
  { n: "", a: "0xd1c6aca7ea7ed44e1873dafa054c28ceb690c7eb", t: 10612, f: false },
  { n: "", a: "0x80e73eb970926d715509622c8fda1f960d2f5987", t: 10517, f: false },
  { n: "SafeProxy", a: "0x4d2fb5f8ec243fde4df1a9678b82238570c7e0e4", t: 10516, f: false },
  { n: "", a: "0x447a03c131c0a97a8b8d548e3cd81aec4ce05d73", t: 10474, f: false },
  { n: "", a: "0x836b336fca26913176efc45a5a6e5e72cd7bd13b", t: 10431, f: false },
  { n: "UniversalRouter", a: "0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca", t: 10221, f: false },
  { n: "UUPSProxy", a: "0x526526528f35ac738177003b8773b402b8df8143", t: 10219, f: false },
  { n: "", a: "0xebbabfc2019a312e3615196e9ac517c6bee2a5f6", t: 10178, f: false },
  { n: "TransparentUpgradeableProxy", a: "0xb1d1eae60eea9525032a6dcb4c1ce336a1de71be", t: 10082, f: false },
  { n: "FiatTokenProxy", a: "0xbe9895146f7af43049ca1c1ae358b0541ea49704", t: 10063, f: false },
  { n: "", a: "0x2d60390d1b9638795536d05c8bc5dd207121d10a", t: 10054, f: false },
  { n: "ERC1967Proxy", a: "0x998d7c178a1f9607b47ea3a8e22426451b3ce707", t: 10032, f: false },
  { n: "DVN", a: "0xf9d2c0915cac4c75b7ae359089333c8ac258e12c", t: 9968, f: false },
  { n: "", a: "0x1103fc560de8b710983e7f3ec09d587f3f848566", t: 9947, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x60943cb06b76a24431659165c81a03c16f1c325c", t: 9857, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d", t: 9847, f: false },
  { n: "JasmyCoin", a: "0x7420b4b9a0110cdc71fb720908340c03f9bc03ec", t: 9844, f: false },
  { n: "", a: "0xca0a2515effdb383a572eea1edbb52b2d11a862c", t: 9826, f: false },
  { n: "AllowanceHolder", a: "0x50c4e75a512f2a14a7b304787adf79c4531a5909", t: 9804, f: false },
  { n: "TransparentUpgradeableProxy", a: "0x94e7a5dcbe816e498b89ab752661904e2f56c485", t: 9800, f: false },
  { n: "SophonToken", a: "0x6b7774cb12ed7573a7586e7d0e62a2a563ddd3f0", t: 9751, f: false },
  { n: "FWAV2", a: "0x958c41181182e76f221331b2755b77d9e1426a98", t: 9735, f: false },
  { n: "TornadoRouter", a: "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", t: 9708, f: false },
  { n: "CoWSwapEthFlow", a: "0xba3cb449bd2b4adddbc894d8697f5170800eadec", t: 9677, f: false },
  { n: "", a: "0xb82aac6aecc9a8edf12345a3b1ec874575da97d4", t: 9563, f: false },
  { n: "Proxy", a: "0x709de0b97e369661c99ad54f2b858139897d3dba", t: 9523, f: false },
  { n: "Sweeper", a: "0x8d04cc7e86e687854eb41d9d43512b655b93184b", t: 9518, f: false },
  { n: "RedstoneToken", a: "0xc43c6bfeda065fe2c4c11765bf838789bd0bb5de", t: 9484, f: false },
  { n: "SwapRouter02", a: "0x5597278e3baa59d53e256db5cbabc9b491499ce5", t: 9459, f: false },
  { n: "L1LiskToken", a: "0x6033f7f88332b8db6ad452b7c6d5bb643990ae3f", t: 9438, f: false },
  { n: "Sky", a: "0x56072c95faa701256059aa122697b133aded9279", t: 9391, f: false },
  { n: "", a: "0x62c22fc556a8ca9159ffe8f8c68596693564f729", t: 9286, f: false },
  { n: "AXSToken", a: "0xbb0e17ef65f82ab018d8edd776e8dd940327b28b", t: 9283, f: false },
  { n: "ERC1967Proxy", a: "0x77146784315ba81904d654466968e3a7c196d1f3", t: 9268, f: false },
  { n: "ConfidentialPool", a: "0x000000000ed1eabd231be41d93b719056f7febfc", t: 9251, f: false },
  { n: "ERC1967Proxy", a: "0x604dd02d620633ae427888d41bfd15e38483736e", t: 9082, f: false },
  { n: "", a: "0x2786ed4ce17214579e359064827715ad2acb1477", t: 9063, f: false },
  { n: "", a: "0x87cefc2f9856a03f663a61e145b47c2d7e384a45", t: 8975, f: false },
  { n: "", a: "0x90c496dea71307da373ea6fbca54b24bf5025de3", t: 8967, f: false },
  { n: "", a: "0x009a8dbad7000f0000009b002d050058ca881b57", t: 8882, f: false },
  { n: "MainnetSettler", a: "0xaddc26a3854feabfd20d6bf658254088d83a425a", t: 8874, f: false },
  { n: "", a: "0xa0f1c3ad83e07d97b5e7030e177718be175275ea", t: 8859, f: false },
  { n: "", a: "0x10e1a2b624e14ac59426199e520320313a98b0be", t: 8847, f: false },
  { n: "GTC", a: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f", t: 8824, f: false },
  { n: "", a: "0x140022b7000081000001094700609300d2187dab", t: 8721, f: false },
  { n: "OhHi", a: "0xe9236c2de544076f974b402c8b6f26058449d745", t: 8683, f: false },
  { n: "", a: "0x7fc774aa282f781cc2036f2d21a90dde0fe3c895", t: 8682, f: false },
  { n: "", a: "0xe54e00b0e72f8fc8cb7e124c378bad2e7371d2b8", t: 8651, f: false },
  { n: "ENSToken", a: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72", t: 8586, f: false },
  { n: "ERC1967Proxy", a: "0x6e2a43be0b1d33b726f0ca3b8de60b3482b8b050", t: 8560, f: false },
  { n: "Token", a: "0x14d145a695a2e98234e83d8c780f6a5852c3c95b", t: 8542, f: false },
  { n: "ERC1967Proxy", a: "0xdc035d45d973e3ec169d2276ddab16f1e407384f", t: 8495, f: false },
  { n: "", a: "0xdbeb05b1bf12723ab3cdc28ceb23751390054759", t: 8488, f: false },
  { n: "", a: "0x394546c8dcdb81d41870c122118833fbc78aaf17", t: 8429, f: false },
];
