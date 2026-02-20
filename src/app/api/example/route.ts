import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enforceRateLimit, buildRateLimitHeaders } from '@/lib/rate-limit'
import { logApiUsage } from '@/lib/api-usage'
import { resolveApiToken } from '@/lib/api-token'

/**
 * Example protected REST API endpoint with rate limiting and usage logging.
 * 
 * Usage:
 * curl -H "Authorization: Bearer <session_token>" https://example.com/api/example
 * curl -H "X-API-Token: eips_..." https://example.com/api/example
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate request
    const headers = Object.fromEntries(request.headers)
    let userId: string | null = null
    let apiTokenId: string | null = null

    // Try API token first
    let apiToken = null
    try {
      apiToken = await resolveApiToken(headers)
      if (apiToken) {
        userId = apiToken.userId
        apiTokenId = apiToken.apiTokenId
      }
    } catch {
      // Token validation failed
    }

    // Fall back to session
    if (!userId) {
      try {
        const session = await auth.api.getSession({ headers: new Headers(headers) })
        if (session?.user) {
          userId = (session.user as any).id
        }
      } catch {
        // Not authenticated
      }
    }

    // Require authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Enforce rate limiting
    const rateLimitResult = await enforceRateLimit({
      userId,
      apiTokenId,
    })

    const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult)

    if (!rateLimitResult.allowed) {
      // Log the failure
      logApiUsage({
        userId,
        apiTokenId,
        endpoint: '/api/example',
        method: 'GET',
        statusCode: 429,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      }).catch(console.error)

      return NextResponse.json(
        {
          error: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded',
          metadata: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
          },
        },
        {
          status: 429,
          headers: new Headers(rateLimitHeaders),
        }
      )
    }

    // 3. Process the request
    const data = {
      message: 'Hello from protected API',
      userId,
      timestamp: new Date().toISOString(),
    }

    // Log successful request (fire-and-forget)
    logApiUsage({
      userId,
      apiTokenId,
      endpoint: '/api/example',
      method: 'GET',
      statusCode: 200,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    }).catch(console.error)

    // 4. Return response with rate limit headers
    const response = NextResponse.json(data, { status: 200 })
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Same logic as GET, but for POST requests
  return GET(request)
}
