import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'
import { prisma } from '@/lib/prisma'
import { STANDARDS, DEFERRED, COVERAGE, SIG, type Standard, type Detect } from '@/data/adoption-standards'

// Max age of a scheduler-precomputed snapshot we will still trust before falling
// back to a live (expensive) ClickHouse compute. The scheduler refreshes every
// 6h, so a healthy snapshot is always well inside this; this only guards against
// a stalled scheduler serving very old numbers.
const SNAPSHOT_MAX_AGE_MS = 24 * 3_600_000

async function readSnapshot<T>(key: string): Promise<T | null> {
  try {
    const rows = await prisma.$queryRaw<{ payload: unknown; updated_at: Date }[]>`
      SELECT payload, updated_at FROM adoption_snapshots WHERE key = ${key} LIMIT 1`
    const row = rows[0]
    if (!row) return null
    if (Date.now() - new Date(row.updated_at).getTime() > SNAPSHOT_MAX_AGE_MS) return null
    return row.payload as T
  } catch {
    return null // table missing / db error → caller falls back to live ClickHouse
  }
}

/**
 * EIP / ERC on-chain adoption metrics for the /adoption dashboard.
 *
 * Evidence-based detection over our own Ethereum archive index in ClickHouse
 * (`ethereum.contract_events` — a pre-aggregated (address, topic0) rollup, and
 * `ethereum.logs` — raw event logs). No third-party classification table.
 *
 *  • contracts — distinct contract addresses that have emitted a standard's
 *    event signature at least once within coverage (all-time floor).
 *  • active    — distinct contracts that emitted it within the selected window.
 *  • events    — raw event count in the window (for ERC-4337 this is UserOps).
 *
 * The shared ERC-20/721 Transfer signature is split by whether tokenId is an
 * indexed topic (topic3 present ⇒ ERC-721, absent ⇒ ERC-20).
 *
 * Coverage begins at the Dencun block (19,426,587 / 2024-03-13); counts are a
 * conservative floor vs full history. Mainnet only. See src/data/adoption-standards.ts.
 */

const LEADERBOARD_TTL_MS = 600_000 // 10 min
const ALLTIME_TTL_MS = 6 * 3_600_000 // 6 h — the heavy all-time Transfer split

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// Momentum from a monthly active series: recent 3-month avg vs the prior
// 3-month avg (drops the current, partial month). Returns percent change, or a
// first-vs-last fallback for short series. 0 when there isn't enough signal.
function growthFromSeries(series: { active: number }[]): number {
  const a = series.map((p) => p.active)
  if (a.length >= 7) {
    const recent = (a[a.length - 2] + a[a.length - 3] + a[a.length - 4]) / 3 // last 3 complete months
    const prior = (a[a.length - 5] + a[a.length - 6] + a[a.length - 7]) / 3
    if (prior <= 0) return 0
    return Math.round(((recent - prior) / prior) * 1000) / 10
  }
  if (a.length >= 2 && a[0] > 0) return Math.round(((a[a.length - 1] - a[0]) / a[0]) * 1000) / 10
  return 0
}

export type Window = '24h' | '7d' | '30d' | '365d' | 'all'
const WINDOW_SQL: Record<Exclude<Window, 'all'>, string> = {
  '24h': 'INTERVAL 1 DAY',
  '7d': 'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
  '365d': 'INTERVAL 365 DAY',
}
const tsFilter = (col: string, w: Window): string =>
  w === 'all' ? '1=1' : `${col} >= now() - ${WINDOW_SQL[w]}`

export type AdoptionRow = {
  id: string
  eip: string
  name: string
  category: Standard['category']
  blurb: string
  specUrl: string
  confidence: Standard['confidence']
  evidence: string
  contracts: number // all-time within coverage
  active: number // in window
  events: number // in window
  growthPct: number // momentum: recent 3-month avg active vs prior 3-month avg (percent)
}

// Transaction-feature standards (e.g. EIP-7702) — not contracts, so ranked
// separately: counted as accounts that used the feature + authorization txs.
export type TxFeatureRow = {
  id: string
  eip: string
  name: string
  blurb: string
  specUrl: string
  accounts: number // distinct accounts using the feature, in window
  txs: number // feature transactions, in window
}

export type AdoptionLeaderboard = {
  available: boolean
  window: Window
  rows: AdoptionRow[]
  txFeatures: TxFeatureRow[]
  coverage: typeof COVERAGE
  generatedAt: string
}

export type CatalogEntry = {
  id: string
  eip: string
  name: string
  category: Standard['category']
  blurb: string
  specUrl: string
  confidence: Standard['confidence']
  evidence: string
  ranked: boolean
  deferredReason: string | null
}

export type AdoptionOverview = {
  available: boolean
  standardsRanked: number
  standardsTracked: number
  totalImplementations: number // summed across ranked standards (a contract can implement several)
  activeContracts30d: number
  networks: number
  coverage: typeof COVERAGE
  catalog: CatalogEntry[]
  generatedAt: string
}

// Event-kind standards (unique signatures) and their topic sets.
const EVENT_STANDARDS = STANDARDS.filter((s) => s.detect.kind === 'event') as (Standard & {
  detect: { kind: 'event'; topics: string[] }
})[]
const ALL_EVENT_TOPICS = EVENT_STANDARDS.flatMap((s) => s.detect.topics)

