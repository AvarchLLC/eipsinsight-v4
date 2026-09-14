import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'

/**
 * MEV metrics for the /lucid (encrypted mempool) page.
 *
 * Data comes from BlobLens' ClickHouse `blob_lens` database — the same
 * sandwich-attack index that powers BlobLens' /mev dashboard. It quantifies the
 * live MEV extraction that the Encrypt-the-Mempool working group is designing
 * Lucid (EIP-8184) to neutralise: how many swaps get sandwiched, how many
 * victims/bots are involved, and how much value the payoff represents.
 *
 * Coverage caveats (see blob_lens/MEV_DATA_COMPARISON.md): the index starts at
 * the Dencun activation block (EIP-4844, 2024-03-13), across a handful of DEX
 * protocols (Uniswap v2/v3/v4, SushiSwap, Curve, DODO, Balancer, PancakeSwap),
 * so figures are a conservative floor versus full-history sources like Dune.
 *
 * Money fields: profit is `gross_profit_usd` (stablecoin-denominated leg) plus
 * `gross_profit_weth * eth_price` (ETH-denominated leg); victim volume is
 * `victim_volume_weth * eth_price`. We deliberately never read the raw
 * `victim_volume_usd` column — it is corrupted upstream (sums to quadrillions).
 *
 * Winsorization: a handful of artifact protocol-day rows (mispriced tokens /
 * decimals bugs — the same dates spike in both legs) carry an implausible
 * per-attack gross profit. Combined per-attack profit is ~$3 at the median but
 * the tail reaches tens of thousands of dollars. We cap the *combined* profit
 * (stablecoin + ETH leg) at $10,000 per sandwich
 * (`least(usd + weth*price, sandwiches * CAP)`), which clips ~4.3% of rows
 * (219 of ~5,073) and takes the headline "extracted value" from ~$7.6B to
 * ~$5.95B since Dencun, while leaving genuine volatility (and Uniswap v3's real
 * per-trade dominance) intact. Keep this documented so the figure is defensible.
 */

const CACHE_TTL_MS = 300_000 // 5 min
const PROFIT_CAP_PER_ATTACK = 10_000 // USD, combined per-sandwich gross profit — see winsorization note above

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// Combined-leg gross profit, winsorized at CAP per sandwich (both legs together).
const PROFIT_SQL = `sum(least(s.gross_profit_usd + s.gross_profit_weth * coalesce(p.price_usd, 2500.0), s.sandwiches * ${PROFIT_CAP_PER_ATTACK}.0))`
const VICTIM_SQL = 'sum(s.victim_volume_weth * coalesce(p.price_usd, 2500.0))'

type StatsRow = {
  total_sandwiches: string
  unique_victims: string
  unique_bots: string
  unique_pools: string
  first_block: string
  last_block: string
  bot_profit_usd: number
  gas_cost_usd: number
  victim_volume_usd: number
}
type PctRow = { sw_blocks: string; total_blocks: string }
type BucketRow = {
  bucket: string
  sandwiches: string
  profit_usd: number
  victim_usd: number
  gas_usd: number
  active_bots: string
  victims: string
}
type ProtoRow = { protocol: string; sandwiches: string; profit_usd: number }
type BoundsRow = { min_date: string; max_date: string }

export type MevGranularity = 'day' | 'week' | 'month'

export interface MempoolMevStats {
  available: boolean
  totalSandwiches: number
  uniqueVictims: number
  uniqueBots: number
  uniquePools: number
  firstBlock: number
  lastBlock: number
  botProfitUsd: number
  victimVolumeUsd: number
  gasCostUsd: number
  /** Share of blocks (last 30 days) that contained at least one sandwich. Range-independent. */
  blocksSandwichedPct: number | null
  /** Bucketed trend over the selected range, chronological. */
  granularity: MevGranularity
  series: Array<{
    bucket: string
    sandwiches: number
    botProfitUsd: number
    victimUsd: number
    gasCostUsd: number
    activeBots: number
    victims: number
  }>
  /** Sandwich + profit totals per DEX protocol over the selected range. */
  byProtocol: Array<{ protocol: string; sandwiches: number; botProfitUsd: number }>
  /** The selected window, echoed back for labels. */
  from: string
  to: string
  /** Full dataset bounds (for presets / custom-range clamping). */
  dataMin: string
  dataMax: string
  source: string
  sourceUrl: string
}

