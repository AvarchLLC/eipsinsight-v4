import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

/**
 * Account Abstraction usage metrics for the /aa dashboard.
 *
 * Data comes from BlobLens' ClickHouse `ethereum.transactions` table (mainnet,
 * from Mar 2024 onward). We measure the two AA mechanisms live on mainnet:
 *
 *  - EIP-7702 (Set EOA code): transaction type 4, live since Pectra (May 2025).
 *  - ERC-4337 (Account Abstraction via EntryPoint): transactions to the canonical
 *    EntryPoint contracts (v0.6 / v0.7 / v0.8) — a conservative bundler-tx floor.
 *
 * The trend series honours a granularity (day / week / month) and a date range,
 * so the UI can offer "this week", "this month", "last month", monthly default,
 * and a custom range. Headline totals stay pinned to the EIP-7702 era so the
 * 7702-vs-4337 comparison covers the same period regardless of the range picked.
 */

const CACHE_TTL_MS = 300_000 // 5 min

// Canonical ERC-4337 EntryPoint contracts (lowercased): v0.6, v0.7, v0.8.
const ENTRYPOINTS = [
  '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789',
  '0x0000000071727de22e5e9d8baf0edac6f37da032',
  '0x4337084d9e255ff0702461cf8895ce9e3b5ff108',
]
const EP_SQL = ENTRYPOINTS.map((a) => `'${a}'`).join(',')

const SEVEN702_START = '2025-05-07' // Pectra

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

type Granularity = 'day' | 'week' | 'month'

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function shiftDays(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
function shiftMonths(n: number): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + n)
  return iso(d)
}

/** Resolve an effective [from, to] window; validate user dates against injection. */
function resolveRange(g: Granularity, from?: string, to?: string): { from: string; to: string } {
  const t = to && DATE_RE.test(to) ? to : iso(new Date())
  let f = from && DATE_RE.test(from) ? from : ''
  if (!f) f = g === 'day' ? shiftDays(-30) : g === 'week' ? shiftDays(-26 * 7) : shiftMonths(-12)
  return { from: f, to: t }
}

const BUCKET_EXPR: Record<Granularity, string> = {
  day: 'toDate(block_timestamp)',
  week: 'toStartOfWeek(block_timestamp)',
  month: 'toStartOfMonth(block_timestamp)',
}

type TotalsRow = { t7702: string; t4337: string; last_day: string }
type SeriesRow = {
  bucket: string
  aa7702: string
  accts7702: string
  total: string
  ep06: string
  ep07: string
  ep08: string
}

export interface AaUsageStats {
  available: boolean
  total7702: number
  total4337: number
  lastDay: string | null
  since7702: string
  granularity: Granularity
  from: string
  to: string
  series: Array<{
    bucket: string
    aa7702: number
    aa4337: number
    accounts7702: number
    /** 7702 as a percent of all mainnet transactions in that bucket. */
    share7702Pct: number
    /** ERC-4337 EntryPoint txs as a percent of all mainnet transactions in that bucket. */
    share4337Pct: number
    ep06: number
    ep07: number
    ep08: number
  }>
  source: string
  sourceUrl: string
}

const emptyStats = (g: Granularity, from: string, to: string): AaUsageStats => ({
  available: false,
  total7702: 0,
  total4337: 0,
  lastDay: null,
  since7702: SEVEN702_START,
  granularity: g,
  from,
  to,
  series: [],
  source: 'BlobLens · ethereum.transactions (mainnet)',
  sourceUrl: 'https://eipsinsight.com',
})

// ── Totals (range-independent, since Pectra). Cached once. ──
let totalsCache: { at: number; data: { total7702: number; total4337: number; lastDay: string | null } } | null = null

async function queryTotals() {
  const rows = await clickhouseQuery<TotalsRow>(
    `
    SELECT
      countIf(tx_type = 4)                      AS t7702,
      countIf(lower(to_address) IN (${EP_SQL})) AS t4337,
      toDate(max(block_timestamp))              AS last_day
    FROM ethereum.transactions
    WHERE is_deleted = 0
      AND block_timestamp >= '${SEVEN702_START}'
    `,
    { timeoutMs: 15_000 },
  )
  const t = rows[0]
  if (!t) throw new Error('AA totals: empty')
  return { total7702: N(t.t7702), total4337: N(t.t4337), lastDay: t.last_day ?? null }
}

