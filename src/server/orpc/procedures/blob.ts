import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Blob data-layer metrics for the /blobs page.
 *
 * Data comes from BlobLens' ClickHouse `blob_lens` database — the same index
 * that powers BlobLens' DA dashboards, but queried for real here (BlobLens' own
 * /da-insights route is mostly synthetic). Coverage runs from the Dencun
 * activation (EIP-4844, 2024-03-13) to head.
 *
 * Tables:
 *  - block_blob_stats  — per-canonical-block blob_count / blob_base_fee /
 *    excess_blob_gas / utilization. The fee-market + throughput spine.
 *  - blob_transactions — per blob tx with a `rollup` label (56 distinct), used
 *    for the rollup leaderboard and DA-share breakdown.
 *  - eth_daily_price   — ETH/USD by day, to price blob DA spend.
 *
 * GOTCHA: `rollup` is a column name here but also ClickHouse's GROUP BY ROLLUP
 * modifier — it MUST be back-ticked everywhere (`rollup`) or the query 500s.
 * One blob = GAS_PER_BLOB (2^17 = 131072) blob-gas and 131072 bytes of data.
 */

const CACHE_TTL_MS = 300_000 // 5 min
const GAS_PER_BLOB = 131072 // 2^17 blob-gas per blob
const BYTES_PER_BLOB = 131072
const DATA_FLOOR = '2024-03-13' // Dencun / EIP-4844 activation
const FALLBACK_ETH_USD = 3000

// Fee-data sanity filter. The BlobLens `block_blob_stats.blob_base_fee` column
// has a corrupted window (≈ Jan–Mar 2026, ~10% of rows) with astronomical values
// (up to ~1e22 wei), which otherwise poison fee/cost aggregates (avg fee → 2e8
// gwei, DA spend → quadrillions). A real blob base fee has never meaningfully
// exceeded a few hundred gwei, so we EXCLUDE rows above 100 gwei from fee/cost
// aggregations (throughput + utilization stay over all rows). Those months' real
// fees were negligible anyway, so this barely changes true totals: all-time DA
// spend lands at ~$28M and avg fee at ~2.5 gwei.
const FEE_CAP_WEI = 100_000_000_000 // 100 gwei
const FEE_OK = `b.blob_base_fee <= ${FEE_CAP_WEI}`

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// Per-blob USD cost from the wei-per-blob-gas base fee and a day-joined ETH price.
const COST_USD_PER_BLOB = `(b.blob_base_fee * ${GAS_PER_BLOB} / 1e18 * coalesce(p.price_usd, ${FALLBACK_ETH_USD}))`

export type BlobGranularity = 'day' | 'week' | 'month'

export interface BlobSeriesPoint {
  bucket: string
  blobs: number
  feeGwei: number
  utilPct: number
  blobsPerBlock: number
  costUsdPerBlob: number
}

export interface BlobRollup {
  rollup: string
  blobs: number
  txs: number
  sharePct: number
  dataGb: number
}

export interface BlobOverview {
  available: boolean
  // KPIs over the selected window
  totalBlobs: number
  totalDataGb: number
  totalDaSpendUsd: number
  avgBlobsPerBlock: number
  avgFeeGwei: number
  avgUtilPct: number
  blobTxCount: number
  rollupCount: number
  // Live-ish snapshot (last 24h)
  nowFeeGwei: number
  nowBlobsPerBlock: number
  nowUtilPct: number
  // Trend + breakdown
  granularity: BlobGranularity
  series: BlobSeriesPoint[]
  rollups: BlobRollup[]
  // Window + dataset bounds
  from: string
  to: string
  dataMin: string
  dataMax: string
  source: string
}

