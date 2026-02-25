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

/** Check user's membership tier (returns 'free' for unauthenticated) */
async function getUserTier(userId?: string): Promise<string> {
  if (!userId) return 'free'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipTier: true, membershipExpiresAt: true },
  })

  if (!user) return 'free'

  // Check if subscription is expired
  const now = new Date()
  if (user.membershipExpiresAt && user.membershipExpiresAt < now) {
    return 'free'
  }

  return user.membershipTier || 'free'
}

/** Require minimum tier for feature access */
export async function requireTier(ctx: Ctx, minimumTier: 'pro' | 'enterprise') {
  const userId = ctx.user?.id
  if (!userId) {
    throw new ORPCError('FORBIDDEN', {
      message: 'This feature is only available for Pro and Enterprise members. Please upgrade your plan.',
    })
  }

  const tier = await getUserTier(userId)
  const tierHierarchy = { free: 0, pro: 1, enterprise: 2 }

  if ((tierHierarchy[tier as keyof typeof tierHierarchy] ?? 0) < (tierHierarchy[minimumTier])) {
    throw new ORPCError('FORBIDDEN', {
      message: `This feature requires ${minimumTier === 'enterprise' ? 'Enterprise' : 'Pro'} membership. Please upgrade your plan.`,
    })
  }
}

export const publicProcedure = os.$context<Ctx>()

/** Populates user/apiToken when available but does NOT require auth. Use for public read operations. */
export const optionalAuthProcedure = os
  .$context<Ctx>()
  .use(async ({ context, next }) => {
    // 1. Try API token first
    try {
      const tokenAuth = await checkAPIToken(context.headers)
      if (tokenAuth) {
        context.user = tokenAuth.user
        context.apiToken = tokenAuth.apiToken
      }
    } catch {
      // Invalid/expired token — leave context unauthenticated
    }

    // 2. Fall back to better-auth session
    if (!context.user) {
      const sessionUser = await checkSession(context.headers)
      if (sessionUser) {
        context.user = sessionUser
      }
    }

    return next({ context })
  })

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