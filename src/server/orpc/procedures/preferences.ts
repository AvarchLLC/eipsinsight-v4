import { os, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'
import { PERSONA_LIST } from '@/lib/persona'

// Schema for persona validation
const personaSchema = z.enum(['developer', 'editor', 'researcher', 'builder', 'enterprise', 'newcomer'])

// Schema for default view
const defaultViewSchema = z.object({
  upgradesView: z.string().optional(),
  analyticsView: z.string().optional(),
  standardsView: z.string().optional(),
}).optional()

export const preferencesProcedures = {
  /**
   * Get user preferences
   * Returns null if no preferences exist
   */
  get: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await auth.api.getSession({ headers: context.headers })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const preferences = await prisma.user_preferences.findUnique({
        where: { user_id: session.user.id },
      })

      if (!preferences) {
        return null
      }

      return {
        persona: preferences.persona,
        default_view: preferences.default_view as Record<string, string> | null,
        created_at: preferences.created_at,
        updated_at: preferences.updated_at,
      }
    }),

  /**
   * Update user preferences
   * Creates preferences if they don't exist (upsert)
   */
  update: os
    .$context<Ctx>()
    .input(
      z.object({
        persona: personaSchema.optional(),
        default_view: defaultViewSchema,
      }),
    )
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: context.headers })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const preferences = await prisma.user_preferences.upsert({
        where: { user_id: session.user.id },
        create: {
          user_id: session.user.id,
          persona: input.persona ?? null,
          // For JSON columns, use undefined instead of null to respect Prisma's input types
          default_view: input.default_view ?? undefined,
        },
        update: {
          ...(input.persona !== undefined && { persona: input.persona }),
          ...(input.default_view !== undefined && { default_view: input.default_view }),
        },
      })

      return {
        persona: preferences.persona,
        default_view: preferences.default_view as Record<string, string> | null,
        updated_at: preferences.updated_at,
      }
    }),

  /**
   * Set just the persona (convenience method)
   */
  setPersona: os
    .$context<Ctx>()
    .input(
      z.object({
        persona: personaSchema,
      }),
    )
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: context.headers })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const preferences = await prisma.user_preferences.upsert({
        where: { user_id: session.user.id },
        create: {
          user_id: session.user.id,
          persona: input.persona,
        },
        update: {
          persona: input.persona,
        },
      })

      return {
        persona: preferences.persona,
        updated_at: preferences.updated_at,
      }
    }),

  /**
   * Delete user preferences (reset to defaults)
   */
  reset: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await auth.api.getSession({ headers: context.headers })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      await prisma.user_preferences.deleteMany({
        where: { user_id: session.user.id },
      })

      return { ok: true }
    }),
}
