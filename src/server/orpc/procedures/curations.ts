import { optionalAuthProcedure, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

async function requireAdmin(context: Ctx) {
  const session = await auth.api.getSession({ headers: context.headers })
  if (!session?.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'You must be logged in' })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || user.role !== 'admin') {
    throw new ORPCError('FORBIDDEN', { message: 'Admin access required' })
  }
  return session
}

const curationPayload = z.object({
  eip_number: z.number().int().positive(),
  layman_title: z.string().trim().max(200).nullish(),
  layman_summary: z.string().trim().max(5000).nullish(),
  benefits: z.array(z.string().trim().min(1).max(500)).max(20).nullish(),
  tradeoffs: z.array(z.string().trim().min(1).max(500)).max(20).nullish(),
  headliner_of: z.string().trim().max(100).nullish(),
  headliner_note: z.string().trim().max(1000).nullish(),
})

function serializeCuration(row: {
  eip_number: number
  layman_title: string | null
  layman_summary: string | null
  benefits: unknown
  tradeoffs: unknown
  stakeholder_impacts: unknown
  north_star: unknown
  headliner_of: string | null
  headliner_note: string | null
  updated_by: string | null
  updated_at: Date
}) {
  return {
    eip_number: row.eip_number,
    layman_title: row.layman_title,
    layman_summary: row.layman_summary,
    benefits: Array.isArray(row.benefits) ? (row.benefits as string[]) : [],
    tradeoffs: Array.isArray(row.tradeoffs) ? (row.tradeoffs as string[]) : [],
    stakeholder_impacts:
      row.stakeholder_impacts && typeof row.stakeholder_impacts === 'object'
        ? (row.stakeholder_impacts as Record<string, { description?: string }>)
        : null,
    north_star:
      row.north_star && typeof row.north_star === 'object'
        ? (row.north_star as Record<string, { description?: string }>)
        : null,
    headliner_of: row.headliner_of,
    headliner_note: row.headliner_note,
    updated_by: row.updated_by,
    updated_at: row.updated_at.toISOString(),
  }
}

export const curationsProcedures = {
  /** Public: curated layman content for a set of EIPs (upgrade pages). */
  getEipCurations: optionalAuthProcedure
    .input(z.object({ eipNumbers: z.array(z.number().int().positive()).max(500) }))
    .handler(async ({ input }) => {
      if (input.eipNumbers.length === 0) return []
      const rows = await prisma.eip_curations.findMany({
        where: { eip_number: { in: input.eipNumbers } },
      })
      return rows.map(serializeCuration)
    }),

  /** Admin: full list for the curation editor. */
  listEipCurations: optionalAuthProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      await requireAdmin(context)
      const rows = await prisma.eip_curations.findMany({
        orderBy: { eip_number: 'asc' },
      })
      return rows.map(serializeCuration)
    }),

  /** Admin: create or update curated content for one EIP. */
  upsertEipCuration: optionalAuthProcedure
    .input(curationPayload)
    .handler(async ({ context, input }) => {
      const session = await requireAdmin(context)
      const data = {
        layman_title: input.layman_title ?? null,
        layman_summary: input.layman_summary ?? null,
        benefits: input.benefits ?? undefined,
        tradeoffs: input.tradeoffs ?? undefined,
        headliner_of: input.headliner_of?.toLowerCase() ?? null,
        headliner_note: input.headliner_note ?? null,
        updated_by: session.user.email ?? session.user.id,
      }
      const row = await prisma.eip_curations.upsert({
        where: { eip_number: input.eip_number },
        create: { eip_number: input.eip_number, ...data },
        update: data,
      })
      return serializeCuration(row)
    }),

  /** Admin: remove curated content for an EIP. */
  deleteEipCuration: optionalAuthProcedure
    .input(z.object({ eip_number: z.number().int().positive() }))
    .handler(async ({ context, input }) => {
      await requireAdmin(context)
      await prisma.eip_curations.delete({
        where: { eip_number: input.eip_number },
      }).catch(() => {
        throw new ORPCError('NOT_FOUND', { message: `No curation for EIP-${input.eip_number}` })
      })
      return { deleted: input.eip_number }
    }),
}
