import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Upgrade EIP Directory, tracked live on EIPsInsight';

export default function Image() {
  const rows = [
    'Search and filter EIPs, ERCs, and RIPs across all network upgrades.',
    'View client priorities, status checkpoints, and inclusion tracks.',
  ];

  const chips = [
    'EIP Directory',
    'Inclusion stages',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'DIRECTORY',
      meta: 'eipsinsight.com/upgrade/eips',
      title: 'Upgrade EIP Directory',
      rows,
      chips,
    }),
    size
  );
}
