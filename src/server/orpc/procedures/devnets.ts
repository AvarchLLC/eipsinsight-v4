import { optionalAuthProcedure, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

/**
 * Devnet specs, scraped by the scheduler from ethpandaops HackMD notes and
 * enriched with live status from cartographoor.
 */

export interface DevnetEip {
  number: number
  title: string
  status: string | null
  url: string
}

export interface DevnetClientSupport {
  clients: string[]
  matrix: Array<{ eipNumber: number; label: string; support: Record<string, string> }>
}

function asJson<T>(value: unknown, fallback: T): T {
  return value == null ? fallback : (value as T)
}

export const devnetsProcedures = {
  listDevnets: optionalAuthProcedure
    .input(z.object({ series: z.string().optional() }))
    .handler(async ({ input }) => {
      const rows = await prisma.devnet_specs.findMany({
        where: input.series ? { series: input.series } : undefined,
        orderBy: [{ series: 'asc' }, { devnet_number: 'desc' }],
        select: {
          id: true,
          series: true,
          devnet_number: true,
          title: true,
          source_url: true,
          genesis_time: true,
          active: true,
          canceled: true,
          same_spec_as: true,
          eips: true,
          scraped_at: true,
        },
      })
      return rows.map(row => ({
        id: row.id,
        series: row.series,
        devnet_number: row.devnet_number,
        title: row.title,
        source_url: row.source_url,
        genesis_time: row.genesis_time != null ? Number(row.genesis_time) : null,
        active: row.active,
        canceled: row.canceled,
        same_spec_as: row.same_spec_as,
        eip_count: Array.isArray(row.eips) ? (row.eips as unknown[]).length : 0,
        scraped_at: row.scraped_at?.toISOString() ?? null,
      }))
    }),

  /** EIP-inclusion matrix data for a set of devnet series (one fork). */
  getSeriesEipMatrix: optionalAuthProcedure
    .input(z.object({ series: z.array(z.string()).min(1).max(10) }))
    .handler(async ({ input }) => {
      const rows = await prisma.devnet_specs.findMany({
        where: { series: { in: input.series } },
        orderBy: [{ series: 'asc' }, { devnet_number: 'asc' }],
        select: {
          id: true,
          series: true,
          devnet_number: true,
          active: true,
          genesis_time: true,
          same_spec_as: true,
          eips: true,
        },
      })
      const eipsById = new Map(rows.map(row => [row.id, asJson<DevnetEip[]>(row.eips, [])]))
      return rows.map(row => {
        // sameSpecAs devnets inherit the referenced devnet's EIP list.
        const ownEips = asJson<DevnetEip[]>(row.eips, [])
        const eips = ownEips.length > 0
          ? ownEips
          : row.same_spec_as
            ? (eipsById.get(row.same_spec_as) ?? [])
            : []
        return {
          id: row.id,
          series: row.series,
          devnet_number: row.devnet_number,
          active: row.active,
          genesis_time: row.genesis_time != null ? Number(row.genesis_time) : null,
          eips: eips.map(eip => ({ number: eip.number, status: eip.status ?? null })),
        }
      })
    }),

  getDevnet: optionalAuthProcedure
    .input(z.object({ id: z.string().regex(/^[a-z0-9-]+$/) }))
    .handler(async ({ input }) => {
      const row = await prisma.devnet_specs.findUnique({ where: { id: input.id } })
      if (!row) {
        throw new ORPCError('NOT_FOUND', { message: `Devnet ${input.id} not found` })
      }
      return {
        id: row.id,
        series: row.series,
        devnet_number: row.devnet_number,
        title: row.title,
        source_url: row.source_url,
        genesis_time: row.genesis_time != null ? Number(row.genesis_time) : null,
        active: row.active,
        canceled: row.canceled,
        same_spec_as: row.same_spec_as,
        announcements: asJson<string[]>(row.announcements, []),
        eips: asJson<DevnetEip[]>(row.eips, []),
        el_client_support: asJson<DevnetClientSupport>(row.el_client_support, { clients: [], matrix: [] }),
        cl_client_support: asJson<DevnetClientSupport>(row.cl_client_support, { clients: [], matrix: [] }),
        spec_references: asJson<Record<string, { version?: string; url?: string } | null> | null>(
          row.spec_references,
          null
        ),
        scraped_at: row.scraped_at?.toISOString() ?? null,
      }
    }),
}
