import { ImageResponse } from 'next/og';
import { getInProgressUpgrades } from '@/data/upgrade-registry';
import { TOTAL_NETWORK_UPGRADES, TOTAL_EIPS_DEPLOYED } from '@/data/upgrade-timeline-stats';
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/**
 * Social card for the /upgrade hub. Reads only static timeline data + the
 * registry (no DB round-trip), so it renders fast on every crawl and always
 * matches the counts shown on the page.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum upgrades, tracked live on EIPsInsight';

export default function Image() {
  const building = getInProgressUpgrades()
    .map((entry) => entry.name)
    .slice(0, 3)
    .join(', ');

  const rows = [
    "What's shipping in each fork, parsed automatically from meta-EIP commits.",
    building ? `Now building: ${building}` : '',
  ].filter(Boolean);

  const chips = [
    `${TOTAL_NETWORK_UPGRADES} network upgrades`,
    `${TOTAL_EIPS_DEPLOYED} EIPs deployed`,
    'Live tracker',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'UPGRADES',
      meta: 'eipsinsight.com/upgrade',
      title: 'Ethereum upgrades, tracked live',
      rows,
      chips,
    }),
    size
  );
}
