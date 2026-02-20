import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { router } from '@/server/orpc/router'

const link = new RPCLink({
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/rpc`,
  // 👇 Add credentials to send cookies with every request
  fetch: (url, options) => fetch(url, { 
    ...options, 
    credentials: 'include' // ← this sends session cookies
  }),
  headers: async () => {
    if (typeof window !== 'undefined') {
      // Client-side: optionally add API token if available
      const apiToken = process.env.NEXT_PUBLIC_API_TOKEN
      return apiToken ? { 'x-api-token': apiToken } : {}
    }
    // Server-side: forward all headers including cookies
    const { headers } = await import('next/headers')
    const h = await headers()
    return Object.fromEntries(h.entries())
  },
})

export const client: RouterClient<typeof router> = 
  (globalThis as unknown as { $client?: RouterClient<typeof router> }).$client ?? 
  createORPCClient(link)