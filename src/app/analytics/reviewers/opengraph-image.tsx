import { ImageResponse } from 'next/og';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';
import { CANONICAL_EIP_REVIEWERS } from '@/data/eip-contributor-roles';

/**
 * Social card for /analytics/reviewers. Shared links can't attach an image —
 * the preview a post shows comes from this OG route, which each platform fetches
 * itself. Uses the shared ogCard template so the number tells a story on its own.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIP Reviewer Analytics on EIPsInsight';

export default function Image() {
  const count = CANONICAL_EIP_REVIEWERS.length;

  return new ImageResponse(
    ogCard({
      badge: 'ANALYTICS',
      meta: 'eipsinsight.com/analytics/reviewers',
      title: `Who keeps the EIP pipeline moving`,
      rows: [
        `The ${count} official EIP, ERC and RIP reviewers, ranked by review volume and turnaround time.`,
        'Leaderboard, monthly trends, review cycles per PR, and per-repository activity.',
      ],
      chips: ['Reviewer leaderboard', 'Response times', 'Review cycles', 'Live data'],
    }),
    size,
  );
}
