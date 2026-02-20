import { os, ORPCError } from '@orpc/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'  // 👈 import your better-auth instance
import { headers as nextHeaders } from 'next/headers'
import { hashToken } from '@/lib/token-utils'

export type Ctx = {
  headers: Record<string, string>
  user?: {
    id: string
    role: string
  }
  apiToken?: {
    id: string
    scopes: string[]
  }
}

export async function checkAPIToken(headers: Record<string, string>) {
  const apiTokenValue = headers['x-api-token']
  if (!apiTokenValue) return null

  // Hash the incoming token
  const tokenHash = hashToken(apiTokenValue)

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: tokenHash },
    include: { user: true },
  })

  if (!token) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Invalid API token' })
  }

  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    throw new ORPCError('UNAUTHORIZED', { message: 'API token expired' })
  }

  await prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsed: new Date() },
  })

  return {
    user: {
      id: token.user.id,
      role: token.user.role,
    },
    apiToken: {
      id: token.id,
      scopes: token.scopes ?? [],
    },
  }
}

// 👇 New: check better-auth session
async function checkSession(headers: Record<string, string>) {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(headers),
    })

    if (!session?.user) return null

    return {
      id: session.user.id,
      role: (session.user as any).role ?? 'user',
    }
  } catch {
    return null
  }
}

export function requireScope(ctx: Ctx, requiredScope: string) {
  if (!ctx.apiToken) {
    throw new ORPCError('UNAUTHORIZED', { message: 'API token required' })
  }
  if (!ctx.apiToken.scopes.includes(requiredScope)) {
    throw new ORPCError('FORBIDDEN', {
      message: `Missing required scope: ${requiredScope}`,
    })
  }
}

export function requireAuth(ctx: Ctx) {
  if (!ctx.user && !ctx.apiToken) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
  }
}

export const publicProcedure = os.$context<Ctx>()

export const protectedProcedure = os
  .$context<Ctx>()
  .use(async ({ context, next }) => {
    // 1. Try API token first
    const tokenAuth = await checkAPIToken(context.headers)
    if (tokenAuth) {
      context.user = tokenAuth.user
      context.apiToken = tokenAuth.apiToken
    }

    // 2. Fall back to better-auth session 👇
    if (!context.user) {
      const sessionUser = await checkSession(context.headers)
      if (sessionUser) {
        context.user = sessionUser
      }
    }

    requireAuth(context)
    return next({ context })
  })

export { os, ORPCError }