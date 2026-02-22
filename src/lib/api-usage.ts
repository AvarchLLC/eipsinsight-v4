import { prisma } from '@/lib/prisma'
// Note: Run 'npx prisma generate' if you see apiUsage errors

export interface LogApiUsageParams {
  userId: string
  apiTokenId?: string | null
  endpoint: string
  method: string
  statusCode: number
  userAgent?: string | null
  ipAddress?: string | null
}

/**
 * Log API usage for rate limit tracking and auditing.
 * Runs async in background (non-blocking).
 */
export async function logApiUsage(params: LogApiUsageParams) {
  try {
    await prisma.apiUsage.create({
      data: {
        userId: params.userId,
        apiTokenId: params.apiTokenId ?? undefined,
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode,
        userAgent: params.userAgent ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
      },
    })
  } catch (error) {
    console.error('Failed to log API usage:', error)
    // Don't throw; logging errors shouldn't block requests
  }
}

/**
 * Get API usage stats for a user.
 */
export async function getUserUsageStats(userId: string, hoursBack: number = 3) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  const [totalRequests, byEndpoint, byStatusCode] = await Promise.all([
    prisma.apiUsage.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    }),
    prisma.apiUsage.groupBy({
      by: ['endpoint'],
      where: {
        userId,
        createdAt: { gte: since },
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    }),
    prisma.apiUsage.groupBy({
      by: ['statusCode'],
      where: {
        userId,
        createdAt: { gte: since },
      },
      _count: true,
    }),
  ])

  return {
    totalRequests,
    byEndpoint,
    byStatusCode,
    window: `${hoursBack}h`,
  }
}

/**
 * Get API usage stats for a token.
 */
export async function getTokenUsageStats(apiTokenId: string, hoursBack: number = 3) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  const [totalRequests, byEndpoint, byStatusCode] = await Promise.all([
    prisma.apiUsage.count({
      where: {
        apiTokenId,
        createdAt: { gte: since },
      },
    }),
    prisma.apiUsage.groupBy({
      by: ['endpoint'],
      where: {
        apiTokenId,
        createdAt: { gte: since },
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    }),
    prisma.apiUsage.groupBy({
      by: ['statusCode'],
      where: {
        apiTokenId,
        createdAt: { gte: since },
      },
      _count: true,
    }),
  ])

  return {
    totalRequests,
    byEndpoint,
    byStatusCode,
    window: `${hoursBack}h`,
  }
}
