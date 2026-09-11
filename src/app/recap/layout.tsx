import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Weekly Standards Recap & Audit Feed',
  description:
    'A transparent, verifiable audit log tracking all new EIP/ERC/RIP proposals, status transitions, merged PRs, devnets, and core dev call decisions across Ethereum standards.',
  path: '/recap',
  image: null,
});

export default function RecapLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
