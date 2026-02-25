import { os, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { generateToken, hashToken, maskToken, getTokenAge } from '@/lib/token-utils'
import { API_SCOPES, type ApiScope } from '@/lib/apiScopes'
import * as z from 'zod'

export const accountProcedures = {
  getMe: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true, role: true },
      })
      if (!user) throw new ORPCError('UNAUTHORIZED')
      return user
    }),
  update: os
    .$context<Ctx>()
    .input(
      z.object({
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name: input.name ?? undefined,
          image: input.image ?? undefined,
        },
      })
      return { ok: true }
    }),
  uploadAvatar: os
    .$context<Ctx>()
    .input(z.object({ fileName: z.string(), base64Data: z.string() }))
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      // Decode base64 to blob
      const buffer = Buffer.from(input.base64Data, 'base64')
      const blob = new Blob([buffer], { type: 'image/jpeg' })

      const { url } = await uploadImageToCloudinary(blob, input.fileName)

      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: url, avatarUrl: url },
      })

      return { url }
    }),
  listTokens: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const tokens = await prisma.apiToken.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          scopes: true,
          lastUsed: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return tokens.map((token) => ({
        ...token,
        masked: '••••••••' + (token.id.slice(-8) || '••••••••'),
      }))
    }),
  createToken: os
    .$context<Ctx>()
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.enum(Object.values(API_SCOPES) as [ApiScope, ...ApiScope[]])).min(1),
        expiryDays: z.number().int().min(7).max(365).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      // Check membership tier - only paid users can create API tokens
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { membershipTier: true },
      })

      if (!user?.membershipTier || user.membershipTier === 'free') {
        throw new ORPCError('FORBIDDEN', {
          message: 'API tokens are only available for Pro and Enterprise members. Please upgrade your plan.',
        })
      }

      // Generate secure token
      const plainToken = generateToken()
      const tokenHash = hashToken(plainToken)

      // Calculate expiration date
      const expiryDays = input.expiryDays || 90 // Default 90 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiryDays)

      // Create token in database
      const token = await prisma.apiToken.create({
        data: {
          userId: session.user.id,
          name: input.name,
          tokenHash: tokenHash,
          scopes: input.scopes,
          expiresAt: expiresAt,
        },
      })

      return {
        id: token.id,
        name: token.name,
        plainToken: plainToken, // Only return this once at creation
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        scopes: token.scopes,
      }
    }),
  revokeToken: os
    .$context<Ctx>()
    .input(z.object({ tokenId: z.string().cuid() }))
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const token = await prisma.apiToken.findUnique({
        where: { id: input.tokenId },
      })

      if (!token) {
        throw new ORPCError('NOT_FOUND', { message: 'Token not found' })
      }

      if (token.userId !== session.user.id) {
        throw new ORPCError('FORBIDDEN', { message: 'Cannot revoke token of another user' })
      }

      await prisma.apiToken.delete({
        where: { id: input.tokenId },
      })

      return { ok: true }
    }),
  getTokenStats: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await auth.api.getSession({ headers: new Headers(context.headers) })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED')
      }

      const tokens = await prisma.apiToken.findMany({
        where: { userId: session.user.id },
      })

      const active = tokens.filter((t) => !t.expiresAt || t.expiresAt > new Date()).length
      const lastUsed = tokens
        .filter((t) => t.lastUsed)
        .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))[0]

      return {
        total: tokens.length,
        active: active,
        lastUsed: lastUsed?.lastUsed || null,
      }
    }),
}

