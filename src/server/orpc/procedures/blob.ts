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

/* ──────────────────────────────────────────────────────────────────────────
 * Fee-market health (Gap 2): regime classifier + deterministic congestion
 * forecast. The blob base fee is MIN(=1 wei) * exp(excess_blob_gas /
 * UPDATE_FRACTION); excess evolves as max(0, excess + blob_gas_used - TARGET).
 * UPDATE_FRACTION and TARGET change with BPO forks, so we derive both
 * empirically from recent blocks, then project forward. This makes the forecast
 * self-consistent with the chain's own dynamics (it reproduces the live fee).
 * ──────────────────────────────────────────────────────────────────────── */

export type BlobRegime = 'undersaturated' | 'healthy' | 'congested' | 'spike'

export interface BlobFeeForecastPoint {
  step: number // blocks ahead
  currentRateGwei: number // if throughput continues at the recent rate
  fullRateGwei: number // if every block runs at the blob cap
}

export interface BlobFeeMarket {
  available: boolean
  // Live state
  curFeeGwei: number
  curBlobsPerBlock: number // recent ~32-block average
  curUtilPct: number
  excessBlobGas: number
  targetBlobs: number
  maxBlobs: number
  // Regime
  regime: BlobRegime
  regimeLabel: string
  regimeReason: string
  // Gauge: fee percentile vs the trailing 7-day distribution (0–100)
  feePercentile: number
  // Recent per-block fee/throughput (newest last) for the mini timeline
  recent: Array<{ block: number; t: number; blobs: number; feeGwei: number }>
  // 12-block forecast under current-rate and cap-rate scenarios
  forecast: BlobFeeForecastPoint[]
  updateFraction: number
  source: string
}

const emptyFeeMarket: BlobFeeMarket = {
  available: false,
  curFeeGwei: 0,
  curBlobsPerBlock: 0,
  curUtilPct: 0,
  excessBlobGas: 0,
  targetBlobs: 0,
  maxBlobs: 0,
  regime: 'healthy',
  regimeLabel: 'Unknown',
  regimeReason: '',
  feePercentile: 0,
  recent: [],
  forecast: [],
  updateFraction: 0,
  source: 'BlobLens',
}

const feeMarketCache = { at: 0, data: emptyFeeMarket }
const FEE_MARKET_TTL_MS = 60_000 // 1 min — this is a live view

function classifyRegime(ratio: number, feeRisePct: number): { regime: BlobRegime; label: string; reason: string } {
  // ratio = recent blobs/block ÷ target blobs/block; feeRisePct = % change over the recent window.
  if (ratio > 1.4 || feeRisePct > 60) {
    return {
      regime: 'spike',
      label: 'Spike',
      reason: 'Blocks are running well above target and the blob fee is climbing fast — expect rising DA costs.',
    }
  }
  if (ratio > 1.1) {
    return {
      regime: 'congested',
      label: 'Congested',
      reason: 'Demand is above target, so excess blob gas is accumulating and the blob fee is trending up.',
    }
  }
  if (ratio < 0.8) {
    return {
      regime: 'undersaturated',
      label: 'Undersaturated',
      reason: 'Demand is below target — excess blob gas is draining and the blob fee sits near the floor.',
    }
  }
  return {
    regime: 'healthy',
    label: 'Healthy',
    reason: 'Blob demand is tracking the protocol target; the fee market is stable.',
  }
}

