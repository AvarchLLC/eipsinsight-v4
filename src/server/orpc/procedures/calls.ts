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
      limit: z.number().int().min(1).max(300).optional().default(20),
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
      limit: z.number().int().min(1).max(300).optional().default(12),
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
      // Start of today (UTC). Anything before today has already happened and
      // should drop out of "upcoming" even if its agenda issue is still open.
      const cutoff = new Date()
      cutoff.setUTCHours(0, 0, 0, 0)
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

  getCall: optionalAuthProcedure
    .input(z.object({
      series: z.string(),
      number: z.string(),
    }))
    .handler(async ({ input }) => {
      const parsedNumber = Number(input.number)
      const possibleNumbers = [
        input.number,
        input.number.padStart(3, '0'),
      ]
      if (!isNaN(parsedNumber)) {
        possibleNumbers.push(String(parsedNumber))
      }

      const row = await prisma.protocol_calls.findFirst({
        where: {
          series: input.series,
          OR: [
            { call_number: { in: possibleNumbers } },
            { call_id: input.number },
          ],
        },
      })

      if (!row) return null

      return {
        series: row.series,
        call_id: row.call_id,
        call_number: row.call_number,
        occurred_on: row.occurred_on.toISOString().slice(0, 10),
        display_name: row.display_name,
        issue_number: row.issue_number,
        video_url: row.video_url,
        has_transcript: row.has_transcript,
        has_chat: row.has_chat,
        tldr: row.tldr ?? null,
        key_decisions: row.key_decisions ?? null,
      }
    }),

  /** Previous / next call in the same series, by date. */
  getCallNeighbors: optionalAuthProcedure
    .input(z.object({ series: z.string(), occurredOn: z.string() }))
    .handler(async ({ input }) => {
      const on = new Date(input.occurredOn)
      const [prev, next] = await Promise.all([
        prisma.protocol_calls.findFirst({
          where: { series: input.series, occurred_on: { lt: on } },
          orderBy: { occurred_on: 'desc' },
          select: { series: true, call_number: true, call_id: true, display_name: true },
        }),
        prisma.protocol_calls.findFirst({
          where: { series: input.series, occurred_on: { gt: on } },
          orderBy: { occurred_on: 'asc' },
          select: { series: true, call_number: true, call_id: true, display_name: true },
        }),
      ])
      const shape = (r: typeof prev) =>
        r ? { series: r.series, number: r.call_number ?? r.call_id, name: r.display_name } : null
      return { prev: shape(prev), next: shape(next) }
    }),
}
