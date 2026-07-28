import { ImageResponse } from 'next/og';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';
import { ogCard, ogFallback, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

/**
 * Per-upgrade social card (Pectra, Fusaka, Glamsterdam, …). Reads the static
 * registry (name, status, tagline, headliners) so no DB round-trip is needed.
 */

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'EIPsInsight network upgrade';

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const entry = getUpgradeRegistryEntry(slug);

  if (!entry) return new ImageResponse(ogFallback(slug), size);

  const headliners = entry.headliners?.length
    ? [`Headliners: ${entry.headliners.map((h) => `EIP-${h.eip}`).join(', ')}`.slice(0, 110)]
    : [];
  const rows = [entry.statusNote ?? entry.tagline, ...headliners]
    .filter(Boolean)
    .map((r) => String(r).replace(/\s+/g, ' ').trim().slice(0, 110))
    .slice(0, 2);

  const chips = [
    entry.status,
    entry.activationDate ? `Activated ${entry.activationDate}` : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    ogCard({
      badge: 'UPGRADE',
      meta: entry.status,
      title: entry.name,
      rows,
      chips,
    }),
    size
  );
}
