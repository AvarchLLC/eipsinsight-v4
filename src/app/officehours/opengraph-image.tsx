import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIP Editing Office Hours Dashboard on EIPsInsight';

export default function Image() {
  const rows = [
    'Editorial-activity dashboard for EIP Editing Office Hours.',
    'Browse editor leaderboard, status changes, and proposals worked on.',
  ];

  const chips = [
    'EIP Editing',
    'Editor Leaderboard',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'OFFICE HOURS',
      meta: 'eipsinsight.com/officehours',
      title: 'EIP Editing Office Hours',
      rows,
      chips,
    }),
    size
  );
}
