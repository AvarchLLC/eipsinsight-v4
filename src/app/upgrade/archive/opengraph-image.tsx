import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum upgrade archive, tracked live on EIPsInsight';

export default function Image() {
  const rows = [
    'A complete historical directory of all shipped Ethereum upgrades.',
    'Browse genesis specs, devnets, client priorities, and active EIPs.',
  ];

  const chips = [
    'Upgrade Archive',
    'Historical reference',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'ARCHIVE',
      meta: 'eipsinsight.com/upgrade/archive',
      title: 'Ethereum Upgrade Archive',
      rows,
      chips,
    }),
    size
  );
}
