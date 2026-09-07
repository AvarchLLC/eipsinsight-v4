import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Network-wide mainnet transaction metrics for the animated "mempool tx race".
 *
 * Data comes from BlobLens' ClickHouse `ethereum.transactions` table. We break
 * every mainnet transaction down by its type (the EIP that introduced it) over a
 * recent rolling window, so the UI can show how much of today's traffic each
 * transaction format carries — EIP-1559 dynamic-fee, legacy, EIP-4844 blob,
 * EIP-7702 set-code, EIP-2930 access-list.
 */

const CACHE_TTL_MS = 300_000 // 5 min

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// tx_type -> { label, eip, sub }. Ordered how we want them presented.
const TX_TYPES: Record<number, { label: string; sub: string }> = {
  2: { label: 'EIP-1559', sub: 'Dynamic fee · type 2' },
  0: { label: 'Legacy', sub: 'Pre-1559 · type 0' },
  4: { label: 'EIP-7702', sub: 'Set EOA code · type 4' },
  3: { label: 'EIP-4844', sub: 'Blob-carrying · type 3' },
  1: { label: 'EIP-2930', sub: 'Access list · type 1' },
}

export interface TxTypeMix {
  available: boolean
  windowDays: number
  total: number
  lastDay: string | null
  types: Array<{ txType: number; label: string; sub: string; count: number }>
  source: string
}

type MixRow = { tx_type: number; c: string; last_day: string }

const cache = new Map<number, { at: number; data: TxTypeMix }>()

const empty = (windowDays: number): TxTypeMix => ({
  available: false,
  windowDays,
  total: 0,
  lastDay: null,
  types: [],
  source: 'BlobLens · ethereum.transactions (mainnet)',
})

async function queryTxTypeMix(windowDays: number): Promise<TxTypeMix> {
  const rows = await clickhouseQuery<MixRow>(
    `
    SELECT
      tx_type                       AS tx_type,
      count()                       AS c,
      toDate(max(block_timestamp))  AS last_day
    FROM ethereum.transactions
    WHERE is_deleted = 0
      AND block_timestamp >= today() - ${windowDays}
    GROUP BY tx_type
    ORDER BY c DESC
    `,
    { timeoutMs: 15_000 },
  )
  if (!rows.length) throw new Error('tx type mix: empty')
  let total = 0
  let lastDay: string | null = null
  const types = rows
    .map((r) => {
      const txType = N(r.tx_type)
      const count = N(r.c)
      total += count
      if (r.last_day && (!lastDay || r.last_day > lastDay)) lastDay = r.last_day
      const meta = TX_TYPES[txType] ?? { label: `Type ${txType}`, sub: `tx_type ${txType}` }
      return { txType, label: meta.label, sub: meta.sub, count }
    })
    .filter((t) => t.count > 0)
  return {
    available: true,
    windowDays,
    total,
    lastDay,
    types,
    source: 'BlobLens · ethereum.transactions (mainnet)',
  }
}

async function getTxTypeMix(windowDays: number): Promise<TxTypeMix> {
  if (!clickhouseConfigured()) return empty(windowDays)
  const hit = cache.get(windowDays)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  try {
    const data = await queryTxTypeMix(windowDays)
    cache.set(windowDays, { at: Date.now(), data })
    return data
  } catch {
    return hit?.data ?? empty(windowDays)
  }
}

// ── Monthly series by tx type (for the animated line race) ──
export interface TxTypeSeries {
  available: boolean
  months: number
  /** Ascending list of month buckets, e.g. "2025-01". */
  buckets: string[]
  /** Per-type monthly counts, aligned to `buckets` (0 where absent). */
  series: Array<{ txType: number; label: string; sub: string; counts: number[] }>
  source: string
}

type SeriesRow = { m: string; tx_type: number; c: string }

const seriesCache = new Map<number, { at: number; data: TxTypeSeries }>()

const emptySeries = (months: number): TxTypeSeries => ({
  available: false,
  months,
  buckets: [],
  series: [],
  source: 'BlobLens · ethereum.transactions (mainnet)',
})

async function queryTxTypeSeries(months: number): Promise<TxTypeSeries> {
  const rows = await clickhouseQuery<SeriesRow>(
    `
    SELECT
      toStartOfMonth(block_timestamp) AS m,
      tx_type                         AS tx_type,
      count()                         AS c
    FROM ethereum.transactions
    WHERE is_deleted = 0
      AND block_timestamp >= toStartOfMonth(today()) - INTERVAL ${months - 1} MONTH
    GROUP BY m, tx_type
    ORDER BY m ASC, tx_type ASC
    `,
    { timeoutMs: 20_000 },
  )
  if (!rows.length) throw new Error('tx type series: empty')
  const buckets: string[] = []
  const bucketIdx = new Map<string, number>()
  for (const r of rows) {
    const b = r.m.slice(0, 7) // YYYY-MM
    if (!bucketIdx.has(b)) {
      bucketIdx.set(b, buckets.length)
      buckets.push(b)
    }
  }
  const byType = new Map<number, number[]>()
  for (const r of rows) {
    const t = N(r.tx_type)
    const arr = byType.get(t) ?? new Array(buckets.length).fill(0)
    arr[bucketIdx.get(r.m.slice(0, 7))!] = N(r.c)
    byType.set(t, arr)
  }
  const series = [...byType.entries()]
    .map(([txType, counts]) => {
      const meta = TX_TYPES[txType] ?? { label: `Type ${txType}`, sub: `tx_type ${txType}` }
      return { txType, label: meta.label, sub: meta.sub, counts }
    })
    // Present biggest cumulative footprint first.
    .sort((a, b) => b.counts.reduce((x, y) => x + y, 0) - a.counts.reduce((x, y) => x + y, 0))
  return { available: true, months, buckets, series, source: 'BlobLens · ethereum.transactions (mainnet)' }
}

async function getTxTypeSeries(months: number): Promise<TxTypeSeries> {
  if (!clickhouseConfigured()) return emptySeries(months)
  const hit = seriesCache.get(months)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  try {
    const data = await queryTxTypeSeries(months)
    seriesCache.set(months, { at: Date.now(), data })
    return data
  } catch {
    return hit?.data ?? emptySeries(months)
  }
}

export const networkProcedures = {
  getTxTypeMix: optionalAuthProcedure
    .input(z.object({ windowDays: z.number().int().min(1).max(365).default(30) }))
    .handler(async ({ input }): Promise<TxTypeMix> => getTxTypeMix(input.windowDays)),

  getTxTypeSeries: optionalAuthProcedure
    .input(z.object({ months: z.number().int().min(3).max(48).default(24) }))
    .handler(async ({ input }): Promise<TxTypeSeries> => getTxTypeSeries(input.months)),
}
