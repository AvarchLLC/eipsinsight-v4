import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';
import { CANONICAL_EIP_EDITORS } from '@/data/eip-contributor-roles';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIP Editor Analytics on EIPsInsight';

export default function Image() {
  const count = CANONICAL_EIP_EDITORS.length;
  return new ImageResponse(
    ogCard({
      badge: 'ANALYTICS',
      meta: 'eipsinsight.com/analytics/editors',
      title: 'The editors shaping Ethereum standards',
      rows: [
        `The ${count} official EIP editors ranked by merges, reviews, and response times across EIP, ERC and RIP repos.`,
        'Leaderboard, monthly activity, review cycles, and per-repository coverage.',
      ],
      chips: ['Editor leaderboard', 'Merges & reviews', 'Response times', 'Live data'],
    }),
    size,
  );
}
