import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum devnets progression, tracked live on EIPsInsight';

export default function Image() {
  const rows = [
    'Real-time tracking of Ethereum devnets and testnets specs.',
    'Follow client releases, genesis states, and devnet configurations.',
  ];

  const chips = [
    'Devnet Spec Tracker',
    'Pencast & Configs',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'DEVNETS',
      meta: 'eipsinsight.com/upgrade/devnets',
      title: 'Ethereum Devnet & Testnet Specs',
      rows,
      chips,
    }),
    size
  );
}
