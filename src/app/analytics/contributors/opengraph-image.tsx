import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIP Contributor Analytics on EIPsInsight';

export default function Image() {
  return new ImageResponse(
    ogCard({
      badge: 'ANALYTICS',
      meta: 'eipsinsight.com/analytics/contributors',
      title: 'Everyone moving Ethereum standards forward',
      rows: [
        'Contributor activity across the EIP, ERC and RIP repositories: commits, PRs, and issues.',
        'Activity by type, repository heatmap, and who’s most active right now.',
      ],
      chips: ['Contributor activity', 'By type', 'Repo heatmap', 'Live data'],
    }),
    size,
  );
}