const EMPTY: BlobOverview = {
  available: false,
  totalBlobs: 0,
  totalDataGb: 0,
  totalDaSpendUsd: 0,
  avgBlobsPerBlock: 0,
  avgFeeGwei: 0,
  avgUtilPct: 0,
  blobTxCount: 0,
  rollupCount: 0,
  nowFeeGwei: 0,
  nowBlobsPerBlock: 0,
  nowUtilPct: 0,
  granularity: 'week',
  series: [],
  rollups: [],
  from: '',
  to: '',
  dataMin: DATA_FLOOR,
  dataMax: '',
  source: 'BlobLens',
}

type Range = { months?: number; from?: string; to?: string }

function resolveRange({ months = 1, from, to }: Range): {
  from: string
  to: string
  granularity: BlobGranularity
  bucketFn: string
} {
  const today = new Date().toISOString().slice(0, 10)
  const toDay = to ? to.slice(0, 10) : today
  let fromDay: string
  if (from) {
    fromDay = from.slice(0, 10)
  } else {
    const d = new Date(`${toDay}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - months)
    fromDay = d.toISOString().slice(0, 10)
  }
  if (fromDay < DATA_FLOOR) fromDay = DATA_FLOOR

  const spanDays = Math.max(
    1,
    (Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000,
  )
  const granularity: BlobGranularity = spanDays <= 92 ? 'day' : spanDays <= 400 ? 'week' : 'month'
  const bucketFn =
    granularity === 'day'
      ? 'toDate(b.block_timestamp)'
      : granularity === 'week'
        ? 'toStartOfWeek(b.block_timestamp)'
        : 'toStartOfMonth(b.block_timestamp)'
  return { from: fromDay, to: toDay, granularity, bucketFn }
}

const rangeKey = (r: Range): string => `${r.months ?? ''}|${r.from ?? ''}|${r.to ?? ''}`
const cache = new Map<string, { at: number; data: BlobOverview }>()

async function getBlobOverview(range: Range): Promise<BlobOverview> {
  if (!clickhouseConfigured()) return EMPTY

  const key = rangeKey(range)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  try {
    const { from, to, granularity, bucketFn } = resolveRange(range)
    const win = `toDate(b.block_timestamp) BETWEEN toDate('${from}') AND toDate('${to}')`

    const [kpiRows, nowRows, seriesRows, rollupRows, boundsRows] = await Promise.all([
      clickhouseQuery<{
        total_blobs: string
        avg_bpb: number
        avg_fee_gwei: number
        avg_util_pct: number
        blocks: string
        da_spend_usd: number
      }>(`
        SELECT
          sum(b.blob_count)                                          AS total_blobs,
          round(avg(b.blob_count), 2)                                AS avg_bpb,
          round(avgIf(b.blob_base_fee, ${FEE_OK}) / 1e9, 6)          AS avg_fee_gwei,
          round(avg(b.utilization) * 100, 1)                         AS avg_util_pct,
          count()                                                    AS blocks,
          round(sumIf(${COST_USD_PER_BLOB} * b.blob_count, ${FEE_OK})) AS da_spend_usd
        FROM blob_lens.block_blob_stats b
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(b.block_timestamp) = p.date
        WHERE b.is_canonical = 1 AND ${win}
      `),
      clickhouseQuery<{ fee_gwei: number; bpb: number; util_pct: number }>(`
        SELECT
          round(avgIf(b.blob_base_fee, ${FEE_OK}) / 1e9, 6) AS fee_gwei,
          round(avg(b.blob_count), 2)                       AS bpb,
          round(avg(b.utilization) * 100, 1)                AS util_pct
        FROM blob_lens.block_blob_stats b
        WHERE b.is_canonical = 1 AND b.block_timestamp >= subtractHours(now(), 24)
      `),
      clickhouseQuery<{
        bucket: string
        blobs: string
        fee_gwei: number
        util_pct: number
        blobs_per_block: number
        cost_usd_per_blob: number
      }>(`
        SELECT
          ${bucketFn}                                       AS bucket,
          sum(b.blob_count)                                 AS blobs,
          round(avgIf(b.blob_base_fee, ${FEE_OK}) / 1e9, 6) AS fee_gwei,
          round(avg(b.utilization) * 100, 1)                AS util_pct,
          round(avg(b.blob_count), 2)                       AS blobs_per_block,
          round(avgIf(${COST_USD_PER_BLOB}, ${FEE_OK}), 4)  AS cost_usd_per_blob
        FROM blob_lens.block_blob_stats b
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(b.block_timestamp) = p.date
        WHERE b.is_canonical = 1 AND ${win}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
      clickhouseQuery<{ rollup: string; blobs: string; txs: string }>(`
        SELECT
          \`rollup\`         AS rollup,
          sum(b.num_blobs)  AS blobs,
          count()           AS txs
        FROM blob_lens.blob_transactions b
        WHERE b.is_canonical = 1
          AND toDate(b.block_timestamp) BETWEEN toDate('${from}') AND toDate('${to}')
        GROUP BY \`rollup\`
        ORDER BY blobs DESC
        LIMIT 20
      `),
      clickhouseQuery<{ min_date: string; max_date: string }>(`
        SELECT toDate(min(block_timestamp)) AS min_date, toDate(max(block_timestamp)) AS max_date
        FROM blob_lens.block_blob_stats WHERE is_canonical = 1
      `),
    ])

    const k = kpiRows[0]
    if (!k) return EMPTY

    const totalBlobs = N(k.total_blobs)
    const totalBlobTxs = rollupRows.reduce((s, r) => s + N(r.txs), 0)
    const rollups: BlobRollup[] = rollupRows
      .map((r) => {
        const blobs = N(r.blobs)
        return {
          rollup: r.rollup || 'Unknown',
          blobs,
          txs: N(r.txs),
          sharePct: totalBlobs > 0 ? Math.round((blobs / totalBlobs) * 1000) / 10 : 0,
          dataGb: Math.round((blobs * BYTES_PER_BLOB) / 1e7) / 100,
        }
      })
      .filter((r) => r.blobs > 0)

    const data: BlobOverview = {
      available: true,
      totalBlobs,
      totalDataGb: Math.round((totalBlobs * BYTES_PER_BLOB) / 1e7) / 100,
      totalDaSpendUsd: N(k.da_spend_usd),
      avgBlobsPerBlock: N(k.avg_bpb),
      avgFeeGwei: N(k.avg_fee_gwei),
      avgUtilPct: N(k.avg_util_pct),
      blobTxCount: totalBlobTxs,
      rollupCount: rollups.length,
      nowFeeGwei: N(nowRows[0]?.fee_gwei),
      nowBlobsPerBlock: N(nowRows[0]?.bpb),
      nowUtilPct: N(nowRows[0]?.util_pct),
      granularity,
      series: seriesRows.map((s) => ({
        bucket: s.bucket,
        blobs: N(s.blobs),
        feeGwei: N(s.fee_gwei),
        utilPct: N(s.util_pct),
        blobsPerBlock: N(s.blobs_per_block),
        costUsdPerBlob: N(s.cost_usd_per_blob),
      })),
      rollups,
      from,
      to,
      dataMin: boundsRows[0]?.min_date || DATA_FLOOR,
      dataMax: boundsRows[0]?.max_date || to,
      source: 'BlobLens',
    }

    cache.set(key, { at: Date.now(), data })
    return data
  } catch {
    // ClickHouse hiccup — /blobs degrades gracefully to an unavailable state.
    return EMPTY
  }
}

const YMD = /^\d{4}-\d{2}(-\d{2})?$/
const rangeInput = z
  .object({
    months: z.number().int().min(1).max(60).default(1),
    from: z.string().regex(YMD).optional(),
    to: z.string().regex(YMD).optional(),
  })
  .optional()

export const blobProcedures = {
  getOverview: optionalAuthProcedure
    .input(rangeInput)
    .handler(async ({ input }): Promise<BlobOverview> => getBlobOverview(input ?? {})),
}