// ── Priced tokens for the ba-data-only "value moved (USD)" metric ───────────
// Tokens whose USD price we can set WITHOUT any external oracle: stablecoins
// (≈ $1) and ETH-denominated tokens (valued via blob_lens.eth_daily_price).
// This is a conservative floor on ERC-20 value moved — long-tail tokens that
// would need DEX-derived prices are deliberately excluded, not guessed.
const PRICED_USD_6 = [
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x6c3ea9036406852006290770bedfcaba0e23a0e8', // PYUSD
]
const PRICED_USD_18 = [
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3', // USDe
  '0xdc035d45d973e3ec169d2276ddab16f1e407384f', // USDS
  '0xc5f0f7b66764f6ec8c8dff7ba683102295e16409', // FDUSD
  '0x0000000000085d4780b73119b644ae5ecd22b376', // TUSD
  '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e', // crvUSD
  '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f', // GHO
]
const PRICED_ETH_18 = [
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
]
const ALL_PRICED = [...PRICED_USD_6, ...PRICED_USD_18, ...PRICED_ETH_18]

export type ValueMoved = {
  available: boolean;
  window: Window;
  usd: number;
  tier1Usd?: number;
  tier2Usd?: number;
  tokens: number;
  tier?: 1 | 2;
  generatedAt: string;
};
const valueCache = new Map<Window, { at: number; data: ValueMoved }>();

// ── USD breakdown: top priced ERC-20 tokens by USD value moved in window ──
const TIER1_LABELS: Record<string, string> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0x6c3ea9036406852006290770bedfcaba0e23a0e8': 'PYUSD',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3': 'USDe',
  '0xdc035d45d973e3ec169d2276ddab16f1e407384f': 'USDS',
  '0xc5f0f7b66764f6ec8c8dff7ba683102295e16409': 'FDUSD',
  '0x0000000000085d4780b73119b644ae5ecd22b376': 'TUSD',
  '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e': 'crvUSD',
  '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f': 'GHO',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'stETH',
};

export type UsdBreakdownRow = {
  address: string;
  symbol: string;
  tier: 1 | 2;
  usd: number;
  transfers: number;
};

export type UsdBreakdownResult = {
  available: boolean;
  window: Window;
  totalUsd: number;
  rows: UsdBreakdownRow[];
  generatedAt: string;
};

const usdBreakdownCache = new Map<string, { at: number; data: UsdBreakdownResult }>();
const inflightUsd = new Map<Window, Promise<{ value: ValueMoved; breakdown: UsdBreakdownResult }>>();

