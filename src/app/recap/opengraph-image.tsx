import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Verifiable Weekly Standards Recap and Audit Feed on EIPsInsight';

export default function Image() {
  const rows = [
    'Real-time, verifiable audit log tracking all proposal lifecycle activities.',
    'Track status updates, merged PRs, devnets, and ACD call highlights.',
  ];

  const chips = [
    'Verifiable Audit Feed',
    'Weekly recap',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'RECAP',
      meta: 'eipsinsight.com/recap',
      title: 'Weekly Standards Recap Feed',
      rows,
      chips,
    }),
    size
  );
}