async function getTotals() {
  if (totalsCache && Date.now() - totalsCache.at < CACHE_TTL_MS) return totalsCache.data
  const data = await queryTotals()
  totalsCache = { at: Date.now(), data }
  return data
}

async function querySeries(g: Granularity, from: string, to: string): Promise<AaUsageStats['series']> {
  const rows = await clickhouseQuery<SeriesRow>(
    `
    SELECT
      ${BUCKET_EXPR[g]}                                                          AS bucket,
      countIf(tx_type = 4)                                                       AS aa7702,
      uniqExactIf(from_address, tx_type = 4)                                     AS accts7702,
      count()                                                                    AS total,
      countIf(lower(to_address) = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789')  AS ep06,
      countIf(lower(to_address) = '0x0000000071727de22e5e9d8baf0edac6f37da032')  AS ep07,
      countIf(lower(to_address) = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108')  AS ep08
    FROM ethereum.transactions
    WHERE is_deleted = 0
      AND block_timestamp >= '${from}'
      AND block_timestamp < toDate('${to}') + 1
    GROUP BY bucket
    ORDER BY bucket ASC
    `,
    { timeoutMs: 20_000 },
  )
  return rows.map((w) => {
    const ep06 = N(w.ep06)
    const ep07 = N(w.ep07)
    const ep08 = N(w.ep08)
    const aa7702 = N(w.aa7702)
    const aa4337 = ep06 + ep07 + ep08
    const total = N(w.total)
    return {
      bucket: w.bucket,
      aa7702,
      aa4337,
      accounts7702: N(w.accts7702),
      share7702Pct: total > 0 ? Math.round((aa7702 / total) * 10000) / 100 : 0,
      share4337Pct: total > 0 ? Math.round((aa4337 / total) * 10000) / 100 : 0,
      ep06,
      ep07,
      ep08,
    }
  })
}

// ── Usage stats: durable stale-while-revalidate cache ──
//
// The ClickHouse queries behind this are heavy (10-20s cold), so a fresh
// serverless instance or an expired TTL used to surface a live timeout as the
// "temporarily unavailable" banner. Instead we keep a last-good copy that never
// expires — in memory and mirrored to Redis so it survives restarts — and serve
// it immediately while refreshing in the background. The banner only ever shows
// on the very first request when nothing has ever been cached AND the live query
// fails, which is rare and self-heals on the next successful refresh.
const USAGE_REDIS_TTL_S = 24 * 3600
const usageGood = new Map<string, AaUsageStats>() // last good result, never evicted
const usageAt = new Map<string, number>() // when each key was last refreshed
const usageInflight = new Map<string, Promise<void>>()

const usageRedisKey = (key: string) => `aa:usage:v1:${key}`

async function refreshUsage(key: string, g: Granularity, from: string, to: string): Promise<void> {
  const [totals, series] = await Promise.all([getTotals(), querySeries(g, from, to)])
  const data: AaUsageStats = {
    available: true,
    ...totals,
    since7702: SEVEN702_START,
    granularity: g,
    from,
    to,
    series,
    source: 'BlobLens · ethereum.transactions (mainnet)',
    sourceUrl: 'https://eipsinsight.com',
  }
  usageGood.set(key, data)
  usageAt.set(key, Date.now())
  try {
    await redis().set(usageRedisKey(key), JSON.stringify(data), 'EX', USAGE_REDIS_TTL_S)
  } catch {
    // Redis is a best-effort mirror; the in-memory copy still serves this process.
  }
}

