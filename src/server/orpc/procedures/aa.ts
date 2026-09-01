import { optionalAuthProcedure } from './types'
import { unstable_cache } from 'next/cache'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Account Abstraction usage metrics for the /aa dashboard.
 *
 * Data comes from BlobLens' ClickHouse `ethereum.transactions` table (mainnet,
 * from Mar 2024 onward). We measure the two AA mechanisms that are actually live
 * on mainnet:
 *
 *  - EIP-7702 (Set EOA code): transaction type 4, live since Pectra (May 2025).
 *  - ERC-4337 (Account Abstraction via EntryPoint): transactions sent to the
 *    canonical EntryPoint contracts (v0.6 / v0.7 / v0.8). This counts bundler
 *    transactions, a conservative floor versus individual UserOperations (which
 *    would require parsing EntryPoint logs — a later addition).
 *
 * USD-value-transacted is deliberately NOT derived here: AA transactions carry
 * value in inner calls / UserOperations, not the top-level tx `value` (which is
 * usually 0), so a tx.value sum would read as near-zero and mislead. That needs
 * trace / UserOp parsing and is left for a later iteration.
 */

const CACHE_REVALIDATE = 300 // seconds

// Canonical ERC-4337 EntryPoint contracts (lowercased).
const ENTRYPOINTS = [
  '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789', // v0.6
  '0x0000000071727de22e5e9d8baf0edac6f37da032', // v0.7
  '0x4337084d9e255ff0702461cf8895ce9e3b5ff108', // v0.8
]
const EP_SQL = ENTRYPOINTS.map((a) => `'${a}'`).join(',')

// EIP-7702 (transaction type 4) went live with Pectra.
const SEVEN702_START = '2025-05-07'

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

type TotalsRow = { t7702: string; t4337: string; last_day: string }
type WeekRow = {
  week: string
  aa7702: string
  accts7702: string
  total: string
  ep06: string
  ep07: string
  ep08: string
}

export interface AaUsageStats {
  available: boolean
  /** All-time EIP-7702 (type-4) transaction count. */
  total7702: number
  /** All-time ERC-4337 EntryPoint transaction count. */
  total4337: number
  /** Most recent day covered by the data (yyyy-mm-dd) or null. */
  lastDay: string | null
  /** Date EIP-7702 first appeared on mainnet. */
  since7702: string
  /**
   * Weekly series (chronological). Carries every metric derived from one scan:
   * 7702 vs 4337 counts, 7702's share of ALL mainnet txs, unique 7702 accounts,
   * and the ERC-4337 EntryPoint version split (v0.6 / v0.7 / v0.8).
   */
  weekly: Array<{
    week: string
    aa7702: number
    aa4337: number
    accounts7702: number
    /** 7702 as a percent of all mainnet transactions that week. */
    share7702Pct: number
    ep06: number
    ep07: number
    ep08: number
  }>
  source: string
  sourceUrl: string
}

const EMPTY: AaUsageStats = {
  available: false,
  total7702: 0,
  total4337: 0,
  lastDay: null,
  since7702: SEVEN702_START,
  weekly: [],
  source: 'BlobLens · ethereum.transactions (mainnet)',
  sourceUrl: 'https://eipsinsight.com',
}

const getAaUsageStatsCached = unstable_cache(
  async (): Promise<AaUsageStats> => {
    if (!clickhouseConfigured()) return EMPTY
    try {
      const [totalsRows, weekRows] = await Promise.all([
        // Totals are scoped to the EIP-7702 era (Pectra onward) so both numbers
        // cover the SAME period — a fair 7702-vs-4337 comparison — and the scan
        // stays bounded (~5s) rather than reading the full ~1.5B-row table. Give
        // it headroom beyond the 8s default; the result is cached for 5 min.
        clickhouseQuery<TotalsRow>(
          `
          SELECT
            countIf(tx_type = 4)                             AS t7702,
            countIf(lower(to_address) IN (${EP_SQL}))        AS t4337,
            toDate(max(block_timestamp))                     AS last_day
          FROM ethereum.transactions
          WHERE is_deleted = 0
            AND block_timestamp >= '${SEVEN702_START}'
          `,
          { timeoutMs: 15_000 },
        ),
        clickhouseQuery<WeekRow>(`
          SELECT
            toStartOfWeek(block_timestamp)                                                        AS week,
            countIf(tx_type = 4)                                                                  AS aa7702,
            uniqExactIf(from_address, tx_type = 4)                                                AS accts7702,
            count()                                                                               AS total,
            countIf(lower(to_address) = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789')             AS ep06,
            countIf(lower(to_address) = '0x0000000071727de22e5e9d8baf0edac6f37da032')             AS ep07,
            countIf(lower(to_address) = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108')             AS ep08
          FROM ethereum.transactions
          WHERE is_deleted = 0
            AND block_timestamp >= now() - INTERVAL 26 WEEK
          GROUP BY week
          ORDER BY week ASC
        `, { timeoutMs: 15_000 }),
      ])

      const t = totalsRows[0]
      if (!t) return EMPTY

      return {
        available: true,
        total7702: N(t.t7702),
        total4337: N(t.t4337),
        lastDay: t.last_day ?? null,
        since7702: SEVEN702_START,
        weekly: weekRows.map((w) => {
          const ep06 = N(w.ep06)
          const ep07 = N(w.ep07)
          const ep08 = N(w.ep08)
          const aa7702 = N(w.aa7702)
          const total = N(w.total)
          return {
            week: w.week,
            aa7702,
            aa4337: ep06 + ep07 + ep08,
            accounts7702: N(w.accts7702),
            share7702Pct: total > 0 ? Math.round((aa7702 / total) * 10000) / 100 : 0,
            ep06,
            ep07,
            ep08,
          }
        }),
        source: 'BlobLens · ethereum.transactions (mainnet)',
        sourceUrl: 'https://eipsinsight.com',
      }
    } catch {
      // Network / ClickHouse hiccup — /aa degrades gracefully to no-data state.
      return EMPTY
    }
  },
  ['aa-getUsageStats'],
  { revalidate: CACHE_REVALIDATE },
)

export const aaProcedures = {
  getUsageStats: optionalAuthProcedure.handler(async (): Promise<AaUsageStats> => {
    return getAaUsageStatsCached()
  }),
}