async function computeTokenUsd(window: Window): Promise<{ value: ValueMoved; breakdown: UsdBreakdownResult }> {
  const existing = inflightUsd.get(window);
  if (existing) return existing;

  const work = (async () => {
    const generatedAt = new Date().toISOString();
    const emptyVal: ValueMoved = { available: false, window, usd: 0, tokens: ALL_PRICED.length, tier: 1, generatedAt };
    const emptyBk: UsdBreakdownResult = { available: false, window, totalUsd: 0, rows: [], generatedAt };
    if (!clickhouseConfigured()) return { value: emptyVal, breakdown: emptyBk };

    try {
      const tsCond = tsFilter('block_timestamp', window);
      const dexSnap = await readSnapshot<{ prices?: Record<string, { usdPerRaw: number }> }>('dex_token_prices');
      const dexMap = new Map(Object.entries(dexSnap?.prices ?? {}));
      const allTokens = [...ALL_PRICED, ...dexMap.keys()];

      const [ethRows, rows] = await Promise.all([
        clickhouseQuery<{ price_usd: string }>(
          `SELECT price_usd FROM blob_lens.eth_daily_price ORDER BY date DESC LIMIT 1`,
          { timeoutMs: 15_000 },
        ),
        clickhouseQuery<{ token_address: string; total_amt: string; transfers: string }>(
          `WITH toFloat64(reinterpretAsUInt256(reverse(unhex(substring(amount_raw, 3))))) AS amt
           SELECT token_address, sum(amt) AS total_amt, count() AS transfers
           FROM ethereum.erc20_transfers
           WHERE ${tsCond} AND token_address IN (${quote(allTokens)})
           GROUP BY token_address`,
          { timeoutMs: 90_000 },
        ),
      ]);

      const ethp = N(ethRows[0]?.price_usd);
      const usd6 = new Set(PRICED_USD_6);
      const usd18 = new Set(PRICED_USD_18);
      const eth18 = new Set(PRICED_ETH_18);

      let tier1Usd = 0;
      let tier2Usd = 0;
      const parsed: UsdBreakdownRow[] = [];

      for (const r of rows) {
        const addr = r.token_address.toLowerCase();
        const amt = N(r.total_amt);
        const transfers = N(r.transfers);
        let usd = 0;
        let tier: 1 | 2 = 1;

        if (usd6.has(addr)) usd = amt / 1e6;
        else if (usd18.has(addr)) usd = amt / 1e18;
        else if (eth18.has(addr)) usd = (amt / 1e18) * ethp;
        else {
          tier = 2;
          const info = dexMap.get(addr);
          if (info) usd = amt * Number(info.usdPerRaw);
        }

        const roundedUsd = Math.round(usd);
        if (roundedUsd <= 0) continue;
        if (tier === 1) tier1Usd += roundedUsd;
        else tier2Usd += roundedUsd;

        const label = TIER1_LABELS[addr];
        parsed.push({
          address: addr,
          symbol: label ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`,
          tier,
          usd: roundedUsd,
          transfers,
        });
      }

      parsed.sort((a, b) => b.usd - a.usd);
      const totalUsd = tier1Usd + tier2Usd;

      const value: ValueMoved = {
        available: true,
        window,
        usd: totalUsd,
        tier1Usd,
        tier2Usd,
        tokens: allTokens.length,
        tier: dexMap.size > 0 ? 2 : 1,
        generatedAt,
      };
      const breakdown: UsdBreakdownResult = {
        available: true,
        window,
        totalUsd,
        rows: parsed.slice(0, 25),
        generatedAt,
      };

      valueCache.set(window, { at: Date.now(), data: value });
      usdBreakdownCache.set(window, { at: Date.now(), data: breakdown });
      return { value, breakdown };
    } catch {
      return { value: emptyVal, breakdown: emptyBk };
    } finally {
      inflightUsd.delete(window);
    }
  })();

  inflightUsd.set(window, work);
  return work;
}

async function getValueMoved(window: Window): Promise<ValueMoved> {
  const hit = valueCache.get(window);
  if (hit && Date.now() - hit.at < LEADERBOARD_TTL_MS) return hit.data;

  // 1) Prefer the scheduler-precomputed Tier-1 + Tier-2 snapshot (instant).
  const snap = await readSnapshot<ValueMoved>(`value_moved:${window}`);
  if (snap && snap.available) {
    const data: ValueMoved = {
      available: true,
      window,
      usd: N(snap.usd),
      tier1Usd: snap.tier1Usd != null ? N(snap.tier1Usd) : undefined,
      tier2Usd: snap.tier2Usd != null ? N(snap.tier2Usd) : undefined,
      tokens: N(snap.tokens) || ALL_PRICED.length,
      tier: snap.tier === 2 ? 2 : 1,
      generatedAt: snap.generatedAt || new Date().toISOString(),
    };
    valueCache.set(window, { at: Date.now(), data });
    return data;
  }

  const { value } = await computeTokenUsd(window);
  return value;
}

async function getUsdBreakdown(window: Window): Promise<UsdBreakdownResult> {
  const hit = usdBreakdownCache.get(window);
  if (hit && Date.now() - hit.at < LEADERBOARD_TTL_MS) return hit.data;

  const snap = await readSnapshot<UsdBreakdownResult>(`usd_breakdown:${window}`);
  if (snap && snap.available && snap.rows.length > 0) {
    usdBreakdownCache.set(window, { at: Date.now(), data: snap });
    return snap;
  }

  const { breakdown } = await computeTokenUsd(window);
  return breakdown;
}

// Contract standards (shown in the main leaderboard) vs transaction features.
const CONTRACT_STANDARDS = STANDARDS.filter(
  (s) => s.detect.kind === 'event' || s.detect.kind === 'transfer' || s.detect.kind === 'calldata',
)
const CALLDATA_STANDARDS = STANDARDS.filter((s) => s.detect.kind === 'calldata') as (Standard & {
  detect: { kind: 'calldata'; selector: string }
})[]
const TXTYPE_STANDARDS = STANDARDS.filter((s) => s.detect.kind === 'txtype') as (Standard & {
  detect: { kind: 'txtype'; txType: number }
})[]

const quote = (xs: string[]) => xs.map((x) => `'${x}'`).join(',')

// A ClickHouse multiIf mapping topic0 -> standard id, for correct per-standard
// distinct-address counts (a standard may declare several event topics).
function topicToStandardSql(): string {
  const arms = EVENT_STANDARDS.map((s) => `topic0 IN (${quote(s.detect.topics)}),'${s.id}'`).join(', ')
  return `multiIf(${arms}, '')`
}

// ── all-time ERC-20 / ERC-721 split (heavy ~20s; cached long) ───────────────
let allTimeTransfer: { at: number; erc20: number; erc721: number } | null = null
async function getAllTimeTransferSplit(): Promise<{ erc20: number; erc721: number }> {
  if (allTimeTransfer && Date.now() - allTimeTransfer.at < ALLTIME_TTL_MS) {
    return { erc20: allTimeTransfer.erc20, erc721: allTimeTransfer.erc721 }
  }
  // Prefer the scheduler-precomputed snapshot (instant) over the ~20s live scan.
  const snap = await readSnapshot<{ erc20: number; erc721: number }>('alltime_transfer_split')
  if (snap) {
    allTimeTransfer = { at: Date.now(), erc20: N(snap.erc20), erc721: N(snap.erc721) }
    return { erc20: allTimeTransfer.erc20, erc721: allTimeTransfer.erc721 }
  }
  const rows = await clickhouseQuery<{ erc20: string; erc721: string }>(
    `SELECT uniqExactIf(address, topic3 IS NULL) AS erc20, uniqExactIf(address, topic3 IS NOT NULL) AS erc721
     FROM ethereum.logs WHERE topic0 = '${SIG.TRANSFER}'`,
    { timeoutMs: 60_000 },
  )
  const erc20 = N(rows[0]?.erc20)
  const erc721 = N(rows[0]?.erc721)
  allTimeTransfer = { at: Date.now(), erc20, erc721 }
  return { erc20, erc721 }
}

// ── leaderboard ─────────────────────────────────────────────────────────────
const leaderboardCache = new Map<Window, { at: number; data: AdoptionLeaderboard }>()

function emptyLeaderboard(window: Window): AdoptionLeaderboard {
  return { available: false, window, rows: [], txFeatures: [], coverage: COVERAGE, generatedAt: new Date().toISOString() }
}

async function getCalldataMetrics(
  s: Standard & { detect: { kind: 'calldata'; selector: string } },
  window: Window,
): Promise<{ contracts: number; active: number; events: number }> {
  const sel = s.detect.selector
  const tsCond = tsFilter('block_timestamp', window)
  const [snap, winRows] = await Promise.all([
    readSnapshot<{ contracts: number }>(`alltime_calldata:${s.id}`),
    clickhouseQuery<{ active: string; events: string }>(
      `SELECT uniqExact(to_address) AS active, count() AS events
       FROM ethereum.transactions
       WHERE startsWith(input, '${sel}')
         AND to_address != ''
         AND is_deleted = 0
         AND ${tsCond}`,
      { timeoutMs: 90_000 },
    ),
  ])
  let contracts = snap ? N(snap.contracts) : 0
  if (!snap) {
    const allRows = await clickhouseQuery<{ contracts: string }>(
      `SELECT uniqExact(to_address) AS contracts
       FROM ethereum.transactions
       WHERE startsWith(input, '${sel}') AND to_address != '' AND is_deleted = 0`,
      { timeoutMs: 45_000 },
    )
    contracts = N(allRows[0]?.contracts)
  }
  return {
    contracts,
    active: N(winRows[0]?.active),
    events: N(winRows[0]?.events),
  }
}

// Distinct accounts + tx count for a transaction-type feature, in window.
async function getTxFeature(s: Standard & { detect: { kind: 'txtype'; txType: number } }, window: Window): Promise<TxFeatureRow> {
  const tsCond = tsFilter('block_timestamp', window)
  const rows = await clickhouseQuery<{ accounts: string; txs: string }>(
    `SELECT uniqExact(from_address) AS accounts, count() AS txs
     FROM ethereum.transactions
     WHERE tx_type = ${s.detect.txType} AND ${tsCond}`,
    { timeoutMs: 90_000 },
  )
  return {
    id: s.id, eip: s.eip, name: s.name, blurb: s.blurb, specUrl: s.specUrl,
    accounts: N(rows[0]?.accounts), txs: N(rows[0]?.txs),
  }
}

async function getLeaderboard(window: Window): Promise<AdoptionLeaderboard> {
  const hit = leaderboardCache.get(window)
  if (hit && Date.now() - hit.at < LEADERBOARD_TTL_MS) return hit.data

  const snap = await readSnapshot<AdoptionLeaderboard>(`leaderboard:${window}`)
  if (snap && snap.available && snap.rows.length > 0) {
    leaderboardCache.set(window, { at: Date.now(), data: snap })
    return snap
  }

  if (!clickhouseConfigured()) return emptyLeaderboard(window)

  try {
    const tsCond = tsFilter('block_timestamp', window)
    const lastSeenCond = tsFilter('last_seen', window)
    const sidSql = topicToStandardSql()

    const [eventRows, eventVolRows, transferWindowRows, transferAllTime] = await Promise.all([
      // event-standards: all-time contracts + active-in-window, per standard
      clickhouseQuery<{ sid: string; contracts: string; active: string }>(
        `SELECT ${sidSql} AS sid, uniqExact(address) AS contracts,
                uniqExactIf(address, ${lastSeenCond}) AS active
         FROM ethereum.contract_events
         WHERE topic0 IN (${quote(ALL_EVENT_TOPICS)})
         GROUP BY sid`,
        { timeoutMs: 45_000 },
      ).catch(() => []),
      // event-standards: raw event volume in window
      clickhouseQuery<{ sid: string; events: string }>(
        `SELECT ${sidSql} AS sid, count() AS events
         FROM ethereum.logs
         WHERE ${tsCond} AND topic0 IN (${quote(ALL_EVENT_TOPICS)})
         GROUP BY sid`,
        { timeoutMs: 90_000 },
      ).catch(() => []),
      // transfer split: active + events in window
      clickhouseQuery<{ is20: number; active: string; events: string }>(
        `SELECT (topic3 IS NULL) AS is20, uniqExact(address) AS active, count() AS events
         FROM ethereum.logs
         WHERE ${tsCond} AND topic0 = '${SIG.TRANSFER}'
         GROUP BY is20`,
        { timeoutMs: 90_000 },
      ).catch(() => []),
      getAllTimeTransferSplit().catch(() => ({ erc20: 0, erc721: 0 })),
    ])

    const contractsBy = new Map<string, number>()
    const activeBy = new Map<string, number>()
    const eventsBy = new Map<string, number>()
    for (const r of eventRows) {
      if (!r.sid) continue
      contractsBy.set(r.sid, N(r.contracts))
      activeBy.set(r.sid, N(r.active))
    }
    for (const r of eventVolRows) if (r.sid) eventsBy.set(r.sid, N(r.events))

    // transfer window rows: is20 === 1 -> erc-20, else erc-721
    for (const r of transferWindowRows) {
      const id = N(r.is20) === 1 ? 'erc-20' : 'erc-721'
      activeBy.set(id, N(r.active))
      eventsBy.set(id, N(r.events))
    }
    contractsBy.set('erc-20', transferAllTime.erc20)
    contractsBy.set('erc-721', transferAllTime.erc721)

    await Promise.all(
      CALLDATA_STANDARDS.map(async (s) => {
        try {
          const m = await getCalldataMetrics(s, window)
          contractsBy.set(s.id, m.contracts)
          activeBy.set(s.id, m.active)
          eventsBy.set(s.id, m.events)
        } catch {
          contractsBy.set(s.id, 0)
          activeBy.set(s.id, 0)
          eventsBy.set(s.id, 0)
        }
      }),
    )

    // Growth (momentum) per standard, from the monthly active series. Trends are
    // Postgres-snapshotted for the heavy standards and cheap for the rest, so
    // this stays fast; failures just yield 0 (flat).
    const growthByStd = new Map<string, number>()
    await Promise.all(
      CONTRACT_STANDARDS.map(async (s) => {
        try {
          const t = await getTrend(s.id)
          growthByStd.set(s.id, growthFromSeries(t.series))
        } catch {
          growthByStd.set(s.id, 0)
        }
      }),
    )

    const rows: AdoptionRow[] = CONTRACT_STANDARDS.map((s) => ({
      id: s.id,
      eip: s.eip,
      name: s.name,
      category: s.category,
      blurb: s.blurb,
      specUrl: s.specUrl,
      confidence: s.confidence,
      evidence: s.evidence,
      contracts: contractsBy.get(s.id) ?? 0,
      active: activeBy.get(s.id) ?? 0,
      events: eventsBy.get(s.id) ?? 0,
      growthPct: growthByStd.get(s.id) ?? 0,
    })).sort((a, b) => b.active - a.active)

    // transaction features (EIP-7702, …) — ranked separately from contracts
    const txFeatures = (
      await Promise.all(
        TXTYPE_STANDARDS.map((s) =>
          getTxFeature(s, window).catch(() => ({
            id: s.id, eip: s.eip, name: s.name, blurb: s.blurb, specUrl: s.specUrl,
            accounts: 0, txs: 0,
          })),
        ),
      )
    )
    txFeatures.sort((a, b) => b.accounts - a.accounts)

    const data: AdoptionLeaderboard = {
      available: true,
      window,
      rows,
      txFeatures,
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    leaderboardCache.set(window, { at: Date.now(), data })
    return data
  } catch {
    return emptyLeaderboard(window)
  }
}

function buildCatalog(): CatalogEntry[] {
  const ranked: CatalogEntry[] = STANDARDS.map((s) => ({
    id: s.id, eip: s.eip, name: s.name, category: s.category, blurb: s.blurb,
    specUrl: s.specUrl, confidence: s.confidence, evidence: s.evidence,
    ranked: true, deferredReason: null,
  }))
  const deferred: CatalogEntry[] = DEFERRED.map((s) => ({
    id: s.id, eip: s.eip, name: s.name, category: s.category, blurb: s.blurb,
    specUrl: s.specUrl, confidence: s.confidence, evidence: s.evidence,
    ranked: false, deferredReason: s.detect.kind === 'deferred' ? s.detect.reason : null,
  }))
  return [...ranked, ...deferred]
}

async function getOverview(): Promise<AdoptionOverview> {
  const catalog = buildCatalog()
  const base = {
    standardsRanked: STANDARDS.length,
    standardsTracked: STANDARDS.length + DEFERRED.length,
    networks: 1,
    coverage: COVERAGE,
    catalog,
    generatedAt: new Date().toISOString(),
  }
  if (!clickhouseConfigured()) {
    return { available: false, totalImplementations: 0, activeContracts30d: 0, ...base }
  }
  const lb = await getLeaderboard('30d')
  if (!lb.available) {
    return { available: false, totalImplementations: 0, activeContracts30d: 0, ...base }
  }
  const totalImplementations = lb.rows.reduce((s, r) => s + r.contracts, 0)
  const activeContracts30d = lb.rows.reduce((s, r) => s + r.active, 0)
  return { available: true, totalImplementations, activeContracts30d, ...base }
}

// ── per-standard detail: metrics + contract directory ──────────────────────
export type DirectoryRow = { address: string; events: number; lastActive: string }

export type StandardDetail = {
  available: boolean
  found: boolean
  ranked: boolean
  id: string
  window: Window
  meta: {
    eip: string
    name: string
    category: Standard['category']
    blurb: string
    specUrl: string
    confidence: Standard['confidence']
    kind: Detect['kind']
  } | null
  deferredReason: string | null
  metrics: { contracts: number; active: number; events: number }
  directory: DirectoryRow[]
  coverage: typeof COVERAGE
  generatedAt: string
}

const DETAIL_TTL_MS = 600_000 // 10 min
const detailCache = new Map<string, { at: number; data: StandardDetail }>()

function metaOf(s: Standard) {
  return { eip: s.eip, name: s.name, category: s.category, blurb: s.blurb, specUrl: s.specUrl, confidence: s.confidence, kind: s.detect.kind }
}

async function getStandardDetail(id: string, window: Window): Promise<StandardDetail> {
  const ranked = STANDARDS.find((s) => s.id === id)
  const deferred = DEFERRED.find((s) => s.id === id)
  const s = ranked ?? deferred
  const baseShell = {
    window,
    coverage: COVERAGE,
    generatedAt: new Date().toISOString(),
    metrics: { contracts: 0, active: 0, events: 0 },
    directory: [] as DirectoryRow[],
  }

  if (!s) {
    return { available: true, found: false, ranked: false, id, meta: null, deferredReason: null, ...baseShell }
  }
  if (!ranked) {
    // tracked but not yet detectable from events
    const reason = deferred && deferred.detect.kind === 'deferred' ? deferred.detect.reason : null
    return { available: true, found: true, ranked: false, id, meta: metaOf(s), deferredReason: reason, ...baseShell }
  }
  if (!clickhouseConfigured()) {
    return { available: false, found: true, ranked: true, id, meta: metaOf(s), deferredReason: null, ...baseShell }
  }

  const cacheKey = `${id}|${window}`
  const hit = detailCache.get(cacheKey)
  if (hit && Date.now() - hit.at < DETAIL_TTL_MS) return hit.data

  try {
    const tsCond = tsFilter('block_timestamp', window)
    const lastSeenCond = tsFilter('last_seen', window)
    let metrics = { contracts: 0, active: 0, events: 0 }
    let directory: DirectoryRow[] = []

    if (ranked.detect.kind === 'transfer') {
      const cond = ranked.detect.side === 'erc20' ? 'topic3 IS NULL' : 'topic3 IS NOT NULL'
      const [winRows, allTime, dirRows] = await Promise.all([
        clickhouseQuery<{ active: string; events: string }>(
          `SELECT uniqExact(address) AS active, count() AS events
           FROM ethereum.logs
           WHERE ${tsCond} AND topic0 = '${SIG.TRANSFER}' AND ${cond}`,
          { timeoutMs: 45_000 },
        ),
        getAllTimeTransferSplit(),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.logs
           WHERE ${tsCond} AND topic0 = '${SIG.TRANSFER}' AND ${cond}
           GROUP BY address ORDER BY events DESC LIMIT 25`,
          { timeoutMs: 45_000 },
        ),
      ])
      metrics = {
        contracts: ranked.detect.side === 'erc20' ? allTime.erc20 : allTime.erc721,
        active: N(winRows[0]?.active),
        events: N(winRows[0]?.events),
      }
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    } else if (ranked.detect.kind === 'event') {
      const topics = ranked.detect.topics
      const [ceRows, logRows, dirRows] = await Promise.all([
        clickhouseQuery<{ contracts: string; active: string }>(
          `SELECT uniqExact(address) AS contracts, uniqExactIf(address, ${lastSeenCond}) AS active
           FROM ethereum.contract_events WHERE topic0 IN (${quote(topics)})`,
          { timeoutMs: 30_000 },
        ),
        clickhouseQuery<{ events: string }>(
          `SELECT count() AS events FROM ethereum.logs
           WHERE ${tsCond} AND topic0 IN (${quote(topics)})`,
          { timeoutMs: 30_000 },
        ),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.logs
           WHERE ${tsCond} AND topic0 IN (${quote(topics)})
           GROUP BY address ORDER BY events DESC LIMIT 25`,
          { timeoutMs: 30_000 },
        ),
      ])
      metrics = { contracts: N(ceRows[0]?.contracts), active: N(ceRows[0]?.active), events: N(logRows[0]?.events) }
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    } else if (ranked.detect.kind === 'txtype') {
      // transaction feature (e.g. EIP-7702): accounts = delegating EOAs, events = authorization txs
      const t = ranked.detect.txType
      const [allRows, winRows, dirRows] = await Promise.all([
        clickhouseQuery<{ accounts: string }>(
          `SELECT uniqExact(from_address) AS accounts FROM ethereum.transactions WHERE tx_type = ${t}`,
          { timeoutMs: 45_000 },
        ),
        clickhouseQuery<{ active: string; txs: string }>(
          `SELECT uniqExact(from_address) AS active, count() AS txs
           FROM ethereum.transactions WHERE tx_type = ${t} AND ${tsCond}`,
          { timeoutMs: 30_000 },
        ),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT from_address AS address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.transactions WHERE tx_type = ${t} AND ${tsCond}
           GROUP BY from_address ORDER BY events DESC LIMIT 25`,
          { timeoutMs: 30_000 },
        ),
      ])
      metrics = { contracts: N(allRows[0]?.accounts), active: N(winRows[0]?.active), events: N(winRows[0]?.txs) }
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    } else if (ranked.detect.kind === 'calldata') {
      const sel = ranked.detect.selector
      const [m, dirRows] = await Promise.all([
        getCalldataMetrics(ranked as Standard & { detect: { kind: 'calldata'; selector: string } }, window),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT to_address AS address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.transactions
           WHERE startsWith(input, '${sel}')
             AND to_address != ''
             AND is_deleted = 0
             AND ${tsCond}
           GROUP BY to_address ORDER BY events DESC LIMIT 25`,
          { timeoutMs: 30_000 },
        ),
      ])
      metrics = m
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    }

    const data: StandardDetail = {
      available: true,
      found: true,
      ranked: true,
      id,
      window,
      meta: metaOf(ranked),
      deferredReason: null,
      metrics,
      directory,
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    detailCache.set(cacheKey, { at: Date.now(), data })
    return data
  } catch {
    return { available: false, found: true, ranked: true, id, meta: metaOf(ranked), deferredReason: null, ...baseShell }
  }
}

// ── reverse lookup: address -> implemented standards ───────────────────────
export type AddressMatch = {
  id: string
  eip: string
  name: string
  category: Standard['category']
  confidence: Standard['confidence']
  evidence: string
  specUrl: string
  events: number // total events of this standard emitted by the address (within coverage)
  lastActive: string
}

export type AddressLookup = {
  available: boolean
  address: string
  isContract: boolean // emitted any indexed event within coverage
  matches: AddressMatch[]
  otherSignatures: number // distinct emitted signatures not mapped to a tracked standard
  coverage: typeof COVERAGE
  generatedAt: string
}

const ADDRESS_TTL_MS = 600_000 // 10 min
const addressCache = new Map<string, { at: number; data: AddressLookup }>()

const emptyAddress = (address: string, available: boolean): AddressLookup => ({
  available,
  address,
  isContract: false,
  matches: [],
  otherSignatures: 0,
  coverage: COVERAGE,
  generatedAt: new Date().toISOString(),
})

async function getAddressLookup(addressRaw: string): Promise<AddressLookup> {
  const address = addressRaw.trim().toLowerCase()
  if (!clickhouseConfigured()) return emptyAddress(address, false)

  const hit = addressCache.get(address)
  if (hit && Date.now() - hit.at < ADDRESS_TTL_MS) return hit.data

  try {
    // Every event signature this address has emitted, within coverage.
    const sigRows = await clickhouseQuery<{ topic0: string; events: string; last: string }>(
      `SELECT topic0, sum(event_count) AS events, max(last_seen) AS last
       FROM ethereum.contract_events WHERE address = '${address}'
       GROUP BY topic0`,
      { timeoutMs: 20_000 },
    )
    const emitted = new Map<string, { events: number; last: string }>()
    for (const r of sigRows) emitted.set(r.topic0, { events: N(r.events), last: r.last })

    if (emitted.size === 0) {
      const data = emptyAddress(address, true)
      addressCache.set(address, { at: Date.now(), data })
      return data
    }

    const matches: AddressMatch[] = []
    const mappedTopics = new Set<string>()

    // event-kind standards: any declared topic present ⇒ matched
    for (const s of EVENT_STANDARDS) {
      const present = s.detect.topics.filter((t) => emitted.has(t))
      if (present.length === 0) continue
      let events = 0
      let last = ''
      for (const t of present) {
        const e = emitted.get(t)!
        events += e.events
        if (e.last > last) last = e.last
        mappedTopics.add(t)
      }
      matches.push({
        id: s.id, eip: s.eip, name: s.name, category: s.category, confidence: s.confidence,
        evidence: s.evidence, specUrl: s.specUrl, events, lastActive: last,
      })
    }

    // shared Transfer signature: split this address into ERC-20 vs ERC-721 by
    // sampling its most recent Transfer logs for an indexed tokenId (topic3).
    if (emitted.has(SIG.TRANSFER)) {
      mappedTopics.add(SIG.TRANSFER)
      const splitRows = await clickhouseQuery<{ as20: string; as721: string }>(
        `SELECT countIf(topic3 IS NULL) AS as20, countIf(topic3 IS NOT NULL) AS as721
         FROM (SELECT topic3 FROM ethereum.logs
               WHERE address = '${address}' AND topic0 = '${SIG.TRANSFER}'
               ORDER BY block_number DESC LIMIT 2000)`,
        { timeoutMs: 20_000 },
      )
      const as20 = N(splitRows[0]?.as20)
      const as721 = N(splitRows[0]?.as721)
      const sideId = as721 > as20 ? 'erc-721' : 'erc-20'
      const s = STANDARDS.find((x) => x.id === sideId)
      const e = emitted.get(SIG.TRANSFER)!
      if (s) {
        matches.push({
          id: s.id, eip: s.eip, name: s.name, category: s.category, confidence: s.confidence,
          evidence: s.evidence, specUrl: s.specUrl, events: e.events, lastActive: e.last,
        })
      }
    }

    matches.sort((a, b) => b.events - a.events)
    const otherSignatures = Math.max(0, emitted.size - mappedTopics.size)

    const data: AddressLookup = {
      available: true,
      address,
      isContract: true,
      matches,
      otherSignatures,
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    addressCache.set(address, { at: Date.now(), data })
    return data
  } catch {
    return emptyAddress(address, false)
  }
}

// ── adoption over time: monthly series per standard ────────────────────────
export type TrendPoint = { month: string; active: number; events: number }
export type AdoptionTrend = {
  available: boolean
  id: string
  series: TrendPoint[]
  coverage: typeof COVERAGE
  generatedAt: string
}

const TREND_TTL_MS = 6 * 3_600_000 // 6 h — monthly history is heavy for ERC-20/721
const trendCache = new Map<string, { at: number; data: AdoptionTrend }>()

const emptyTrend = (id: string, available: boolean): AdoptionTrend => ({
  available,
  id,
  series: [],
  coverage: COVERAGE,
  generatedAt: new Date().toISOString(),
})

async function getTrend(id: string): Promise<AdoptionTrend> {
  const s = STANDARDS.find((x) => x.id === id)
  if (!s) return emptyTrend(id, true)

  const hit = trendCache.get(id)
  if (hit && Date.now() - hit.at < TREND_TTL_MS) return hit.data

  // Prefer the scheduler-precomputed snapshot (instant) over the ~30s live scan.
  const snap = await readSnapshot<{ series: TrendPoint[] }>(`trend:${id}`)
  if (snap && Array.isArray(snap.series)) {
    const data: AdoptionTrend = {
      available: true,
      id,
      series: snap.series.map((p) => ({ month: p.month, active: N(p.active), events: N(p.events) })),
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    trendCache.set(id, { at: Date.now(), data })
    return data
  }

  if (!clickhouseConfigured()) return emptyTrend(id, false)

  try {
    // transaction features (EIP-7702, …) trend from the transactions table.
    if (s.detect.kind === 'txtype') {
      const t = s.detect.txType
      const trows = await clickhouseQuery<{ m: string; active: string; events: string }>(
        `SELECT toStartOfMonth(block_timestamp) AS m, uniqExact(from_address) AS active, count() AS events
         FROM ethereum.transactions WHERE tx_type = ${t}
         GROUP BY m ORDER BY m`,
        { timeoutMs: 60_000 },
      )
      const tseries: TrendPoint[] = trows.map((r) => ({ month: r.m.slice(0, 7), active: N(r.active), events: N(r.events) }))
      const tdata: AdoptionTrend = { available: true, id, series: tseries, coverage: COVERAGE, generatedAt: new Date().toISOString() }
      trendCache.set(id, { at: Date.now(), data: tdata })
      return tdata
    }

    if (s.detect.kind === 'calldata') {
      const sel = s.detect.selector
      const crows = await clickhouseQuery<{ m: string; active: string; events: string }>(
        `SELECT toStartOfMonth(block_timestamp) AS m, uniqExact(to_address) AS active, count() AS events
         FROM ethereum.transactions
         WHERE startsWith(input, '${sel}') AND to_address != '' AND is_deleted = 0
         GROUP BY m ORDER BY m`,
        { timeoutMs: 60_000 },
      )
      const cseries: TrendPoint[] = crows.map((r) => ({ month: r.m.slice(0, 7), active: N(r.active), events: N(r.events) }))
      const cdata: AdoptionTrend = { available: true, id, series: cseries, coverage: COVERAGE, generatedAt: new Date().toISOString() }
      trendCache.set(id, { at: Date.now(), data: cdata })
      return cdata
    }

    const where =
      s.detect.kind === 'transfer'
        ? `topic0 = '${SIG.TRANSFER}' AND ${s.detect.side === 'erc20' ? 'topic3 IS NULL' : 'topic3 IS NOT NULL'}`
        : `topic0 IN (${quote((s.detect as { topics: string[] }).topics)})`

    const rows = await clickhouseQuery<{ m: string; active: string; events: string }>(
      `SELECT toStartOfMonth(block_timestamp) AS m, uniqExact(address) AS active, count() AS events
       FROM ethereum.logs WHERE ${where}
       GROUP BY m ORDER BY m`,
      { timeoutMs: 60_000 },
    )
    const series: TrendPoint[] = rows.map((r) => ({
      month: r.m.slice(0, 7), // YYYY-MM
      active: N(r.active),
      events: N(r.events),
    }))
    const data: AdoptionTrend = { available: true, id, series, coverage: COVERAGE, generatedAt: new Date().toISOString() }
    trendCache.set(id, { at: Date.now(), data })
    return data
  } catch {
    return emptyTrend(id, false)
  }
}

// ── directory export: a larger contract list for downloadable reports ──────
export type DirectoryExport = {
  available: boolean
  id: string
  window: Window
  rows: DirectoryRow[]
  coverage: typeof COVERAGE
  generatedAt: string
}

function logsWhereFor(s: Standard): string {
  if (s.detect.kind === 'transfer') {
    return `topic0 = '${SIG.TRANSFER}' AND ${s.detect.side === 'erc20' ? 'topic3 IS NULL' : 'topic3 IS NOT NULL'}`
  }
  if (s.detect.kind === 'event') return `topic0 IN (${quote(s.detect.topics)})`
  return '0'
}

async function getDirectory(id: string, window: Window, limit: number): Promise<DirectoryExport> {
  const s = STANDARDS.find((x) => x.id === id)
  const base = { id, window, coverage: COVERAGE, generatedAt: new Date().toISOString() }
  if (!s) return { available: true, rows: [], ...base }
  if (!clickhouseConfigured()) return { available: false, rows: [], ...base }
  try {
    const tsCond = tsFilter('block_timestamp', window)
    const rows = s.detect.kind === 'txtype'
      ? await clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT from_address AS address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.transactions
           WHERE tx_type = ${s.detect.txType} AND ${tsCond}
           GROUP BY from_address ORDER BY events DESC LIMIT ${limit}`,
          { timeoutMs: 45_000 },
        )
      : s.detect.kind === 'calldata'
        ? await clickhouseQuery<{ address: string; events: string; last: string }>(
            `SELECT to_address AS address, count() AS events, max(block_timestamp) AS last
             FROM ethereum.transactions
             WHERE startsWith(input, '${s.detect.selector}')
               AND to_address != ''
               AND is_deleted = 0
               AND ${tsCond}
             GROUP BY to_address ORDER BY events DESC LIMIT ${limit}`,
            { timeoutMs: 45_000 },
          )
        : await clickhouseQuery<{ address: string; events: string; last: string }>(
            `SELECT address, count() AS events, max(block_timestamp) AS last
             FROM ethereum.logs
             WHERE ${tsCond} AND ${logsWhereFor(s)}
             GROUP BY address ORDER BY events DESC LIMIT ${limit}`,
          { timeoutMs: 45_000 },
        )
    return {
      available: true,
      rows: rows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last })),
      ...base,
    }
  } catch {
    return { available: false, rows: [], ...base }
  }
}

