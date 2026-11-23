import { RPCHandler } from '@orpc/server/fetch'
import { router } from '@/server/orpc/router'
import { headers } from 'next/headers'

const handler = new RPCHandler(router)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-token',
}

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: Object.fromEntries((await headers()).entries()),
    },
  })
  if (!response) return new Response('Not found', { status: 404, headers: CORS_HEADERS })
  
  const resHeaders = new Headers(response.headers)
  resHeaders.set('Access-Control-Allow-Origin', '*')
  resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-token')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders,
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export const GET = handleRequest
export const POST = handleRequest