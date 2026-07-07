import { optionalAuthProcedure } from './types'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import * as z from 'zod'

/**
 * Protocol calls (ACDE/ACDC/ACDT/breakouts). Tables are populated by the
 * scheduler from the ethereum/pm ACDbot manifest + open agenda issues.
 */
export const callsProcedures = {
  listRecentCalls: optionalAuthProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).optional().default(20),
      series: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.protocol_calls.findMany({
        where: input.series ? { series: input.series } : undefined,
        orderBy: [{ occurred_on: 'desc' }, { call_number: 'desc' }],
        take: input.limit,
      })
      return rows.map(row => ({
        series: row.series,
        call_id: row.call_id,
        call_number: row.call_number,
        occurred_on: row.occurred_on.toISOString().slice(0, 10),
        issue_number: row.issue_number,
        video_url: row.video_url,
        has_transcript: row.has_transcript,
        display_name: row.display_name,
        tldr: row.tldr ?? null,
      }))
    }),

  /** Calls with structured key decisions, newest first (decisions feed). */
  listRecentDecisions: optionalAuthProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).optional().default(12),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.protocol_calls.findMany({
        where: { key_decisions: { not: Prisma.AnyNull } },
        orderBy: { occurred_on: 'desc' },
        take: input.limit,
        select: {
          series: true,
          call_id: true,
          call_number: true,
          occurred_on: true,
          issue_number: true,
          video_url: true,
          display_name: true,
          key_decisions: true,
        },
      })
      return rows.map(row => ({
        series: row.series,
        call_id: row.call_id,
        call_number: row.call_number,
        occurred_on: row.occurred_on.toISOString().slice(0, 10),
        issue_number: row.issue_number,
        video_url: row.video_url,
        display_name: row.display_name,
        key_decisions: row.key_decisions,
      }))
    }),

  listUpcomingCalls: optionalAuthProcedure
    .input(z.object({}))
    .handler(async () => {
      const cutoff = new Date()
      cutoff.setUTCDate(cutoff.getUTCDate() - 1)
      const rows = await prisma.protocol_calls_upcoming.findMany({
        where: {
          OR: [
            { occurs_on: null },
            { occurs_on: { gte: cutoff } },
          ],
        },
        orderBy: [{ occurs_on: 'asc' }, { occurs_at: 'asc' }],
        take: 30,
      })
      return rows.map(row => ({
        series: row.series,
        title: row.title,
        occurs_at: row.occurs_at?.toISOString() ?? null,
        occurs_on: row.occurs_on?.toISOString().slice(0, 10) ?? null,
        call_number: row.call_number,
        issue_number: row.issue_number,
        issue_url: row.issue_url,
      }))
    }),
}