// ── unique users: distinct addresses interacting with a standard, in window ─
// Lazy (own endpoint) because it is heavier than the core detail metrics.
export type UsersResult = { available: boolean; applicable: boolean; id: string; window: Window; users: number; generatedAt: string }
const usersCache = new Map<string, { at: number; data: UsersResult }>()

async function getUsers(id: string, window: Window): Promise<UsersResult> {
  const s = STANDARDS.find((x) => x.id === id)
  const base = { id, window, generatedAt: new Date().toISOString() }
  // Only defined for event/transfer standards (addresses are in the event topics).
  if (!s || (s.detect.kind !== 'event' && s.detect.kind !== 'transfer')) {
    return { available: true, applicable: false, users: 0, ...base }
  }
  if (!clickhouseConfigured()) return { available: false, applicable: true, users: 0, ...base }
  const cacheKey = `${id}|${window}`
  const hit = usersCache.get(cacheKey)
  if (hit && Date.now() - hit.at < DETAIL_TTL_MS) return hit.data
  try {
    const tsCond = tsFilter('block_timestamp', window)
    const where = logsWhereFor(s)
    const rows = await clickhouseQuery<{ users: string }>(
      `SELECT uniqExact(arrayJoin([topic1, topic2])) AS users
       FROM ethereum.logs
       WHERE ${tsCond} AND ${where} AND topic1 IS NOT NULL`,
      { timeoutMs: 45_000 },
    )
    const data: UsersResult = { available: true, applicable: true, users: N(rows[0]?.users), ...base }
    usersCache.set(cacheKey, { at: Date.now(), data })
    return data
  } catch {
    return { available: false, applicable: true, users: 0, ...base }
  }
}

