import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Explore Ethereum Improvement Proposals on EIPsInsight';

export default function Image() {
  const rows = [
    'Explore EIP, ERC, and RIP trends by year, status, category, and layer.',
    'Follow execution versus consensus distributions and status lifecycles.',
  ];

  const chips = [
    'Proposal Explorer',
    'Status & Category breakdown',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'EXPLORE',
      meta: 'eipsinsight.com/explore',
      title: 'Explore Ethereum Proposals',
      rows,
      chips,
    }),
    size
  );
}
