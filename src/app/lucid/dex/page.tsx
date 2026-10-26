import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { DexImpactView } from '@/components/lucid/dex-impact';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'DEX Impact — Sandwich MEV',
  description:
    'Which sandwich bots extract the most, and which DEX pools they target on Ethereum — the MEV surface Lucid (EIP-8184) removes by encrypting the mempool. Live from BlobLens.',
  path: '/lucid/dex',
  keywords: ['sandwich MEV', 'DEX MEV', 'MEV bots', 'Lucid', 'EIP-8184', 'encrypted mempool'],
  image: null,
});

export default function LucidDexPage() {
  return <DexImpactView />;
}
