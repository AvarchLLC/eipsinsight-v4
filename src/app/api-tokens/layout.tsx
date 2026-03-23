import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata: Metadata = buildMetadata({
  title: 'API Access Waitlist',
  description: 'Join the waitlist for upcoming API token access.',
  path: '/api-tokens',
  noIndex: false,
})

export default async function ApiTokensLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
