import { optionalAuthProcedure } from './types'
import { unstable_cache } from 'next/cache'
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
 * BlobLens caveats (see blob_lens/MEV_DATA_COMPARISON.md): coverage starts at
 * the Dencun activation block (EIP-4844), across five DEX protocols
 * (Uniswap v2/v3, SushiSwap, Curve, DODO), so figures are a conservative floor
 * versus full-history sources like Dune.
 */

const CACHE_REVALIDATE = 300 // seconds

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

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
type WeekRow = {
  week: string
  sandwiches: string
  profit_usd: number
  victim_usd: number
  active_bots: string
}

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
  // Share of blocks (last 30 days) that contained at least one sandwich.
  blocksSandwichedPct: number | null
  // Weekly trend (chronological) for the detailed chart.
  weekly: Array<{
    week: string
    sandwiches: number
    botProfitUsd: number
    victimUsd: number
    activeBots: number
  }>
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
  weekly: [],
  source: 'BlobLens',
  sourceUrl: 'https://eipsinsight.com',
}

const getMempoolMevStatsCached = unstable_cache(
  async (): Promise<MempoolMevStats> => {
    if (!clickhouseConfigured()) return EMPTY
    try {
      const [statsRows, pctRows, weekRows] = await Promise.all([
        clickhouseQuery<StatsRow>(`
          SELECT
            sum(s.sandwiches)                                                        AS total_sandwiches,
            uniqMerge(s.unique_victims)                                              AS unique_victims,
            uniqMerge(s.unique_bots)                                                 AS unique_bots,
            uniqMerge(s.unique_pools)                                                AS unique_pools,
            min(s.first_block)                                                       AS first_block,
            max(s.last_block)                                                        AS last_block,
            round(sum(s.gross_profit_usd) + sum(s.gross_profit_weth * coalesce(p.price_usd, 2000.0))) AS bot_profit_usd,
            round(sum(s.gas_cost_weth * coalesce(p.price_usd, 2000.0)))              AS gas_cost_usd,
            round(sum(s.victim_volume_weth * coalesce(p.price_usd, 2000.0)))         AS victim_volume_usd
          FROM blob_lens.mev_daily_stats s
          LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        `),
        clickhouseQuery<PctRow>(`
          SELECT
            uniqMerge(s.unique_blocks) AS sw_blocks,
            (SELECT count() FROM ethereum.blocks WHERE timestamp >= now() - INTERVAL 30 DAY AND is_deleted = 0) AS total_blocks
          FROM blob_lens.mev_daily_stats s
          WHERE s.date >= toDate(now() - INTERVAL 30 DAY)
        `),
        clickhouseQuery<WeekRow>(`
          SELECT
            toStartOfWeek(s.date)       AS week,
            sum(s.sandwiches)           AS sandwiches,
            uniqMerge(s.unique_bots)    AS active_bots,
            round(sum(s.gross_profit_usd) + sum(s.gross_profit_weth * coalesce(p.price_usd, 2000.0))) AS profit_usd,
            round(sum(s.victim_volume_weth * coalesce(p.price_usd, 2000.0))) AS victim_usd
          FROM blob_lens.mev_daily_stats s
          LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
          WHERE s.date >= toDate(now() - INTERVAL 26 WEEK)
          GROUP BY week
          ORDER BY week ASC
        `),
      ])

      const s = statsRows[0]
      if (!s) return EMPTY

      const swBlocks = N(pctRows[0]?.sw_blocks)
      const totalBlocks = N(pctRows[0]?.total_blocks)
      const blocksSandwichedPct =
        totalBlocks > 0 ? Math.round((swBlocks / totalBlocks) * 1000) / 10 : null

      return {
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
        weekly: weekRows.map((w) => ({
          week: w.week,
          sandwiches: N(w.sandwiches),
          botProfitUsd: N(w.profit_usd),
          victimUsd: N(w.victim_usd),
          activeBots: N(w.active_bots),
        })),
        source: 'BlobLens',
        sourceUrl: 'https://eipsinsight.com',
      }
    } catch {
      // Network/ClickHouse hiccup — /lucid degrades gracefully to no MEV panel.
      return EMPTY
    }
  },
  ['mev-getMempoolMevStats'],
  { revalidate: CACHE_REVALIDATE },
)

export const mevProcedures = {
  getMempoolStats: optionalAuthProcedure.handler(async (): Promise<MempoolMevStats> => {
    return getMempoolMevStatsCached()
  }),
}
