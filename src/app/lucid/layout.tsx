import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Lucid — Encrypted Mempool',
  description:
    'A dedicated tracker for Lucid (EIP-8184), Ethereum\'s encrypted mempool effort — working-group meeting summaries, key decisions, and research links, built with encryptedmempool.org.',
  path: '/lucid',
  keywords: ['Lucid', 'encrypted mempool', 'EIP-8184', 'Encrypt the Mempool', 'MEV', 'Ethereum'],
  image: null,
});

export default function LucidLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
