import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum Improvement Proposals Analytics on EIPsInsight';

export default function Image() {
  const rows = [
    'Analyze contributor dynamics, editor response latency, and proposal velocities.',
    'Visualizing reviewer activity, repo-level commits, and standards backlogs.',
  ];

  const chips = [
    'Observability Analytics',
    'Editors & Reviewers',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'ANALYTICS',
      meta: 'eipsinsight.com/analytics',
      title: 'Ethereum Standards Observability',
      rows,
      chips,
    }),
    size
  );
}