async function getAaUsageStats(g: Granularity, from: string, to: string): Promise<AaUsageStats> {
  if (!clickhouseConfigured()) return emptyStats(g, from, to)
  const key = `${g}:${from}:${to}`

  // Cold start (no in-memory copy yet): seed last-good from Redis so a restarted
  // instance serves the previous good result instead of blocking on ClickHouse.
  if (!usageGood.has(key)) {
    try {
      const raw = await redis().get(usageRedisKey(key))
      if (raw) usageGood.set(key, JSON.parse(raw) as AaUsageStats)
    } catch {
      // No Redis / miss — fall through to a live query below.
    }
  }

  const good = usageGood.get(key)
  const fresh = good != null && (usageAt.get(key) ?? 0) > Date.now() - CACHE_TTL_MS
  if (fresh) return good

  // Trigger a refresh (deduped per key). Failures are swallowed so a timing-out
  // ClickHouse never rejects the request when we already have a good copy.
  if (!usageInflight.has(key)) {
    const p = refreshUsage(key, g, from, to)
      .catch(() => {})
      .finally(() => usageInflight.delete(key))
    usageInflight.set(key, p)
  }

  // Serve stale immediately while the refresh runs in the background.
  if (good != null) return good

  // Nothing cached anywhere yet — wait for this first refresh, then return
  // whatever it produced (or the empty state if even that failed).
  await usageInflight.get(key)
  return usageGood.get(key) ?? emptyStats(g, from, to)
}

// ── Adoption index (7702, since Pectra). Its own cache — the uniq scan is ~10s. ──
export interface AaAdoption {
  available: boolean
  /** Distinct accounts (from_address) that sent a 7702 tx. */
  accounts: number
  /** Distinct contracts (to_address) 7702 transactions interacted with. */
  contracts: number
  txs: number
  since: string
}

const emptyAdoption = (): AaAdoption => ({ available: false, accounts: 0, contracts: 0, txs: 0, since: SEVEN702_START })

let adoptionCache: { at: number; data: AaAdoption } | null = null

async function getAdoption(): Promise<AaAdoption> {
  if (adoptionCache && Date.now() - adoptionCache.at < CACHE_TTL_MS) return adoptionCache.data
  if (!clickhouseConfigured()) return emptyAdoption()
  try {
    const rows = await clickhouseQuery<{ accounts: string; contracts: string; txs: string }>(
      `
      SELECT
        uniqExact(from_address) AS accounts,
        uniqExact(to_address)   AS contracts,
        count()                 AS txs
      FROM ethereum.transactions
      WHERE is_deleted = 0 AND tx_type = 4 AND block_timestamp >= '${SEVEN702_START}'
      `,
      { timeoutMs: 25_000 },
    )
    const r = rows[0]
    if (!r) throw new Error('AA adoption: empty')
    const data: AaAdoption = { available: true, accounts: N(r.accounts), contracts: N(r.contracts), txs: N(r.txs), since: SEVEN702_START }
    adoptionCache = { at: Date.now(), data }
    return data
  } catch {
    return adoptionCache?.data ?? emptyAdoption()
  }
}

// ── Value series (USD moved + gas) from the pre-aggregated blob_lens.aa_daily_value ──
const DATE_BUCKET: Record<Granularity, string> = {
  day: 'date',
  week: 'toStartOfWeek(date)',
  month: 'toStartOfMonth(date)',
}

export interface AaValuePoint {
  bucket: string
  value7702Usd: number
  value4337Usd: number
  gas7702Usd: number
  gas4337Usd: number
}
export interface AaValueSeries {
  available: boolean
  granularity: Granularity
  from: string
  to: string
  series: AaValuePoint[]
  source: string
}

type ValueRow = { bucket: string; kind: string; metric: string; usd: string }
const valueCache = new Map<string, { at: number; data: AaValuePoint[] }>()

