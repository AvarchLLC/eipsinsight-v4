import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum Coordination PR Board on EIPsInsight';

export default function Image() {
  const rows = [
    'Interactive dashboard for managing, sorting, and analyzing open PRs.',
    'Assess reviewer queues, response speeds, and active agenda proposals.',
  ];

  const chips = [
    'EIP Board Tool',
    'Reviewer queues',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'BOARD',
      meta: 'eipsinsight.com/board',
      title: 'Ethereum Coordination PR Board',
      rows,
      chips,
    }),
    size
  );
}
