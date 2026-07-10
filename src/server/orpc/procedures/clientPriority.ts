import { optionalAuthProcedure, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

/**
 * Per-upgrade client-team prioritization. Owned + editable (not a static
 * file); one row per fork holding [{ eipId, stances: [...] }].
 */

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

const stanceSchema = z.object({
  clientName: z.string().trim().min(1).max(60),
  clientType: z.enum(['EL', 'CL']),
  ratingSystem: z.string().trim().max(60).default('custom'),
  rawRating: z.string().trim().max(60),
  normalizedScore: z.number().int().min(0).max(5).nullable(),
  comment: z.string().trim().max(1000).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
})

export interface ClientStance {
  clientName: string
  clientType: 'EL' | 'CL'
  ratingSystem: string
  rawRating: string
  normalizedScore: number | null
  comment?: string
  sourceUrl?: string
}

interface EipStances {
  eipId: number
  stances: ClientStance[]
}

function asEips(value: unknown): EipStances[] {
  return Array.isArray(value) ? (value as EipStances[]) : []
}

export const clientPriorityProcedures = {
  /** Public: full prioritization dataset for one fork. */
  getClientPriority: optionalAuthProcedure
    .input(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) }))
    .handler(async ({ input }) => {
      const row = await prisma.upgrade_client_priority.findUnique({
        where: { fork_slug: input.slug },
      })
      if (!row) return null
      return {
        fork: row.fork_slug,
        lastUpdated: row.last_updated,
        eips: asEips(row.eips),
        updated_by: row.updated_by,
        updated_at: row.updated_at.toISOString(),
      }
    }),

  /** Admin: which forks have prioritization data. */
  listClientPriorityForks: optionalAuthProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
      await requireAdmin(context)
      const rows = await prisma.upgrade_client_priority.findMany({
        orderBy: { fork_slug: 'asc' },
      })
      return rows.map(row => ({
        fork_slug: row.fork_slug,
        last_updated: row.last_updated,
        eip_count: asEips(row.eips).length,
        updated_by: row.updated_by,
        updated_at: row.updated_at.toISOString(),
      }))
    }),

  /** Admin: replace the stances for one EIP within a fork (upsert the EIP). */
  upsertClientPriorityEip: optionalAuthProcedure
    .input(z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      eipId: z.number().int().positive(),
      stances: z.array(stanceSchema).max(30),
    }))
    .handler(async ({ context, input }) => {
      const session = await requireAdmin(context)
      const row = await prisma.upgrade_client_priority.findUnique({
        where: { fork_slug: input.slug },
      })
      const eips = asEips(row?.eips)
      const next = eips.filter(e => e.eipId !== input.eipId)
      next.push({ eipId: input.eipId, stances: input.stances as ClientStance[] })
      next.sort((a, b) => a.eipId - b.eipId)

      const actor = session.user.email ?? session.user.id
      const today = new Date().toISOString().slice(0, 10)
      await prisma.upgrade_client_priority.upsert({
        where: { fork_slug: input.slug },
        create: { fork_slug: input.slug, last_updated: today, eips: next as object, updated_by: actor },
        update: { last_updated: today, eips: next as object, updated_by: actor },
      })
      return { eipId: input.eipId, stanceCount: input.stances.length }
    }),

  /** Admin: remove an EIP's stances from a fork. */
  deleteClientPriorityEip: optionalAuthProcedure
    .input(z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      eipId: z.number().int().positive(),
    }))
    .handler(async ({ context, input }) => {
      const session = await requireAdmin(context)
      const row = await prisma.upgrade_client_priority.findUnique({
        where: { fork_slug: input.slug },
      })
      if (!row) throw new ORPCError('NOT_FOUND', { message: `No prioritization for ${input.slug}` })
      const next = asEips(row.eips).filter(e => e.eipId !== input.eipId)
      await prisma.upgrade_client_priority.update({
        where: { fork_slug: input.slug },
        data: {
          eips: next as object,
          updated_by: session.user.email ?? session.user.id,
        },
      })
      return { deleted: input.eipId }
    }),
}
