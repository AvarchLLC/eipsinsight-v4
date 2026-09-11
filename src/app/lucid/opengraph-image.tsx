import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Lucid - Encrypted Mempool Tracker on EIPsInsight';

export default function Image() {
  const rows = [
    'A dedicated tracker for EIP-8184 (Lucid), Ethereum\'s encrypted mempool effort.',
    'Browse working-group meeting summaries, key decisions, and research links.',
  ];

  const chips = [
    'Encrypted Mempool',
    'EIP-8184 Tracker',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'LUCID',
      meta: 'eipsinsight.com/lucid',
      title: 'Lucid - Encrypted Mempool Tracker',
      rows,
      chips,
    }),
    size
  );
}
