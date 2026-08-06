import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum Upgrade Schedule, tracked live on EIPsInsight';

export default function Image() {
  const rows = [
    'Upgrade milestones, schedule timelines, and calendar previews.',
    'Track execution forks, devnet launch windows, and activation dates.',
  ];

  const chips = [
    'Upgrade Schedule',
    'Forks & Milestones',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'SCHEDULE',
      meta: 'eipsinsight.com/upgrade/schedule',
      title: 'Ethereum Upgrade Schedule',
      rows,
      chips,
    }),
    size
  );
}