async function getValueSeries(g: Granularity, from: string, to: string): Promise<AaValuePoint[]> {
  const key = `${g}:${from}:${to}`
  const hit = valueCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  const rows = await clickhouseQuery<ValueRow>(
    `
    SELECT ${DATE_BUCKET[g]} AS bucket, kind, metric, round(sum(usd)) AS usd
    FROM blob_lens.aa_daily_value FINAL
    WHERE date >= '${from}' AND date <= '${to}'
    GROUP BY bucket, kind, metric
    ORDER BY bucket ASC
    `,
    { timeoutMs: 15_000 },
  )
  const by = new Map<string, AaValuePoint>()
  for (const r of rows) {
    const p = by.get(r.bucket) ?? { bucket: r.bucket, value7702Usd: 0, value4337Usd: 0, gas7702Usd: 0, gas4337Usd: 0 }
    const usd = N(r.usd)
    if (r.metric === 'value' && r.kind === '7702') p.value7702Usd = usd
    else if (r.metric === 'value' && r.kind === '4337') p.value4337Usd = usd
    else if (r.metric === 'gas' && r.kind === '7702') p.gas7702Usd = usd
    else if (r.metric === 'gas' && r.kind === '4337') p.gas4337Usd = usd
    by.set(r.bucket, p)
  }
  const data = [...by.values()]
  valueCache.set(key, { at: Date.now(), data })
  return data
}

// ---------------------------------------------------------------------------
// EIP-8141 Frame Transaction devnet activity (frames-devnet-*).
// Indexed into Postgres by the scheduler (frames_devnet_* tables) from the live
// devnet execution RPC. This procedure reads those aggregates for the /aa/eip-8141
// "Devnet" view. See eipsinsight_scheduler/src/devnets/frames_activity.ts.
// ---------------------------------------------------------------------------

export interface FramesDevnetHistBucket {
  bucket: string
  count: number
}
export interface FramesDevnetSeriesPoint {
  t: string
  frameTxs: number
  frames: number
  signatures: number
  blocks: number
  gasUsed: number
  success: number
  fail: number
  successRate: number | null
  gasPerFrame: number | null
  avgFramesPerBlock: number
  avgFramesPerTx: number
  cumulativeFrameTxs: number
  cumulativeFrames: number
  cumulativeSignatures: number
}
export interface FramesDevnetData {
  available: boolean
  network: string | null
  status: 'live' | 'ended' | null
  chainId: string | null
  genesisTime: string | null
  activationBlock: number | null
  activationTime: string | null
  headBlock: number | null
  lastIndexedBlock: number | null
  lastSeen: string | null
  totals: {
    frameTxs: number
    frames: number
    signatures: number
    gas: number
    valueWei: string
    blocks: number
    success: number
    fail: number
  }
  derived: {
    avgFramesPerTx: number
    avgSignaturesPerTx: number
    avgBlockTimeSec: number | null
    daysLive: number | null
    successRate: number | null
    gasPerFrame: number | null
  }
  series: FramesDevnetSeriesPoint[]
  histograms: {
    framesPerTx: FramesDevnetHistBucket[]
    sigPerTx: FramesDevnetHistBucket[]
    frameMode: FramesDevnetHistBucket[]
    frameFlags: FramesDevnetHistBucket[]
    sigScheme: FramesDevnetHistBucket[]
    gasByMode: FramesDevnetHistBucket[]
  }
}

const framesUnavailable = (network: string): FramesDevnetData => ({
  available: false,
  network,
  status: null,
  chainId: null,
  genesisTime: null,
  activationBlock: null,
  activationTime: null,
  headBlock: null,
  lastIndexedBlock: null,
  lastSeen: null,
  totals: { frameTxs: 0, frames: 0, signatures: 0, gas: 0, valueWei: '0', blocks: 0, success: 0, fail: 0 },
  derived: { avgFramesPerTx: 0, avgSignaturesPerTx: 0, avgBlockTimeSec: null, daysLive: null, successRate: null, gasPerFrame: null },
  series: [],
  histograms: { framesPerTx: [], sigPerTx: [], frameMode: [], frameFlags: [], sigScheme: [], gasByMode: [] },
})

const framesCache = new Map<string, { at: number; data: FramesDevnetData }>()

