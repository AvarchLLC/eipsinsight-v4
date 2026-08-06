import { ImageResponse } from 'next/og';
import { getCachedDevnet } from '@/lib/upgrade-data.server';
import { ogCard, ogFallback, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-card';

export const runtime = 'nodejs';
export const revalidate = 300;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Ethereum devnet details, tracked live on EIPsInsight';

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  const devnet = await getCachedDevnet(id);

  if (!devnet) return new ImageResponse(ogFallback(id), size);

  const title = devnet.title || devnet.id;
  const eipList = devnet.eips?.length
    ? `EIP scope: ${devnet.eips.map((e) => `EIP-${e.number}`).join(', ')}`.slice(0, 110)
    : 'No EIP scope specified yet.';

  const rows = [
    `Specs and inclusion tracking details for the ${id} devnet.`,
    eipList,
  ];

  const chips = [
    devnet.active ? 'Active Devnet' : devnet.canceled ? 'Canceled' : 'Closed Devnet',
    `${devnet.eips?.length || 0} EIPs scoped`,
    'Devnet Detail',
  ];

  return new ImageResponse(
    ogCard({
      badge: 'DEVNET',
      meta: `eipsinsight.com/upgrade/devnets/${id}`,
      title,
      rows,
      chips,
    }),
    size
  );
}
