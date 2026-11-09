import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIP Author Analytics on EIPsInsight';

export default function Image() {
  return new ImageResponse(
    ogCard({
      badge: 'ANALYTICS',
      meta: 'eipsinsight.com/analytics/authors',
      title: 'Who writes Ethereum’s standards',
      rows: [
        'The authors behind every EIP, ERC and RIP, ranked by proposals and acceptance.',
        'Leaderboard, output over time, and the status of each author’s proposals.',
      ],
      chips: ['Author leaderboard', 'Proposals authored', 'Status mix', 'Live data'],
    }),
    size,
  );
}
