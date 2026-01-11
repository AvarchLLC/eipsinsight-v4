import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { router } from '@/server/orpc/router'

const link = new RPCLink({
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/rpc`,
  headers: async () => {
    if (typeof window !== 'undefined') {
      // Client-side: Add API token from localStorage or environment
      const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
      return apiToken ? { 'x-api-token': apiToken } : {};
    }
    const { headers } = await import('next/headers')
    const h = await headers()
    return Object.fromEntries(h.entries())
  },
})

// Fallback to client-side client if server-side client is not available.
export const client: RouterClient<typeof router> = (globalThis as unknown as { $client?: RouterClient<typeof router> }).$client ?? createORPCClient(link)
