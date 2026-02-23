import { ReactNode } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import '@/lib/orpc.server.ts'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'API Tokens',
  description: 'Manage personal API tokens for EIPsInsight integrations.',
  path: '/api-tokens',
  noIndex: true,
})

export default async function ApiTokensLayout({ children }: { children: ReactNode }) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null
  try {
    session = await auth.api.getSession({
      headers: await headers()
    })
  } catch (error) {
    console.error('ApiTokensLayout session lookup failed:', error)
    redirect('/login')
  }

  if (!session?.user) {
    redirect('/login')
  }

  return <>{children}</>
}
