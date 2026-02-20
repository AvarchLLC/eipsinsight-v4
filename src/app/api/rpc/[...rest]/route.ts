import { RPCHandler } from '@orpc/server/fetch'
import { router } from '@/server/orpc/router'
import { headers } from 'next/headers'

const handler = new RPCHandler(router)

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: Object.fromEntries((await headers()).entries()),
    },
  })
  return response ?? new Response('Not found', { status: 404 })
}

export const GET = handleRequest
export const POST = handleRequest