async function getFramesDevnet(network: string): Promise<FramesDevnetData> {
  const cached = framesCache.get(network)
  if (cached && Date.now() - cached.at < 60_000) return cached.data
  try {
    const metaRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT network, chain_id, genesis_time, activation_block, activation_time,
              head_block, last_indexed_block, last_seen, status,
              total_frame_txs, total_frames, total_signatures, total_gas, total_value_wei,
              total_success, total_fail
       FROM frames_devnet_meta WHERE network = $1 LIMIT 1`,
      network,
    )
    if (!metaRows.length) return framesUnavailable(network)
    const m = metaRows[0]

    const seriesRows = await prisma.$queryRawUnsafe<
      Array<{ t: Date; frame_txs: bigint; frames: bigint; sigs: bigint; blocks: bigint; gas: bigint; success: bigint; fail: bigint }>
    >(
      `SELECT date_trunc('hour', block_time) AS t,
              SUM(frame_tx_count)::bigint AS frame_txs,
              SUM(frame_count)::bigint AS frames,
              SUM(signature_count)::bigint AS sigs,
              COUNT(*)::bigint AS blocks,
              SUM(gas_used)::bigint AS gas,
              SUM(success_count)::bigint AS success,
              SUM(fail_count)::bigint AS fail
       FROM frames_devnet_blocks WHERE network = $1
       GROUP BY 1 ORDER BY 1`,
      network,
    )

    const histRows = await prisma.$queryRawUnsafe<Array<{ dimension: string; bucket: string; count: bigint }>>(
      `SELECT dimension, bucket, count FROM frames_devnet_histograms WHERE network = $1`,
      network,
    )

    const num = (v: unknown) => (v == null ? 0 : Number(v as bigint | number | string))
    let cumTx = 0
    let cumFr = 0
    let cumSig = 0
    const series: FramesDevnetSeriesPoint[] = seriesRows.map((r) => {
      const frameTxs = num(r.frame_txs)
      const frames = num(r.frames)
      const signatures = num(r.sigs)
      const blocks = num(r.blocks)
      const gasUsed = num(r.gas)
      const success = num(r.success)
      const fail = num(r.fail)
      cumTx += frameTxs
      cumFr += frames
      cumSig += signatures
      return {
        t: (r.t instanceof Date ? r.t : new Date(r.t)).toISOString(),
        frameTxs,
        frames,
        signatures,
        blocks,
        gasUsed,
        success,
        fail,
        successRate: success + fail > 0 ? +((100 * success) / (success + fail)).toFixed(2) : null,
        gasPerFrame: frames ? Math.round(gasUsed / frames) : null,
        avgFramesPerBlock: blocks ? +(frames / blocks).toFixed(2) : 0,
        avgFramesPerTx: frameTxs ? +(frames / frameTxs).toFixed(2) : 0,
        cumulativeFrameTxs: cumTx,
        cumulativeFrames: cumFr,
        cumulativeSignatures: cumSig,
      }
    })

    const byDim = (dimension: string): FramesDevnetHistBucket[] =>
      histRows
        .filter((h) => h.dimension === dimension)
        .map((h) => ({ bucket: h.bucket, count: num(h.count) }))
        .sort((a, b) => b.count - a.count)

    // Derive headline totals from the per-block table (idempotent) rather than the
    // meta running-counters, which can drift if a reset/backfill overlaps the live
    // indexer. Per-block rows use ON CONFLICT DO NOTHING, so these sums are exact.
    const frameTxs = series.reduce((s, p) => s + p.frameTxs, 0)
    const frames = series.reduce((s, p) => s + p.frames, 0)
    const signatures = series.reduce((s, p) => s + p.signatures, 0)
    const success = series.reduce((s, p) => s + p.success, 0)
    const fail = series.reduce((s, p) => s + p.fail, 0)
    const gas = series.reduce((s, p) => s + p.gasUsed, 0)
    const blockCount = series.reduce((s, p) => s + p.blocks, 0)
    const activationTime = m.activation_time ? new Date(m.activation_time as string) : null
    const lastSeen = m.last_seen ? new Date(m.last_seen as string) : null
    const spanSec = activationTime && lastSeen ? (lastSeen.getTime() - activationTime.getTime()) / 1000 : null
    const blocks = blockCount > 0 ? blockCount : num(m.head_block) - num(m.activation_block) + 1

    const data: FramesDevnetData = {
      available: true,
      network: String(m.network),
      status: (m.status as 'live' | 'ended') ?? 'live',
      chainId: m.chain_id ? String(m.chain_id) : null,
      genesisTime: m.genesis_time ? new Date(m.genesis_time as string).toISOString() : null,
      activationBlock: m.activation_block == null ? null : num(m.activation_block),
      activationTime: activationTime ? activationTime.toISOString() : null,
      headBlock: m.head_block == null ? null : num(m.head_block),
      lastIndexedBlock: m.last_indexed_block == null ? null : num(m.last_indexed_block),
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
      totals: {
        frameTxs,
        frames,
        signatures,
        gas,
        valueWei: m.total_value_wei == null ? '0' : String(m.total_value_wei),
        blocks: blocks > 0 ? blocks : series.reduce((s, p) => s + p.blocks, 0),
        success,
        fail,
      },
      derived: {
        avgFramesPerTx: frameTxs ? +(frames / frameTxs).toFixed(2) : 0,
        avgSignaturesPerTx: frameTxs ? +(signatures / frameTxs).toFixed(2) : 0,
        avgBlockTimeSec: spanSec && blocks > 1 ? +(spanSec / (blocks - 1)).toFixed(1) : null,
        daysLive: spanSec ? +(spanSec / 86400).toFixed(1) : null,
        successRate: success + fail > 0 ? +((100 * success) / (success + fail)).toFixed(2) : null,
        gasPerFrame: frames ? Math.round(gas / frames) : null,
      },
      series,
      histograms: {
        framesPerTx: byDim('frames_per_tx').sort((a, b) => Number(a.bucket) - Number(b.bucket)),
        sigPerTx: byDim('sig_per_tx').sort((a, b) => Number(a.bucket) - Number(b.bucket)),
        frameMode: byDim('frame_mode'),
        frameFlags: byDim('frame_flags'),
        sigScheme: byDim('sig_scheme'),
        gasByMode: byDim('gas_by_mode'),
      },
    }
    framesCache.set(network, { at: Date.now(), data })
    return data
  } catch {
    return framesUnavailable(network)
  }
}

export const aaProcedures = {
  getAdoptionIndex: optionalAuthProcedure.handler(async (): Promise<AaAdoption> => getAdoption()),

  /** EIP-8141 frame-transaction devnet activity (default: frames-devnet-0). */
  getFramesDevnet: optionalAuthProcedure
    .input(z.object({ network: z.string().regex(/^[a-z0-9-]+$/).default('frames-devnet-0') }))
    .handler(async ({ input }): Promise<FramesDevnetData> => getFramesDevnet(input.network)),

  getValueSeries: optionalAuthProcedure
    .input(
      z.object({
        granularity: z.enum(['day', 'week', 'month']).default('month'),
        from: z.string().regex(DATE_RE).optional(),
        to: z.string().regex(DATE_RE).optional(),
      }),
    )
    .handler(async ({ input }): Promise<AaValueSeries> => {
      const g = input.granularity as Granularity
      const { from, to } = resolveRange(g, input.from, input.to)
      if (!clickhouseConfigured()) return { available: false, granularity: g, from, to, series: [], source: 'BlobLens' }
      try {
        const series = await getValueSeries(g, from, to)
        return { available: series.length > 0, granularity: g, from, to, series, source: 'BlobLens · aa_daily_value (stablecoins + WETH)' }
      } catch {
        return { available: false, granularity: g, from, to, series: [], source: 'BlobLens' }
      }
    }),

  getUsageStats: optionalAuthProcedure
    .input(
      z.object({
        granularity: z.enum(['day', 'week', 'month']).default('month'),
        from: z.string().regex(DATE_RE).optional(),
        to: z.string().regex(DATE_RE).optional(),
      }),
    )
    .handler(async ({ input }): Promise<AaUsageStats> => {
      const g = input.granularity as Granularity
      const { from, to } = resolveRange(g, input.from, input.to)
      return getAaUsageStats(g, from, to)
    }),
}
