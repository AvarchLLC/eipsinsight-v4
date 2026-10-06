import { optionalAuthProcedure } from './types'
import { prisma } from '@/lib/prisma'
import { PQ_EIPS } from '@/data/pq-registry'

/**
 * Live EIP status for the Post-Quantum registry. The /pq pages carry curated
 * status snapshots; this enriches them with the current status from the indexed
 * EIP repository so the registry stays accurate without manual edits.
 */
export interface PqLiveStatus {
  number: number
  status: string | null
  title: string | null
}

let cache: { at: number; data: Record<number, PqLiveStatus> } | null = null
const TTL_MS = 300_000

export const pqProcedures = {
  getLiveStatuses: optionalAuthProcedure.handler(async (): Promise<Record<number, PqLiveStatus>> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data
    const numbers = PQ_EIPS.map((e) => e.number).filter((n) => Number.isInteger(n))
    if (!numbers.length) return {}
    try {
      // numbers come from our own static registry — safe to inline.
      const rows = await prisma.$queryRawUnsafe<Array<{ number: number | string; status: string | null; title: string | null }>>(
        `SELECT e.eip_number AS number, s.status, e.title
         FROM eips e
         JOIN eip_snapshots s ON s.eip_id = e.id
         WHERE e.eip_number IN (${numbers.join(',')})`,
      )
      const map: Record<number, PqLiveStatus> = {}
      for (const r of rows) {
        const n = Number(r.number)
        // One row per EIP; keep the first (PQ EIPs live in the EIPs repo).
        if (!(n in map)) map[n] = { number: n, status: r.status, title: r.title }
      }
      cache = { at: Date.now(), data: map }
      return map
    } catch {
      return {}
    }
  }),
}