const EMPTY: MempoolMevStats = {
  available: false,
  totalSandwiches: 0,
  uniqueVictims: 0,
  uniqueBots: 0,
  uniquePools: 0,
  firstBlock: 0,
  lastBlock: 0,
  botProfitUsd: 0,
  victimVolumeUsd: 0,
  gasCostUsd: 0,
  blocksSandwichedPct: null,
  granularity: 'week',
  series: [],
  byProtocol: [],
  from: '',
  to: '',
  dataMin: '2024-03-13',
  dataMax: '',
  source: 'BlobLens',
  sourceUrl: 'https://eipsinsight.com',
}

// The index only exists from the Dencun activation onward.
const DATA_FLOOR = '2024-03-13'

type Range = { months?: number; from?: string; to?: string }

/** Resolve a preset (months) or explicit from/to into an inclusive [from, to] day
 *  window plus the bucket granularity that keeps the chart readable. */
function resolveRange({ months = 6, from, to }: Range): {
  from: string
  to: string
  granularity: MevGranularity
  bucketFn: string
} {
  const today = new Date().toISOString().slice(0, 10)
  const toDay = (to ? to.slice(0, 10) : today)
  let fromDay: string
  if (from) {
    fromDay = from.slice(0, 10)
  } else {
    const d = new Date(`${toDay}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - months)
    fromDay = d.toISOString().slice(0, 10)
  }
  if (fromDay < DATA_FLOOR) fromDay = DATA_FLOOR

  const spanDays = Math.max(1, (Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000)
  const granularity: MevGranularity = spanDays <= 92 ? 'day' : spanDays <= 400 ? 'week' : 'month'
  const bucketFn =
    granularity === 'day' ? 'toDate(s.date)' : granularity === 'week' ? 'toStartOfWeek(s.date)' : 'toStartOfMonth(s.date)'
  return { from: fromDay, to: toDay, granularity, bucketFn }
}

const rangeKey = (r: Range): string => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`
const cache = new Map<string, { at: number; data: MempoolMevStats }>()

async function getMempoolMevStats(range: Range): Promise<MempoolMevStats> {
  if (!clickhouseConfigured()) return EMPTY

  const key = rangeKey(range)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  try {
    const { from, to, granularity, bucketFn } = resolveRange(range)
    const where = `s.date >= toDate('${from}') AND s.date <= toDate('${to}')`

    const [statsRows, pctRows, bucketRows, protoRows, boundsRows] = await Promise.all([
      clickhouseQuery<StatsRow>(`
        SELECT
          sum(s.sandwiches)                                            AS total_sandwiches,
          uniqMerge(s.unique_victims)                                  AS unique_victims,
          uniqMerge(s.unique_bots)                                     AS unique_bots,
          uniqMerge(s.unique_pools)                                    AS unique_pools,
          min(s.first_block)                                           AS first_block,
          max(s.last_block)                                            AS last_block,
          round(${PROFIT_SQL})                                         AS bot_profit_usd,
          round(sum(s.gas_cost_weth * coalesce(p.price_usd, 2500.0)))  AS gas_cost_usd,
          round(${VICTIM_SQL})                                         AS victim_volume_usd
        FROM blob_lens.mev_daily_stats s
        LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        WHERE ${where}
      `),
      clickhouseQuery<PctRow>(`
        SELECT
          uniqMerge(s.unique_blocks) AS sw_blocks,
          (SELECT count() FROM ethereum.blocks WHERE timestamp >= now() - INTERVAL 30 DAY AND is_deleted = 0) AS total_blocks
        FROM blob_lens.mev_daily_stats s
        WHERE s.date >= toDate(now() - INTERVAL 30 DAY)
      `),
      clickhouseQuery<BucketRow>(`
        SELECT
          ${bucketFn}                                              AS bucket,
          sum(s.sandwiches)                                        AS sandwiches,
          uniqMerge(s.unique_bots)                                 AS active_bots,
          uniqMerge(s.unique_victims)                              AS victims,
          round(${PROFIT_SQL})                                     AS profit_usd,
          round(${VICTIM_SQL})                                     AS victim_usd,
          round(sum(s.gas_cost_weth * coalesce(p.price_usd, 2500.0))) AS gas_usd
        FROM blob_lens.mev_daily_stats s
        LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        WHERE ${where}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
      clickhouseQuery<ProtoRow>(`
        SELECT
          s.protocol            AS protocol,
          sum(s.sandwiches)     AS sandwiches,
          round(${PROFIT_SQL})  AS profit_usd
        FROM blob_lens.mev_daily_stats s
        LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        WHERE ${where}
        GROUP BY protocol
        ORDER BY sandwiches DESC
      `),
      clickhouseQuery<BoundsRow>(`
        SELECT min(date) AS min_date, max(date) AS max_date FROM blob_lens.mev_daily_stats
      `),
    ])

    const s = statsRows[0]
    if (!s) return EMPTY

    const swBlocks = N(pctRows[0]?.sw_blocks)
    const totalBlocks = N(pctRows[0]?.total_blocks)
    const blocksSandwichedPct = totalBlocks > 0 ? Math.round((swBlocks / totalBlocks) * 1000) / 10 : null

    const data: MempoolMevStats = {
      available: true,
      totalSandwiches: N(s.total_sandwiches),
      uniqueVictims: N(s.unique_victims),
      uniqueBots: N(s.unique_bots),
      uniquePools: N(s.unique_pools),
      firstBlock: N(s.first_block),
      lastBlock: N(s.last_block),
      botProfitUsd: N(s.bot_profit_usd),
      victimVolumeUsd: N(s.victim_volume_usd),
      gasCostUsd: N(s.gas_cost_usd),
      blocksSandwichedPct,
      granularity,
      series: bucketRows.map((b) => ({
        bucket: b.bucket,
        sandwiches: N(b.sandwiches),
        botProfitUsd: N(b.profit_usd),
        victimUsd: N(b.victim_usd),
        gasCostUsd: N(b.gas_usd),
        activeBots: N(b.active_bots),
        victims: N(b.victims),
      })),
      byProtocol: protoRows
        .map((r) => ({ protocol: r.protocol, sandwiches: N(r.sandwiches), botProfitUsd: N(r.profit_usd) }))
        .filter((r) => r.sandwiches > 0),
      from,
      to,
      dataMin: boundsRows[0]?.min_date || DATA_FLOOR,
      dataMax: boundsRows[0]?.max_date || to,
      source: 'BlobLens',
      sourceUrl: 'https://eipsinsight.com',
    }

    cache.set(key, { at: Date.now(), data })
    return data
  } catch {
    // Network/ClickHouse hiccup — /lucid degrades gracefully to no MEV panel.
    return EMPTY
  }
}

const YMD = /^\d{4}-\d{2}(-\d{2})?$/
const rangeInput = z
  .object({
    months: z.number().int().min(1).max(60).default(6),
    from: z.string().regex(YMD).optional(),
    to: z.string().regex(YMD).optional(),
  })
  .optional()

export const mevProcedures = {
  getMempoolStats: optionalAuthProcedure
    .input(rangeInput)
    .handler(async ({ input }): Promise<MempoolMevStats> => getMempoolMevStats(input ?? {})),
}
