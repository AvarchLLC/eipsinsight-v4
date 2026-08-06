import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum Improvement Proposals Resources on EIPsInsight';

export default function Image() {
  const rows = [
    'Access blogs, ecosystems guide sheets, videos, podcasts, and documentation.',
    'Frequently asked questions and coordinate pipelines for EIP authors.',
  ];

  const chips = [
    'Ecosystem Resources',
    'Author Guides & FAQs',
    'EIPsInsight',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'RESOURCES',
      meta: 'eipsinsight.com/resources',
      title: 'Ethereum Standards Resources',
      rows,
      chips,
    }),
    size
  );
}
