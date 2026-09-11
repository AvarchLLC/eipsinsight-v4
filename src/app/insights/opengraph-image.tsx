import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum Standards Insights and Commentary on EIPsInsight';

export default function Image() {
  const rows = [
    'Forensic analysis of EIP changes, status transitions, and governance events.',
    'Read editorial guides, monthly roundups, and standard lifecycle coordination.',
  ];

  const chips = [
    'Insights & Commentary',
    'Monthly Forensics',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'INSIGHTS',
      meta: 'eipsinsight.com/insights',
      title: 'Ethereum Standards Insights',
      rows,
      chips,
    }),
    size
  );
}