export const adoptionProcedures = {
  overview: optionalAuthProcedure.handler(async (): Promise<AdoptionOverview> => getOverview()),

  trend: optionalAuthProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input }): Promise<AdoptionTrend> => getTrend(input.id)),

  users: optionalAuthProcedure
    .input(z.object({ id: z.string().min(1), window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d') }))
    .handler(async ({ input }): Promise<UsersResult> => getUsers(input.id, input.window)),

  valueMoved: optionalAuthProcedure
    .input(z.object({ window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d') }))
    .handler(async ({ input }): Promise<ValueMoved> => getValueMoved(input.window)),

  usdBreakdown: optionalAuthProcedure
    .input(z.object({ window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d') }))
    .handler(async ({ input }): Promise<UsdBreakdownResult> => getUsdBreakdown(input.window)),

  directory: optionalAuthProcedure
    .input(z.object({ id: z.string().min(1), window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d'), limit: z.number().int().min(1).max(1000).default(500) }))
    .handler(async ({ input }): Promise<DirectoryExport> => getDirectory(input.id, input.window, input.limit)),

  leaderboard: optionalAuthProcedure
    .input(z.object({ window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d') }).optional())
    .handler(async ({ input }): Promise<AdoptionLeaderboard> => getLeaderboard(input?.window ?? '30d')),

  standard: optionalAuthProcedure
    .input(z.object({ id: z.string().min(1), window: z.enum(['24h', '7d', '30d', '365d', 'all']).default('30d') }))
    .handler(async ({ input }): Promise<StandardDetail> => getStandardDetail(input.id, input.window)),

  contract: optionalAuthProcedure
    .input(z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Enter a valid 0x… contract address') }))
    .handler(async ({ input }): Promise<AddressLookup> => getAddressLookup(input.address)),
}