async function getFeeMarket(): Promise<BlobFeeMarket> {
  if (!clickhouseConfigured()) return emptyFeeMarket
  if (Date.now() - feeMarketCache.at < FEE_MARKET_TTL_MS) return feeMarketCache.data

  try {
    const [paramRows, curRows, recentRows, pctRows] = await Promise.all([
      clickhouseQuery<{ update_fraction: number; target_blob_gas: number; max_blobs: number }>(`
        SELECT round(median(update_fraction)) AS update_fraction,
               round(median(target_per_block)) AS target_blob_gas,
               round(median(cap_per_block)) AS max_blobs
        FROM (
          SELECT excess_blob_gas / log(greatest(toFloat64(blob_base_fee), 2)) AS update_fraction,
                 blob_gas_used - (excess_blob_gas - lagInFrame(excess_blob_gas) OVER (ORDER BY block_number)) AS target_per_block,
                 blob_count / nullIf(utilization, 0) AS cap_per_block
          FROM (SELECT block_number, blob_count, blob_gas_used, excess_blob_gas, blob_base_fee, utilization
                FROM blob_lens.block_blob_stats WHERE is_canonical = 1 ORDER BY block_number DESC LIMIT 5000)
          WHERE excess_blob_gas > 0
        )
      `),
      clickhouseQuery<{ bpb32: number; fee32: number; cur_excess: string; cur_fee_gwei: number; cur_util: number; first_fee: number }>(`
        SELECT round(avg(blob_count), 2)                       AS bpb32,
               round(avg(blob_base_fee) / 1e9, 6)              AS fee32,
               argMax(excess_blob_gas, block_number)           AS cur_excess,
               round(argMax(blob_base_fee, block_number) / 1e9, 6) AS cur_fee_gwei,
               round(avg(utilization), 4)                      AS cur_util,
               round(argMin(blob_base_fee, block_number) / 1e9, 6) AS first_fee
        FROM (SELECT * FROM blob_lens.block_blob_stats WHERE is_canonical = 1 ORDER BY block_number DESC LIMIT 32)
      `),
      clickhouseQuery<{ block: string; t: string; blobs: number; fee_gwei: number }>(`
        SELECT block_number AS block, toUnixTimestamp(block_timestamp) AS t, blob_count AS blobs,
               round(blob_base_fee / 1e9, 6) AS fee_gwei
        FROM blob_lens.block_blob_stats WHERE is_canonical = 1
        ORDER BY block_number DESC LIMIT 300
      `),
      clickhouseQuery<{ p: number }>(`
        SELECT round(100 * countIf(blob_base_fee <= (SELECT argMax(blob_base_fee, block_number) FROM blob_lens.block_blob_stats WHERE is_canonical = 1)) / count(), 1) AS p
        FROM blob_lens.block_blob_stats
        WHERE is_canonical = 1 AND block_timestamp >= subtractDays(now(), 7) AND blob_base_fee <= ${FEE_CAP_WEI}
      `),
    ])

    const p = paramRows[0]
    const c = curRows[0]
    if (!p || !c) return emptyFeeMarket

    const updateFraction = N(p.update_fraction) || 11_684_671
    const targetBlobGas = N(p.target_blob_gas) || 393_216
    const targetBlobs = Math.max(1, Math.round((targetBlobGas / GAS_PER_BLOB) * 10) / 10)
    const maxBlobs = N(p.max_blobs) || 6
    const excess = N(c.cur_excess)
    const bpb = N(c.bpb32)
    const ratio = targetBlobGas > 0 ? (bpb * GAS_PER_BLOB) / targetBlobGas : 1
    const feeRisePct = c.first_fee > 0 ? ((c.fee32 - c.first_fee) / c.first_fee) * 100 : 0
    const { regime, label, reason } = classifyRegime(ratio, feeRisePct)

    // Deterministic 12-block forecast: project excess forward under two scenarios.
    const feeFromExcess = (e: number) => Math.exp(e / updateFraction) / 1e9 // gwei
    const project = (ratePerBlock: number): number[] => {
      let e = excess
      const out: number[] = []
      for (let i = 1; i <= 12; i++) {
        e = Math.max(0, e + ratePerBlock * GAS_PER_BLOB - targetBlobGas)
        out.push(feeFromExcess(e))
      }
      return out
    }
    const curTrack = project(bpb)
    const fullTrack = project(maxBlobs)
    const forecast: BlobFeeForecastPoint[] = curTrack.map((_, i) => ({
      step: i + 1,
      currentRateGwei: Math.round(curTrack[i] * 1e6) / 1e6,
      fullRateGwei: Math.round(fullTrack[i] * 1e6) / 1e6,
    }))

    const data: BlobFeeMarket = {
      available: true,
      curFeeGwei: N(c.cur_fee_gwei),
      curBlobsPerBlock: bpb,
      curUtilPct: Math.round(N(c.cur_util) * 1000) / 10,
      excessBlobGas: excess,
      targetBlobs,
      maxBlobs,
      regime,
      regimeLabel: label,
      regimeReason: reason,
      feePercentile: N(pctRows[0]?.p),
      recent: recentRows
        .map((r) => ({ block: N(r.block), t: N(r.t), blobs: N(r.blobs), feeGwei: N(r.fee_gwei) }))
        .reverse(),
      forecast,
      updateFraction,
      source: 'BlobLens',
    }

    feeMarketCache.at = Date.now()
    feeMarketCache.data = data
    return data
  } catch {
    return emptyFeeMarket
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Rollup DA cost-efficiency (Gap 1): a per-rollup leaderboard of real DA usage.
 * Batching efficiency (blobs/tx), DA cost per blob tx, cost per MB of DA, share
 * and data volume — all from blob_transactions (which carries the per-tx blob
 * base fee). The corrupted-fee window is excluded from cost fields.
 * ──────────────────────────────────────────────────────────────────────── */

export interface RollupEfficiency {
  rollup: string
  txs: number
  blobs: number
  blobsPerTx: number
  dataGb: number
  sharePct: number
  totalCostUsd: number
  avgCostPerTxUsd: number
  costPerMbUsd: number
}

export interface BlobRollupEfficiency {
  available: boolean
  rollups: RollupEfficiency[]
  from: string
  to: string
  totalBlobs: number
  totalCostUsd: number
  source: string
}

const emptyRollupEff: BlobRollupEfficiency = {
  available: false,
  rollups: [],
  from: '',
  to: '',
  totalBlobs: 0,
  totalCostUsd: 0,
  source: 'BlobLens',
}

const rollupEffCache = new Map<string, { at: number; data: BlobRollupEfficiency }>()
const MB_PER_BLOB = BYTES_PER_BLOB / 1e6 // 0.131072 MB

async function getRollupEfficiency(range: Range): Promise<BlobRollupEfficiency> {
  if (!clickhouseConfigured()) return emptyRollupEff
  const key = rangeKey(range)
  const hit = rollupEffCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  try {
    const { from, to } = resolveRange(range)
    const cost = `b.num_blobs * ${GAS_PER_BLOB} * b.blob_base_fee / 1e18 * coalesce(p.price_usd, ${FALLBACK_ETH_USD})`
    const feeOk = `b.blob_base_fee <= ${FEE_CAP_WEI}`
    const rows = await clickhouseQuery<{
      rollup: string
      txs: string
      blobs: string
      blobs_per_tx: number
      total_cost_usd: number
      avg_cost_per_tx_usd: number
    }>(`
      SELECT
        \`rollup\`                                    AS rollup,
        count()                                       AS txs,
        sum(b.num_blobs)                              AS blobs,
        round(avg(b.num_blobs), 2)                    AS blobs_per_tx,
        round(sumIf(${cost}, ${feeOk}))               AS total_cost_usd,
        round(avgIf(${cost}, ${feeOk}), 4)            AS avg_cost_per_tx_usd
      FROM blob_lens.blob_transactions b
      LEFT JOIN blob_lens.eth_daily_price p ON toDate(b.block_timestamp) = p.date
      WHERE b.is_canonical = 1
        AND toDate(b.block_timestamp) BETWEEN toDate('${from}') AND toDate('${to}')
      GROUP BY \`rollup\`
      ORDER BY blobs DESC
      LIMIT 25
    `)

    const totalBlobs = rows.reduce((s, r) => s + N(r.blobs), 0)
    const rollups: RollupEfficiency[] = rows
      .map((r) => {
        const blobs = N(r.blobs)
        const totalCostUsd = N(r.total_cost_usd)
        const dataMb = blobs * MB_PER_BLOB
        return {
          rollup: r.rollup || 'Unknown',
          txs: N(r.txs),
          blobs,
          blobsPerTx: N(r.blobs_per_tx),
          dataGb: Math.round((blobs * BYTES_PER_BLOB) / 1e7) / 100,
          sharePct: totalBlobs > 0 ? Math.round((blobs / totalBlobs) * 1000) / 10 : 0,
          totalCostUsd,
          avgCostPerTxUsd: N(r.avg_cost_per_tx_usd),
          costPerMbUsd: dataMb > 0 ? Math.round((totalCostUsd / dataMb) * 10000) / 10000 : 0,
        }
      })
      .filter((r) => r.blobs > 0)

    const data: BlobRollupEfficiency = {
      available: true,
      rollups,
      from,
      to,
      totalBlobs,
      totalCostUsd: rollups.reduce((s, r) => s + r.totalCostUsd, 0),
      source: 'BlobLens',
    }
    rollupEffCache.set(key, { at: Date.now(), data })
    return data
  } catch {
    return emptyRollupEff
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Market-state timeline (historical regime): how the blob fee market moved
 * through undersaturated → healthy → congested → spike over a window. Uses the
 * same economics as the live classifier (blobs/block vs the window's target),
 * so it is consistent with the Fee Market gauge.
 * ──────────────────────────────────────────────────────────────────────── */

export interface RegimeDay {
  date: string
  blobsPerBlock: number
  utilPct: number
  feeGwei: number
  regime: BlobRegime
}
export interface BlobRegimeTimeline {
  available: boolean
  windowDays: number
  targetBlobs: number
  days: RegimeDay[]
  summary: Record<BlobRegime, number> // % of days in each regime
  source: string
}

const emptyRegimeTimeline: BlobRegimeTimeline = {
  available: false,
  windowDays: 0,
  targetBlobs: 0,
  days: [],
  summary: { undersaturated: 0, healthy: 0, congested: 0, spike: 0 },
  source: 'BlobLens',
}

function regimeByRatio(ratio: number): BlobRegime {
  if (ratio > 1.4) return 'spike'
  if (ratio > 1.1) return 'congested'
  if (ratio < 0.8) return 'undersaturated'
  return 'healthy'
}

const regimeTimelineCache = new Map<number, { at: number; data: BlobRegimeTimeline }>()

async function getRegimeTimeline(days: number): Promise<BlobRegimeTimeline> {
  if (!clickhouseConfigured()) return emptyRegimeTimeline
  const d = Math.min(365, Math.max(7, Math.round(days)))
  const hit = regimeTimelineCache.get(d)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  try {
    const [targetRows, dayRows] = await Promise.all([
      clickhouseQuery<{ target_blob_gas: number }>(`
        SELECT round(median(target_per_block)) AS target_blob_gas
        FROM (
          SELECT blob_gas_used - (excess_blob_gas - lagInFrame(excess_blob_gas) OVER (ORDER BY block_number)) AS target_per_block
          FROM blob_lens.block_blob_stats
          WHERE is_canonical = 1 AND block_timestamp >= subtractDays(now(), ${d}) AND excess_blob_gas > 0
        )
      `),
      clickhouseQuery<{ d: string; bpb: number; util: number; fee: number }>(`
        SELECT toDate(block_timestamp) AS d,
               round(avg(blob_count), 3) AS bpb,
               round(avg(utilization) * 100, 1) AS util,
               round(avgIf(blob_base_fee, blob_base_fee <= ${FEE_CAP_WEI}) / 1e9, 6) AS fee
        FROM blob_lens.block_blob_stats
        WHERE is_canonical = 1 AND block_timestamp >= subtractDays(now(), ${d})
        GROUP BY d ORDER BY d ASC
      `),
    ])

    const targetBlobGas = N(targetRows[0]?.target_blob_gas) || 393_216
    const targetBlobs = Math.max(0.1, Math.round((targetBlobGas / GAS_PER_BLOB) * 10) / 10)

    const daysOut: RegimeDay[] = dayRows.map((r) => {
      const bpb = N(r.bpb)
      const ratio = targetBlobGas > 0 ? (bpb * GAS_PER_BLOB) / targetBlobGas : 1
      return { date: r.d, blobsPerBlock: bpb, utilPct: N(r.util), feeGwei: N(r.fee), regime: regimeByRatio(ratio) }
    })

    const counts: Record<BlobRegime, number> = { undersaturated: 0, healthy: 0, congested: 0, spike: 0 }
    for (const day of daysOut) counts[day.regime] += 1
    const total = daysOut.length || 1
    const summary: Record<BlobRegime, number> = {
      undersaturated: Math.round((counts.undersaturated / total) * 1000) / 10,
      healthy: Math.round((counts.healthy / total) * 1000) / 10,
      congested: Math.round((counts.congested / total) * 1000) / 10,
      spike: Math.round((counts.spike / total) * 1000) / 10,
    }

    const data: BlobRegimeTimeline = {
      available: true,
      windowDays: d,
      targetBlobs,
      days: daysOut,
      summary,
      source: 'BlobLens',
    }
    regimeTimelineCache.set(d, { at: Date.now(), data })
    return data
  } catch {
    return emptyRegimeTimeline
  }
}

export const blobProcedures = {
  getOverview: optionalAuthProcedure
    .input(rangeInput)
    .handler(async ({ input }): Promise<BlobOverview> => getBlobOverview(input ?? {})),

  getFeeMarket: optionalAuthProcedure.handler(async (): Promise<BlobFeeMarket> => getFeeMarket()),

  getRollupEfficiency: optionalAuthProcedure
    .input(rangeInput)
    .handler(async ({ input }): Promise<BlobRollupEfficiency> => getRollupEfficiency(input ?? {})),

  getRegimeTimeline: optionalAuthProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(90) }))
    .handler(async ({ input }): Promise<BlobRegimeTimeline> => getRegimeTimeline(input?.days ?? 90)),
}
