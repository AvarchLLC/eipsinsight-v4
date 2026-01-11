import 'server-only'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import { headers } from 'next/headers'
import { router } from '@/server/orpc/router'

;(globalThis as { $client?: RouterClient<typeof router> }).$client = createRouterClient(router, {
  context: async () => ({
    headers: Object.fromEntries((await headers()).entries()),
  }),
}) as RouterClient<typeof router>
