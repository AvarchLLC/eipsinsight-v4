import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'

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

// ── Trend series (per granularity + range). Cached per key. ──
const seriesCache = new Map<string, { at: number; data: AaUsageStats['series'] }>()

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
    const total = N(w.total)
    return {
      bucket: w.bucket,
      aa7702,
      aa4337: ep06 + ep07 + ep08,
      accounts7702: N(w.accts7702),
      share7702Pct: total > 0 ? Math.round((aa7702 / total) * 10000) / 100 : 0,
      ep06,
      ep07,
      ep08,
    }
  })
}

async function getSeries(g: Granularity, from: string, to: string) {
  const key = `${g}:${from}:${to}`
  const hit = seriesCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  const data = await querySeries(g, from, to)
  seriesCache.set(key, { at: Date.now(), data })
  return data
}

async function getAaUsageStats(g: Granularity, from: string, to: string): Promise<AaUsageStats> {
  if (!clickhouseConfigured()) return emptyStats(g, from, to)
  try {
    const [totals, series] = await Promise.all([getTotals(), getSeries(g, from, to)])
    return {
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
  } catch {
    // Never cache a failure; the underlying caches only hold successful results.
    return { ...emptyStats(g, from, to), ...(totalsCache?.data ?? {}) }
  }
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

export const aaProcedures = {
  getAdoptionIndex: optionalAuthProcedure.handler(async (): Promise<AaAdoption> => getAdoption()),

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
